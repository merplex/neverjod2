import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 30,
});

export const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export async function initDB() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS ledgers (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (id, user_id)
    )`,
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
    `CREATE TABLE IF NOT EXISTS sync_repeat_transactions (
      id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT,
      account_id TEXT,
      category_name TEXT,
      account_name TEXT,
      amount NUMERIC NOT NULL,
      description TEXT,
      category_type TEXT,
      repeat_option TEXT NOT NULL,
      day_of_month INTEGER,
      weekday INTEGER,
      month_of_year INTEGER,
      time TEXT,
      start_date TEXT,
      next_due TEXT NOT NULL,
      last_executed TEXT,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted_at TIMESTAMPTZ,
      PRIMARY KEY (id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];
  for (const sql of tables) {
    await pool.query(sql);
  }
  // Migration: make type nullable (safe to run multiple times)
  await pool.query(`ALTER TABLE sync_transactions ALTER COLUMN type DROP NOT NULL`).catch(() => {});
  // Migration: add is_premium column if not exists
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE`).catch(() => {});
  // Migration: add premium_expires_at for subscription expiry tracking
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ`).catch(() => {});
  // Migration: add original_transaction_id for linking Apple notifications to users
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS original_transaction_id TEXT`).catch(() => {});
  // Migration: add plan_type ('monthly' | 'yearly') to differentiate subscription tier
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type TEXT`).catch(() => {});
  // Migration: add auto_renew — TRUE = will renew, FALSE = cancelled (but may still be active)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE`).catch(() => {});
  // Migration: add keywords + icon_id to categories and accounts
  await pool.query(`ALTER TABLE sync_categories ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE sync_categories ADD COLUMN IF NOT EXISTS icon_id TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE sync_accounts ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE sync_accounts ADD COLUMN IF NOT EXISTS icon_id TEXT`).catch(() => {});
  // Migration: add sort_order to categories and accounts
  await pool.query(`ALTER TABLE sync_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER`).catch(() => {});
  await pool.query(`ALTER TABLE sync_accounts ADD COLUMN IF NOT EXISTS sort_order INTEGER`).catch(() => {});
  // Migration: add ledger_id to all sync tables
  await pool.query(`ALTER TABLE sync_categories ADD COLUMN IF NOT EXISTS ledger_id TEXT NOT NULL DEFAULT 'main'`).catch(() => {});
  await pool.query(`ALTER TABLE sync_accounts ADD COLUMN IF NOT EXISTS ledger_id TEXT NOT NULL DEFAULT 'main'`).catch(() => {});
  await pool.query(`ALTER TABLE sync_transactions ADD COLUMN IF NOT EXISTS ledger_id TEXT NOT NULL DEFAULT 'main'`).catch(() => {});
  await pool.query(`ALTER TABLE sync_repeat_transactions ADD COLUMN IF NOT EXISTS ledger_id TEXT NOT NULL DEFAULT 'main'`).catch(() => {});
  // Migration: add cross_ledger_ref for cross-ledger transfers
  await pool.query(`ALTER TABLE sync_transactions ADD COLUMN IF NOT EXISTS cross_ledger_ref TEXT`).catch(() => {});
  // Migration: add is_repeat and repeat_id to preserve Repeat badge through sync
  await pool.query(`ALTER TABLE sync_transactions ADD COLUMN IF NOT EXISTS is_repeat BOOLEAN DEFAULT FALSE`).catch(() => {});
  await pool.query(`ALTER TABLE sync_transactions ADD COLUMN IF NOT EXISTS repeat_id TEXT`).catch(() => {});
  // Migration: create "main" ledger for all existing users that don't have one
  await pool.query(`
    INSERT INTO ledgers (id, user_id, name)
    SELECT 'main', id, 'Main'
    FROM users
    WHERE NOT EXISTS (
      SELECT 1 FROM ledgers WHERE ledgers.user_id = users.id AND ledgers.id = 'main'
    )
  `).catch(() => {});
  // Dev premium: premsak.c@gmail.com — yearly test account
  await pool.query(`
    UPDATE users SET
      is_premium = TRUE,
      plan_type = COALESCE(plan_type, 'yearly'),
      premium_expires_at = COALESCE(premium_expires_at, NOW() + INTERVAL '1 year')
    WHERE email = 'premsak.c@gmail.com'
  `).catch(() => {});
}
