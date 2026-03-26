const API_BASE = (import.meta.env.VITE_API_URL ?? "") + "/api";

// --- Auth ---

export async function apiRegister(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Register failed");
  return data as { token: string; email: string; isPremium: boolean };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data as { token: string; email: string; isPremium: boolean };
}

// --- Soft-delete tombstone helpers ---

export function markDeleted(type: "category" | "account" | "transaction", item: any) {
  const key = "app_pending_deletes";
  const pending: any[] = JSON.parse(localStorage.getItem(key) || "[]");
  if (!pending.find((p) => p._type === type && p.id === item.id)) {
    pending.push({ ...item, _type: type, deleted_at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(pending));
  }
}

function flushPendingDeletes() {
  localStorage.removeItem("app_pending_deletes");
}

function getPendingDeletes(): { categories: any[]; accounts: any[]; transactions: any[] } {
  const pending: any[] = JSON.parse(localStorage.getItem("app_pending_deletes") || "[]");
  return {
    categories: pending.filter((p) => p._type === "category"),
    accounts: pending.filter((p) => p._type === "account"),
    transactions: pending.filter((p) => p._type === "transaction"),
  };
}

// --- Fingerprint ---

export function makeFingerprint(tx: any): string {
  return [
    tx.date?.toString().slice(0, 10),
    tx.time || "",
    tx.amount?.toString() || "",
    tx.categoryId || "",
    tx.accountId || "",
  ].join("|");
}

// --- Merge helper (O(n) via Map) ---

function normalizeServerItem(item: any): any {
  const out = { ...item };
  // Map snake_case DB columns → camelCase used by client
  if ("icon_id" in out) { out.iconId = out.icon_id; delete out.icon_id; }
  if ("category_id" in out) { out.categoryId = out.category_id; delete out.category_id; }
  if ("account_id" in out) { out.accountId = out.account_id; delete out.account_id; }
  if ("start_balance" in out) { out.balance = parseFloat(out.start_balance) || 0; delete out.start_balance; }
  if ("amount" in out && typeof out.amount === "string") { out.amount = parseFloat(out.amount) || 0; }
  // keywords comes as JSONB array from PG; ensure it's an array
  if (out.keywords && !Array.isArray(out.keywords)) {
    try { out.keywords = JSON.parse(out.keywords); } catch { out.keywords = []; }
  }
  return out;
}

function mergeIntoLocal(storageKey: string, serverItems: any[]) {
  const local: any[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const localMap = new Map(local.map((item) => [item.id, item]));
  for (const raw of serverItems) {
    const serverItem = normalizeServerItem(raw);
    if (serverItem.deleted_at) {
      localMap.delete(serverItem.id);
    } else {
      const existing = localMap.get(serverItem.id);
      if (!existing || !existing.updated_at || existing.updated_at < serverItem.updated_at) {
        localMap.set(serverItem.id, { ...(existing || {}), ...serverItem });
      }
    }
  }
  localStorage.setItem(storageKey, JSON.stringify(Array.from(localMap.values())));
}

// --- Push local data to server ---

// force=true: stamp everything with now (manual sync — user asserts their data is truth)
// force=false: use existing timestamp or epoch (auto sync — server data wins if newer)
export async function syncPush(token: string, force = false) {
  const now = new Date().toISOString();
  const EPOCH = "1970-01-01T00:00:00.000Z";
  const categories = (JSON.parse(localStorage.getItem("app_categories") || "[]") as any[])
    .map((c) => ({ ...c, updated_at: force ? now : (c.updated_at || EPOCH) }));
  const accounts = (JSON.parse(localStorage.getItem("app_accounts") || "[]") as any[])
    .map((a) => ({ ...a, updated_at: force ? now : (a.updated_at || EPOCH) }));
  // Derive type from category if not stored on transaction
  const transactions = (JSON.parse(localStorage.getItem("app_transactions") || "[]") as any[])
    .map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const type = tx.type || cat?.type || "expense";
      return { ...tx, type, fingerprint: tx.fingerprint || makeFingerprint(tx), updated_at: tx.updated_at || now };
    });

  // Merge soft-delete tombstones
  const pending = getPendingDeletes();
  const allCategories = mergeWithTombstones(categories, pending.categories, now);
  const allAccounts = mergeWithTombstones(accounts, pending.accounts, now);
  const allTransactions = mergeWithTombstones(transactions, pending.transactions, now);

  const res = await fetch(`${API_BASE}/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ categories: allCategories, accounts: allAccounts, transactions: allTransactions }),
  });
  if (!res.ok) throw new Error("Push failed");
  flushPendingDeletes();
  return true;
}

function mergeWithTombstones(live: any[], tombstones: any[], now: string): any[] {
  const map = new Map(live.map((i) => [i.id, i]));
  for (const t of tombstones) {
    if (!map.has(t.id)) map.set(t.id, { ...t, updated_at: t.deleted_at || now });
  }
  return Array.from(map.values());
}

// --- Pull server data to local ---

export async function syncPull(token: string) {
  const lastSync = localStorage.getItem("last_sync_at") || null;
  const res = await fetch(`${API_BASE}/sync/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ last_sync_at: lastSync }),
  });
  if (!res.ok) throw new Error("Pull failed");

  const data = await res.json();
  if (data.categories?.length) mergeIntoLocal("app_categories", data.categories);
  if (data.accounts?.length) mergeIntoLocal("app_accounts", data.accounts);
  if (data.transactions?.length) mergeIntoLocal("app_transactions", data.transactions);
  // Always refresh premium status from server (handles DB changes without re-login)
  if (typeof data.isPremium === "boolean") {
    localStorage.setItem("app_premium", data.isPremium ? "true" : "false");
  }
  localStorage.setItem("last_sync_at", data.server_time);
  if (data.last_push_at) localStorage.setItem("last_push_at", data.last_push_at);
  return true;
}

// --- Full sync (push then pull) ---

export async function syncAll(token: string, force = false): Promise<void> {
  await syncPush(token, force);
  await syncPull(token);
}
