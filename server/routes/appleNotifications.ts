import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

// Apple Server-to-Server Notifications v2
// Sent when subscription renews, expires, cancels, etc.
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Apple sends a signed payload (signedPayload) — decode without full JWT verification
    // for now (full verification requires Apple root cert)
    const signedPayload = body.signedPayload;
    if (!signedPayload) return res.status(400).json({ error: "missing signedPayload" });

    // JWT is 3 base64url parts — decode the payload (middle part)
    const parts = signedPayload.split(".");
    if (parts.length !== 3) return res.status(400).json({ error: "invalid payload" });

    const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const notificationType: string = decoded.notificationType;
    const subtype: string = decoded.subtype || "";

    // Decode the transactionInfo inside data
    const data = decoded.data;
    if (!data?.signedTransactionInfo) return res.status(200).json({ ok: true }); // ignore non-transaction events

    const txParts = data.signedTransactionInfo.split(".");
    const txDecoded = JSON.parse(Buffer.from(txParts[1], "base64url").toString("utf8"));

    const originalTransactionId: string = txDecoded.originalTransactionId;
    const expiresMs: number | undefined = txDecoded.expiresDate;
    const expiresAt = expiresMs ? new Date(expiresMs) : null;

    console.log("[apple-notify]", notificationType, subtype, originalTransactionId, expiresAt);

    // Events where subscription is still active
    const activeEvents = ["SUBSCRIBED", "DID_RENEW", "DID_RECOVER", "RESUBSCRIBE"];
    // Events where subscription ended
    const expiredEvents = ["EXPIRED", "REVOKED"];

    if (activeEvents.includes(notificationType)) {
      await pool.query(
        `UPDATE users SET is_premium = TRUE, premium_expires_at = $1 WHERE original_transaction_id = $2`,
        [expiresAt, originalTransactionId]
      );
    } else if (expiredEvents.includes(notificationType)) {
      await pool.query(
        `UPDATE users SET is_premium = FALSE, premium_expires_at = $1 WHERE original_transaction_id = $2`,
        [expiresAt, originalTransactionId]
      );
    }
    // DID_FAIL_TO_RENEW, GRACE_PERIOD_EXPIRED etc. — leave premium as-is until truly expired

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[apple-notify] error:", err.message);
    res.status(200).json({ ok: true }); // always 200 to Apple
  }
});

export default router;
