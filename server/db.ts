import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export async function initDB() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_premium BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sync_categories (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted_at TIMESTAMPTZ,
      PRIMARY KEY (id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sync_accounts (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT,
      start_balance NUMERIC DEFAULT 0,
      icon TEXT,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted_at TIMESTAMPTZ,
      PRIMARY KEY (id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sync_transactions (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT,
      account_id TEXT,
      amount NUMERIC NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      date TIMESTAMPTZ NOT NULL,
      time TEXT,
      fingerprint TEXT,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted_at TIMESTAMPTZ,
      PRIMARY KEY (id, user_id)
    )`,
  ];
  for (const sql of tables) {
    await pool.query(sql);
  }
  // Migration: make type nullable (safe to run multiple times)
  await pool.query(`ALTER TABLE sync_transactions ALTER COLUMN type DROP NOT NULL`).catch(() => {});
  // Migration: add is_premium column if not exists
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE`).catch(() => {});
  // Migration: add keywords + icon_id to categories and accounts
  await pool.query(`ALTER TABLE sync_categories ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE sync_categories ADD COLUMN IF NOT EXISTS icon_id TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE sync_accounts ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE sync_accounts ADD COLUMN IF NOT EXISTS icon_id TEXT`).catch(() => {});
  // Migration: add sort_order to categories and accounts
  await pool.query(`ALTER TABLE sync_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER`).catch(() => {});
  await pool.query(`ALTER TABLE sync_accounts ADD COLUMN IF NOT EXISTS sort_order INTEGER`).catch(() => {});
  // Dev premium: premsak.c@gmail.com is always premium
  await pool.query(`UPDATE users SET is_premium = TRUE WHERE email = 'premsak.c@gmail.com'`).catch(() => {});
}
