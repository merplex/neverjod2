import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool, JWT_SECRET } from "../db";

const router = Router();

// --- Auth middleware ---
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// --- Premium guard ---
// Sync is a paid feature. Reject non-premium users at the API boundary so a
// stolen/forged client can't bypass the frontend lock by hitting the endpoint
// directly. Auto-expires stale subscriptions to stay consistent with /login.
async function premiumMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;
  try {
    const result = await pool.query(
      "SELECT is_premium, premium_expires_at FROM users WHERE id = $1",
      [userId]
    );
    if (!result.rows.length) return res.status(403).json({ error: "Premium required" });
    const user = result.rows[0];
    if (user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) < new Date()) {
      await pool.query("UPDATE users SET is_premium = FALSE WHERE id = $1", [userId]);
      user.is_premium = false;
    }
    if (!user.is_premium) return res.status(403).json({ error: "Premium required" });
    next();
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

// --- POST /api/sync/push ---
// Client sends local data; server upserts with last-write-wins
router.post("/push", authMiddleware, premiumMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { categories = [], accounts = [], transactions = [], repeatTransactions = [], ledger_id = "main" } = req.body;

  try {
    // Categories + Accounts in parallel
    await Promise.all([
      ...categories.map((cat: any) =>
        pool.query(
          `INSERT INTO sync_categories (id, user_id, name, type, icon, icon_id, keywords, sort_order, ledger_id, updated_at, deleted_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id, user_id) DO UPDATE
             SET name = EXCLUDED.name, type = EXCLUDED.type, icon = EXCLUDED.icon,
                 icon_id = EXCLUDED.icon_id, keywords = EXCLUDED.keywords,
                 sort_order = EXCLUDED.sort_order, ledger_id = EXCLUDED.ledger_id,
                 updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
             WHERE sync_categories.updated_at < EXCLUDED.updated_at`,
          [cat.id, userId, cat.name, cat.type, null, cat.iconId || null,
           JSON.stringify(cat.keywords || []), cat.sortOrder ?? null, ledger_id, cat.updated_at, cat.deleted_at || null]
        )
      ),
      ...accounts.map((acc: any) =>
        pool.query(
          `INSERT INTO sync_accounts (id, user_id, name, type, start_balance, icon, icon_id, keywords, sort_order, ledger_id, updated_at, deleted_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id, user_id) DO UPDATE
             SET name = EXCLUDED.name, type = EXCLUDED.type, start_balance = EXCLUDED.start_balance,
                 icon = EXCLUDED.icon, icon_id = EXCLUDED.icon_id, keywords = EXCLUDED.keywords,
                 sort_order = EXCLUDED.sort_order, ledger_id = EXCLUDED.ledger_id,
                 updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
             WHERE sync_accounts.updated_at < EXCLUDED.updated_at`,
          [acc.id, userId, acc.name, acc.type || null, acc.startBalance || acc.balance || 0,
           null, acc.iconId || null, JSON.stringify(acc.keywords || []), acc.sortOrder ?? null, ledger_id, acc.updated_at, acc.deleted_at || null]
        )
      ),
    ]);

    // Transactions: check fingerprints first (batch), then upsert (batch)
    const txnsWithFingerprint = transactions.filter((tx: any) => tx.fingerprint);
    const fingerprintResults = await Promise.all(
      txnsWithFingerprint.map((tx: any) =>
        pool.query("SELECT id FROM sync_transactions WHERE fingerprint = $1 AND user_id = $2 AND ledger_id = $3", [tx.fingerprint, userId, ledger_id])
      )
    );
    const dupIds = new Set(
      txnsWithFingerprint
        .filter((_: any, i: number) => fingerprintResults[i].rows.length > 0 && fingerprintResults[i].rows[0].id !== txnsWithFingerprint[i].id)
        .map((tx: any) => tx.id)
    );
    await Promise.all(
      transactions
        .filter((tx: any) => !dupIds.has(tx.id))
        .map((tx: any) =>
          pool.query(
            `INSERT INTO sync_transactions
               (id, user_id, category_id, account_id, amount, type, description, date, time, fingerprint, ledger_id, cross_ledger_ref, is_repeat, repeat_id, updated_at, deleted_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             ON CONFLICT (id, user_id) DO UPDATE
               SET category_id = EXCLUDED.category_id, account_id = EXCLUDED.account_id,
                   amount = EXCLUDED.amount, type = EXCLUDED.type, description = EXCLUDED.description,
                   date = EXCLUDED.date, time = EXCLUDED.time, ledger_id = EXCLUDED.ledger_id,
                   cross_ledger_ref = EXCLUDED.cross_ledger_ref,
                   is_repeat = EXCLUDED.is_repeat, repeat_id = EXCLUDED.repeat_id,
                   updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
               WHERE sync_transactions.updated_at < EXCLUDED.updated_at`,
            [tx.id, userId, tx.categoryId || null, tx.accountId || null,
             tx.amount, tx.type, tx.description || null,
             tx.date, tx.time || null, tx.fingerprint || null,
             ledger_id, tx.crossLedgerRef || null,
             tx.isRepeat || false, tx.repeatId || null,
             tx.updated_at, tx.deleted_at || null]
          )
        )
    );

    // Repeat transactions: upsert with last-write-wins
    await Promise.all(
      repeatTransactions.map((rt: any) =>
        pool.query(
          `INSERT INTO sync_repeat_transactions
             (id, user_id, category_id, account_id, category_name, account_name, amount, description,
              category_type, repeat_option, day_of_month, weekday, month_of_year, time,
              start_date, next_due, last_executed, ledger_id, updated_at, deleted_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
           ON CONFLICT (id, user_id) DO UPDATE
             SET category_id = EXCLUDED.category_id, account_id = EXCLUDED.account_id,
                 category_name = EXCLUDED.category_name, account_name = EXCLUDED.account_name,
                 amount = EXCLUDED.amount, description = EXCLUDED.description,
                 category_type = EXCLUDED.category_type, repeat_option = EXCLUDED.repeat_option,
                 day_of_month = EXCLUDED.day_of_month, weekday = EXCLUDED.weekday,
                 month_of_year = EXCLUDED.month_of_year, time = EXCLUDED.time,
                 start_date = EXCLUDED.start_date, next_due = EXCLUDED.next_due,
                 last_executed = EXCLUDED.last_executed, ledger_id = EXCLUDED.ledger_id,
                 updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
             WHERE sync_repeat_transactions.updated_at < EXCLUDED.updated_at`,
          [
            rt.id, userId, rt.categoryId || null, rt.accountId || null,
            rt.categoryName || null, rt.accountName || null,
            rt.amount, rt.description || null, rt.categoryType || null,
            rt.repeatOption, rt.dayOfMonth ?? null, rt.weekday ?? null,
            rt.monthOfYear ?? null, rt.time || null,
            rt.startDate || null, rt.nextDue, rt.lastExecuted || null,
            ledger_id, rt.updated_at, rt.deleted_at || null,
          ]
        )
      )
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("sync/push error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- POST /api/sync/pull ---
// Client sends last_sync_at; server returns everything newer
router.post("/pull", authMiddleware, premiumMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { last_sync_at, ledger_id = "main" } = req.body;
  const since = last_sync_at ? new Date(last_sync_at) : new Date(0);

  try {
    const [cats, accs, txns, repeats, userRow, lastPushRow] = await Promise.all([
      pool.query(
        "SELECT * FROM sync_categories WHERE user_id = $1 AND ledger_id = $2 AND updated_at > $3",
        [userId, ledger_id, since]
      ),
      pool.query(
        "SELECT * FROM sync_accounts WHERE user_id = $1 AND ledger_id = $2 AND updated_at > $3",
        [userId, ledger_id, since]
      ),
      pool.query(
        "SELECT * FROM sync_transactions WHERE user_id = $1 AND ledger_id = $2 AND updated_at > $3",
        [userId, ledger_id, since]
      ),
      pool.query(
        "SELECT * FROM sync_repeat_transactions WHERE user_id = $1 AND ledger_id = $2 AND updated_at > $3",
        [userId, ledger_id, since]
      ),
      pool.query("SELECT is_premium, plan_type, premium_expires_at, auto_renew FROM users WHERE id = $1", [userId]),
      pool.query(
        `SELECT MAX(updated_at) as last_push_at FROM (
          SELECT updated_at FROM sync_categories WHERE user_id = $1 AND ledger_id = $2
          UNION ALL
          SELECT updated_at FROM sync_accounts WHERE user_id = $1 AND ledger_id = $2
          UNION ALL
          SELECT updated_at FROM sync_transactions WHERE user_id = $1 AND ledger_id = $2
          UNION ALL
          SELECT updated_at FROM sync_repeat_transactions WHERE user_id = $1 AND ledger_id = $2
        ) t`,
        [userId, ledger_id]
      ),
    ]);

    res.json({
      categories: cats.rows,
      accounts: accs.rows,
      transactions: txns.rows,
      repeatTransactions: repeats.rows,
      isPremium: userRow.rows[0]?.is_premium ?? false,
      planType: userRow.rows[0]?.is_premium ? (userRow.rows[0]?.plan_type ?? null) : null,
      premiumExpiresAt: userRow.rows[0]?.is_premium ? (userRow.rows[0]?.premium_expires_at ?? null) : null,
      autoRenew: userRow.rows[0]?.is_premium ? (userRow.rows[0]?.auto_renew ?? true) : true,
      server_time: new Date().toISOString(),
      last_push_at: lastPushRow.rows[0]?.last_push_at ?? null,
    });
  } catch (err) {
    console.error("sync/pull error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
