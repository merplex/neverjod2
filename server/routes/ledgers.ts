import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool, JWT_SECRET } from "../db";

const router = Router();

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

// GET /api/ledgers — list user's ledgers
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  try {
    const result = await pool.query(
      "SELECT id, name, created_at FROM ledgers WHERE user_id = $1 ORDER BY created_at ASC",
      [userId]
    );
    res.json({ ledgers: result.rows });
  } catch (err) {
    console.error("ledgers/list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/ledgers — create new ledger (premium only)
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name required" });

  try {
    // Check premium
    const userRow = await pool.query("SELECT is_premium FROM users WHERE id = $1", [userId]);
    if (!userRow.rows[0]?.is_premium) {
      return res.status(403).json({ error: "Premium required" });
    }

    const id = `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      "INSERT INTO ledgers (id, user_id, name) VALUES ($1, $2, $3)",
      [id, userId, name.trim()]
    );
    res.json({ id, name: name.trim() });
  } catch (err) {
    console.error("ledgers/create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/ledgers/:id — rename ledger
router.patch("/:id", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name required" });
  if (id === "main") return res.status(400).json({ error: "Cannot rename main ledger" });

  try {
    await pool.query(
      "UPDATE ledgers SET name = $1 WHERE id = $2 AND user_id = $3",
      [name.trim(), id, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("ledgers/rename error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
