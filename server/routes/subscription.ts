import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { GoogleAuth } from "google-auth-library";
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

const ANDROID_PACKAGE_NAME = "com.neverjod.app";
const ACTIVE_GOOGLE_STATES = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"];
let googleAuthClient: GoogleAuth | null = null;

function getGoogleAuth(): GoogleAuth {
  if (!googleAuthClient) {
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!key) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    googleAuthClient = new GoogleAuth({
      credentials: JSON.parse(key),
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
  }
  return googleAuthClient;
}

async function verifyGooglePurchase(purchaseToken: string) {
  const client = await getGoogleAuth().getClient();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await client.request<any>({ url });
  const data = res.data;
  if (!ACTIVE_GOOGLE_STATES.includes(data.subscriptionState)) {
    throw new Error(`Google subscription not active: ${data.subscriptionState}`);
  }
  const lineItem = data.lineItems?.[0];
  if (!lineItem) throw new Error("No line item in Google subscription response");
  return {
    originalTxId: purchaseToken,
    productId: lineItem.productId as string | undefined,
    expiresAt: lineItem.expiryTime ? new Date(lineItem.expiryTime) : null,
    autoRenew: !!lineItem.autoRenewingPlan?.autoRenewEnabled,
  };
}

router.post("/verify", requireAuth, async (req: any, res: Response) => {
  const { receipt, platform } = req.body;
  if (!receipt) return res.status(400).json({ error: "receipt required" });
  if (platform !== "ios" && platform !== "android") {
    return res.status(400).json({ error: "invalid platform" });
  }
  const store = platform === "android" ? "google" : "apple";

  try {
    let originalTxId: string | undefined;
    let expiresAt: Date | null = null;
    let productId: string | undefined;
    let googleAutoRenew: boolean | undefined;

    if (store === "google") {
      const result = await verifyGooglePurchase(receipt);
      originalTxId = result.originalTxId;
      productId = result.productId;
      expiresAt = result.expiresAt;
      googleAutoRenew = result.autoRenew;
    } else {
      const sharedSecret = process.env.APPLE_SHARED_SECRET;
      if (!sharedSecret) {
        return res.status(500).json({ error: "APPLE_SHARED_SECRET not configured" });
      }

      // StoreKit 2 JWS token (contains dots) — decode payload directly
      if (receipt.includes(".")) {
        const parts = receipt.split(".");
        if (parts.length < 2) return res.status(400).json({ error: "Invalid JWS token" });
        const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = Buffer.from(padded, "base64").toString("utf8");
        const claims = JSON.parse(json);
        originalTxId = claims.originalTransactionId;
        productId = claims.productId;
        if (claims.expiresDate) expiresAt = new Date(claims.expiresDate);
      } else {
        // Legacy base64 receipt — try production first, fallback to sandbox
        const payload = { "receipt-data": receipt, password: sharedSecret };
        let data: any;
        const prodRes = await fetch("https://buy.itunes.apple.com/verifyReceipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        data = await prodRes.json();
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
        const latestInfo = data.latest_receipt_info?.[data.latest_receipt_info.length - 1];
        originalTxId = latestInfo?.original_transaction_id;
        productId = latestInfo?.product_id;
        const expiresMs = latestInfo?.expires_date_ms ? parseInt(latestInfo.expires_date_ms) : null;
        expiresAt = expiresMs ? new Date(expiresMs) : null;
      }
    }

    const planType = productId?.endsWith(".monthly") ? "monthly"
      : productId?.endsWith(".yearly") ? "yearly"
      : null;

    // Transfer ownership: revoke any OTHER user that previously claimed this
    // subscription (same original_transaction_id + store) — "last restore wins".
    // Preserves the prior owner's auto_renew so a cancelled sub stays cancelled
    // after transfer (can't "uncancel" by logging out and restoring elsewhere).
    // Google reports auto_renew live on every verify, so its branch always uses
    // that fresh value instead of the transferred one.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let transferAutoRenew: boolean | null = null;
      if (originalTxId) {
        const prior = await client.query(
          `SELECT auto_renew FROM users WHERE original_transaction_id = $1 AND store = $2 AND id != $3 LIMIT 1`,
          [originalTxId, store, req.userId]
        );
        if (prior.rows.length) {
          transferAutoRenew = prior.rows[0].auto_renew;
          await client.query(
            `UPDATE users SET is_premium = FALSE, original_transaction_id = NULL, store = NULL, auto_renew = FALSE
             WHERE original_transaction_id = $1 AND store = $2 AND id != $3`,
            [originalTxId, store, req.userId]
          );
        }
      }
      const storeParam = originalTxId ? store : null;
      const autoRenew = store === "google" ? googleAutoRenew : transferAutoRenew;
      if (autoRenew === null || autoRenew === undefined) {
        await client.query(
          `UPDATE users SET is_premium = TRUE, premium_expires_at = $1, original_transaction_id = COALESCE($2, original_transaction_id), store = COALESCE($3, store), plan_type = COALESCE($4, plan_type) WHERE id = $5`,
          [expiresAt, originalTxId ?? null, storeParam, planType, req.userId]
        );
      } else {
        await client.query(
          `UPDATE users SET is_premium = TRUE, premium_expires_at = $1, original_transaction_id = COALESCE($2, original_transaction_id), store = COALESCE($3, store), plan_type = COALESCE($4, plan_type), auto_renew = $5 WHERE id = $6`,
          [expiresAt, originalTxId ?? null, storeParam, planType, autoRenew, req.userId]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
