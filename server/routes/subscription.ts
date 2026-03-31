import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool, JWT_SECRET } from "../db";

const router = Router();

function requireAuth(req: any, res: Response, next: any) {
  const auth = (req as Request).headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

router.post("/verify", requireAuth, async (req: any, res: Response) => {
  const { receipt } = req.body;
  if (!receipt) return res.status(400).json({ error: "receipt required" });

  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) {
    return res.status(500).json({ error: "APPLE_SHARED_SECRET not configured" });
  }

  try {
    const payload = { "receipt-data": receipt, password: sharedSecret };

    let data: any;
    const prodRes = await fetch("https://buy.itunes.apple.com/verifyReceipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    data = await prodRes.json();

    // 21007 = sandbox receipt sent to production → retry sandbox
    if (data.status === 21007) {
      const sandboxRes = await fetch("https://sandbox.itunes.apple.com/verifyReceipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await sandboxRes.json();
    }

    if (data.status !== 0) {
      return res.status(400).json({ error: `Apple verify failed: status=${data.status}` });
    }

    // Extract latest transaction info for expiry + linking future notifications
    const latestInfo = data.latest_receipt_info?.[data.latest_receipt_info.length - 1];
    const originalTxId: string | undefined = latestInfo?.original_transaction_id;
    const expiresMs = latestInfo?.expires_date_ms ? parseInt(latestInfo.expires_date_ms) : null;
    const expiresAt = expiresMs ? new Date(expiresMs) : null;

    await pool.query(
      `UPDATE users SET is_premium = TRUE, premium_expires_at = $1, original_transaction_id = COALESCE($2, original_transaction_id) WHERE id = $3`,
      [expiresAt, originalTxId ?? null, req.userId]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
