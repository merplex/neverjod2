import { Router, Request, Response } from "express";
import { pool } from "../db";
import { authMiddleware, premiumMiddleware } from "./sync";

// Device backups uploaded as whole sets (see client/utils/deviceBackup.ts). Cloud features are
// premium, same as sync.
const router = Router();
const MAX_PER_USER = 3;

// POST /api/backups — upload (re-upload of the same id replaces it; the phone verifies by GET)
router.post("/", authMiddleware, premiumMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id, created_at, device = null, data, checksum = null, counts = null } = req.body || {};
  if (!id || !created_at || !data || typeof data !== "object") return res.status(400).json({ error: "Bad request" });
  const ledgerIds = Array.from(new Set(Object.keys(data).map((k) => (k.includes("__") ? k.split("__")[1] : "main"))));
  try {
    await pool.query(
      `INSERT INTO device_backups (id, user_id, created_at, device, ledger_ids, data, checksum, counts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id, user_id) DO UPDATE
         SET data = EXCLUDED.data, checksum = EXCLUDED.checksum, counts = EXCLUDED.counts,
             ledger_ids = EXCLUDED.ledger_ids, uploaded_at = NOW()`,
      [String(id), userId, created_at, device ? String(device).slice(0, 200) : null, ledgerIds, JSON.stringify(data),
       checksum ? String(checksum) : null, counts ? JSON.stringify(counts) : null]
    );
    // Keep the newest MAX_PER_USER only
    await pool.query(
      `DELETE FROM device_backups WHERE user_id = $1 AND id NOT IN (
         SELECT id FROM device_backups WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2)`,
      [userId, MAX_PER_USER]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("backups/post error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/backups — list (no data)
router.get("/", authMiddleware, premiumMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  try {
    const r = await pool.query(
      `SELECT id, created_at, uploaded_at, device, ledger_ids, checksum, counts, pg_column_size(data) AS size
       FROM device_backups WHERE user_id = $1 ORDER BY created_at`,
      [userId]
    );
    res.json({ backups: r.rows });
  } catch (err) {
    console.error("backups/list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/backups/:id — full set
router.get("/:id", authMiddleware, premiumMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  try {
    const r = await pool.query("SELECT * FROM device_backups WHERE user_id = $1 AND id = $2", [userId, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("backups/get error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/backups/:id
router.delete("/:id", authMiddleware, premiumMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  try {
    await pool.query("DELETE FROM device_backups WHERE user_id = $1 AND id = $2", [userId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("backups/delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
