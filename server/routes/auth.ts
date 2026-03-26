import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, JWT_SECRET } from "../db";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, is_premium",
      [email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email, isPremium: user.is_premium }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, email: user.email, isPremium: user.is_premium });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash, is_premium FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (!result.rows.length) return res.status(401).json({ error: "Invalid email or password" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign({ userId: user.id, email: user.email, isPremium: user.is_premium }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, email: user.email, isPremium: user.is_premium });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
