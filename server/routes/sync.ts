import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

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

// --- POST /api/sync/push ---
// Client sends local data; server upserts with last-write-wins
router.post("/push", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { categories = [], accounts = [], transactions = [] } = req.body;

  try {
    // Categories
    for (const cat of categories) {
      await pool.query(
        `INSERT INTO sync_categories (id, user_id, name, type, icon, updated_at, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id, user_id) DO UPDATE
           SET name = EXCLUDED.name, type = EXCLUDED.type, icon = EXCLUDED.icon,
               updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
           WHERE sync_categories.updated_at < EXCLUDED.updated_at`,
        [cat.id, userId, cat.name, cat.type, cat.icon || null,
         cat.updated_at, cat.deleted_at || null]
      );
    }

    // Accounts
    for (const acc of accounts) {
      await pool.query(
        `INSERT INTO sync_accounts (id, user_id, name, type, start_balance, icon, updated_at, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id, user_id) DO UPDATE
           SET name = EXCLUDED.name, type = EXCLUDED.type, start_balance = EXCLUDED.start_balance,
               icon = EXCLUDED.icon, updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at
           WHERE sync_accounts.updated_at < EXCLUDED.updated_at`,
        [acc.id, userId, acc.name, acc.type || null, acc.startBalance || 0,
         acc.icon || null, acc.updated_at, acc.deleted_at || null]
      );
    }

    // Transactions — fingerprint dedup for new records
    for (const tx of transactions) {
      // Check fingerprint first (prevents duplicates from multiple devices)
      if (tx.fingerprint) {
        const existing = await pool.query(
          "SELECT id FROM sync_transactions WHERE fingerprint = $1 AND user_id = $2",
          [tx.fingerprint, userId]
        );
        if (existing.rows.length > 0 && existing.rows[0].id !== tx.id) {
          // Duplicate fingerprint with different ID — skip
          continue;
        }
      }

      await pool.query(
        `INSERT INTO sync_transactions
           (id, user_id, category_id, account_id, amount, type, description, date, time, fingerprint, updated_at, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id, user_id) DO UPDATE
           SET category_id = EXCLUDED.category_id, account_id = EXCLUDED.account_id,
               amount = EXCLUDED.amount, type = EXCLUDED.type, description = EXCLUDED.description,
               date = EXCLUDED.date, time = EXCLUDED.time, updated_at = EXCLUDED.updated_at,
               deleted_at = EXCLUDED.deleted_at
           WHERE sync_transactions.updated_at < EXCLUDED.updated_at`,
        [tx.id, userId, tx.categoryId || null, tx.accountId || null,
         tx.amount, tx.type, tx.description || null,
         tx.date, tx.time || null, tx.fingerprint || null,
         tx.updated_at, tx.deleted_at || null]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("sync/push error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- POST /api/sync/pull ---
// Client sends last_sync_at; server returns everything newer
router.post("/pull", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { last_sync_at } = req.body;
  const since = last_sync_at ? new Date(last_sync_at) : new Date(0);

  try {
    const [cats, accs, txns] = await Promise.all([
      pool.query(
        "SELECT * FROM sync_categories WHERE user_id = $1 AND updated_at > $2",
        [userId, since]
      ),
      pool.query(
        "SELECT * FROM sync_accounts WHERE user_id = $1 AND updated_at > $2",
        [userId, since]
      ),
      pool.query(
        "SELECT * FROM sync_transactions WHERE user_id = $1 AND updated_at > $2",
        [userId, since]
      ),
    ]);

    res.json({
      categories: cats.rows,
      accounts: accs.rows,
      transactions: txns.rows,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("sync/pull error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
