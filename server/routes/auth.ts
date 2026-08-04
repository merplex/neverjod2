import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { pool, JWT_SECRET } from "../db";

const googleClient = new OAuth2Client();

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

async function sendResetEmail(to: string, resetUrl: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "NeverJod <noreply@neverjod.com>",
      to,
      subject: "Reset your NeverJod password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0ea5e9">NeverJod</h2>
          <p>คุณได้ขอรีเซ็ตรหัสผ่าน กรุณากดลิงก์ด้านล่างภายใน 1 ชั่วโมง</p>
          <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0ea5e9;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
            Reset Password
          </a>
          <p style="color:#888;font-size:12px">ถ้าคุณไม่ได้ขอรีเซ็ต ไม่ต้องทำอะไร</p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

const router = Router();

// Shared helper: build the same auth response shape as /login and /register
async function buildAuthResponse(user: any) {
  const now = new Date();
  if (user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) < now) {
    await pool.query("UPDATE users SET is_premium = FALSE WHERE id = $1", [user.id]);
    user.is_premium = false;
  }

  await pool.query(
    "INSERT INTO ledgers (id, user_id, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    ["main", user.id, "สมุดบัญชีหลัก"]
  );

  const token = jwt.sign({ userId: user.id, email: user.email, isPremium: user.is_premium }, JWT_SECRET, { expiresIn: "365d" });
  return {
    token,
    email: user.email,
    isPremium: user.is_premium,
    planType: user.is_premium ? (user.plan_type ?? null) : null,
    premiumExpiresAt: user.is_premium ? (user.premium_expires_at ?? null) : null,
    autoRenew: user.is_premium ? (user.auto_renew ?? true) : true,
  };
}

// Find a user by (provider, providerId), else link/create by email
async function findOrCreateSocialUser(provider: "google" | "apple", providerId: string, email: string | null) {
  let result = await pool.query(
    "SELECT id, email, password_hash, is_premium, premium_expires_at, plan_type, auto_renew FROM users WHERE provider = $1 AND provider_id = $2",
    [provider, providerId]
  );
  if (result.rows.length) return result.rows[0];

  if (email) {
    result = await pool.query(
      "SELECT id, email, password_hash, is_premium, premium_expires_at, plan_type, auto_renew, provider FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (result.rows.length) {
      const user = result.rows[0];
      if (!user.provider) {
        await pool.query("UPDATE users SET provider = $1, provider_id = $2 WHERE id = $3", [provider, providerId, user.id]);
      }
      return user;
    }
  }

  const insertEmail = email ? email.toLowerCase() : `${provider}_${providerId}@users.neverjod.com`;
  result = await pool.query(
    "INSERT INTO users (email, password_hash, provider, provider_id) VALUES ($1, NULL, $2, $3) RETURNING id, email, password_hash, is_premium, premium_expires_at, plan_type, auto_renew",
    [insertEmail, provider, providerId]
  );
  return result.rows[0];
}

// Apple public key verification (Sign in with Apple)
let appleKeysCache: { keys: any[]; fetchedAt: number } | null = null;

async function getApplePublicKey(kid: string) {
  const now = Date.now();
  if (!appleKeysCache || now - appleKeysCache.fetchedAt > 24 * 60 * 60 * 1000) {
    const res = await fetch("https://appleid.apple.com/auth/keys");
    const data = await res.json();
    appleKeysCache = { keys: data.keys, fetchedAt: now };
  }
  const jwk = appleKeysCache.keys.find((k: any) => k.kid === kid);
  if (!jwk) throw new Error("Apple public key not found");
  return crypto.createPublicKey({ key: jwk, format: "jwk" });
}

async function verifyAppleIdentityToken(identityToken: string, bundleId: string) {
  const decoded = jwt.decode(identityToken, { complete: true }) as any;
  if (!decoded?.header?.kid) throw new Error("Invalid Apple token header");
  const publicKey = await getApplePublicKey(decoded.header.kid);
  return jwt.verify(identityToken, publicKey, {
    algorithms: ["RS256"],
    issuer: "https://appleid.apple.com",
    audience: bundleId,
  }) as { sub: string; email?: string };
}

router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, is_premium, plan_type, premium_expires_at, auto_renew",
      [email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    // Create default "main" ledger for the new user
    await pool.query(
      "INSERT INTO ledgers (id, user_id, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      ["main", user.id, "สมุดบัญชีหลัก"]
    );
    const token = jwt.sign({ userId: user.id, email: user.email, isPremium: user.is_premium }, JWT_SECRET, { expiresIn: "365d" });
    res.json({
      token,
      email: user.email,
      isPremium: user.is_premium,
      planType: user.plan_type ?? null,
      premiumExpiresAt: user.premium_expires_at ?? null,
      autoRenew: user.auto_renew ?? true,
    });
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
      "SELECT id, email, password_hash, is_premium, premium_expires_at, plan_type, auto_renew FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (!result.rows.length) return res.status(401).json({ error: "Invalid email or password" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    // Auto-expire premium if subscription has passed its expiry date
    const now = new Date();
    if (user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) < now) {
      await pool.query("UPDATE users SET is_premium = FALSE WHERE id = $1", [user.id]);
      user.is_premium = false;
    }

    // Ensure "main" ledger exists for existing users (backfill)
    await pool.query(
      "INSERT INTO ledgers (id, user_id, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      ["main", user.id, "สมุดบัญชีหลัก"]
    );

    const token = jwt.sign({ userId: user.id, email: user.email, isPremium: user.is_premium }, JWT_SECRET, { expiresIn: "365d" });
    res.json({
      token,
      email: user.email,
      isPremium: user.is_premium,
      planType: user.is_premium ? (user.plan_type ?? null) : null,
      premiumExpiresAt: user.is_premium ? (user.premium_expires_at ?? null) : null,
      autoRenew: user.is_premium ? (user.auto_renew ?? true) : true,
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/google", async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "idToken required" });

  const audiences = [
    process.env.GOOGLE_CLIENT_ID_WEB,
    process.env.GOOGLE_CLIENT_ID_IOS,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
  ].filter((v): v is string => Boolean(v));
  if (!audiences.length) return res.status(500).json({ error: "Google sign-in not configured" });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: audiences });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) return res.status(401).json({ error: "Invalid Google token" });

    const user = await findOrCreateSocialUser("google", payload.sub, payload.email);
    res.json(await buildAuthResponse(user));
  } catch (err) {
    console.error("google auth error:", err);
    res.status(401).json({ error: "Google sign-in failed" });
  }
});

router.post("/apple", async (req: Request, res: Response) => {
  const { identityToken } = req.body;
  if (!identityToken) return res.status(400).json({ error: "identityToken required" });

  try {
    const bundleId = process.env.APPLE_BUNDLE_ID || "com.neverjod.app";
    const payload = await verifyAppleIdentityToken(identityToken, bundleId);
    if (!payload?.sub) return res.status(401).json({ error: "Invalid Apple token" });

    const user = await findOrCreateSocialUser("apple", payload.sub, payload.email ?? null);
    res.json(await buildAuthResponse(user));
  } catch (err) {
    console.error("apple auth error:", err);
    res.status(401).json({ error: "Apple sign-in failed" });
  }
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (result.rows.length) {
      const userId = result.rows[0].id;
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await pool.query(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [userId, token, expiresAt]
      );
      const appUrl = process.env.APP_URL || "https://neverjod.com";
      sendResetEmail(email.toLowerCase(), `${appUrl}/reset-password?token=${token}`)
        .catch((err) => console.error("forgot-password email error:", err));
    }
  } catch (err) {
    console.error("forgot-password error:", err);
  }

  // Always return ok immediately (don't wait for email)
  res.json({ ok: true });
});

router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token and password required" });

  try {
    const result = await pool.query(
      "SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL",
      [token]
    );
    if (!result.rows.length) return res.status(400).json({ error: "ลิงก์หมดอายุหรือถูกใช้แล้ว" });

    const userId = result.rows[0].user_id;
    const hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
    await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1", [token]);

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/delete-account", authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
