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

export async function apiVerifyPurchase(receipt: string) {
  const token = localStorage.getItem("app_token");
  if (!token) throw new Error("ต้อง login ก่อนซื้อ");
  const res = await fetch(`${API_BASE}/subscription/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ receipt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verify failed");
  return data as { ok: boolean };
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

// Merge transactions (ID-based, server wins on conflict)
function mergeIntoLocal(storageKey: string, serverItems: any[]) {
  const local: any[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const localMap = new Map(local.map((item) => [item.id, item]));
  for (const raw of serverItems) {
    const serverItem = normalizeServerItem(raw);
    if (serverItem.deleted_at) {
      localMap.delete(serverItem.id);
    } else {
      // Server is source of truth on pull — always overwrite local
      const existing = localMap.get(serverItem.id);
      localMap.set(serverItem.id, { ...(existing || {}), ...serverItem });
    }
  }
  localStorage.setItem(storageKey, JSON.stringify(Array.from(localMap.values())));
}

// Name-based merge for categories and accounts.
// Rules for local-owned items (source="local" or no source):
//   - Always coexist with server data — never dropped
//   - If ID collides with a server item → reassign a new unique ID (both items appear)
//   - Transaction refs are updated to the new ID
// Rules for server-owned items (source present, not "local"):
//   1. Same ID → server version already in result
//   2. Same name, different ID → server wins; track old local ID for tx ref update
//   3. Different name, different ID → keep both
// Returns a map of { oldLocalId → newId } for all ID changes (rename + server-name-wins).
function mergeCategOrAccIntoLocal(
  storageKey: string,
  serverItems: any[]
): Map<string, string> {
  const local: any[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const normalized = serverItems.map(normalizeServerItem);
  const serverLive = normalized.filter((i) => !i.deleted_at);
  const deletedIds = new Set(normalized.filter((i) => i.deleted_at).map((i) => i.id));

  const serverById = new Map(serverLive.map((i) => [i.id, i]));
  const serverByName = new Map(serverLive.map((i) => [i.name?.toLowerCase()?.trim(), i]));

  // Track all ID changes: local-item-renamed and server-name-wins
  const idReplacements = new Map<string, string>();

  // Start result with all live server items
  const resultMap = new Map<string, any>(serverLive.map((i) => [i.id, i]));

  let renameCounter = 0;
  for (const localItem of local) {
    if (localItem.source === "local") {
      // Local-owned (not yet pushed): must always appear.
      // If ID collides with a server item, assign a new unique ID so both coexist.
      if (resultMap.has(localItem.id)) {
        const newId = `local_${Date.now()}_${++renameCounter}`;
        idReplacements.set(localItem.id, newId);
        resultMap.set(newId, { ...localItem, id: newId });
      } else {
        resultMap.set(localItem.id, localItem);
      }
      continue;
    }

    if (deletedIds.has(localItem.id)) continue;   // Server soft-deleted this server-owned item
    if (serverById.has(localItem.id)) continue;    // Same ID → server version already in result

    const nameKey = localItem.name?.toLowerCase()?.trim();
    const serverMatch = nameKey ? serverByName.get(nameKey) : undefined;
    if (serverMatch) {
      // Same name, different ID → server wins; remember replacement for tx ref update
      idReplacements.set(localItem.id, serverMatch.id);
      continue;
    }

    // No match at all → keep local item (genuinely new/different item)
    resultMap.set(localItem.id, localItem);
  }

  // Order: local items first (source="local", preserve their relative order from local array)
  // then server items sorted by sortOrder, then pinned item at the bottom.
  const bottomId = storageKey === "app_categories" ? "nocat" : "account_deleted";
  const allItems = Array.from(resultMap.values());
  const pinnedItem = allItems.find((i) => i.id === bottomId);
  const localItems = local
    .filter((i) => i.source === "local" && resultMap.has(i.id) && i.id !== bottomId)
    .map((i) => resultMap.get(i.id)!);
  const localIds = new Set(localItems.map((i) => i.id));
  const syncedItems = allItems
    .filter((i) => i.id !== bottomId && !localIds.has(i.id))
    .sort((a, b) => {
      const oa = a.sortOrder ?? a.sort_order ?? 999999;
      const ob = b.sortOrder ?? b.sort_order ?? 999999;
      return oa - ob;
    });
  const finalItems = pinnedItem
    ? [...localItems, ...syncedItems, pinnedItem]
    : [...localItems, ...syncedItems];
  localStorage.setItem(storageKey, JSON.stringify(finalItems));
  return idReplacements;
}

// After name-based merge, update transaction categoryId/accountId references
// to point to the new (server) IDs when a local item was replaced by a server item.
function updateTransactionRefs(
  catIdMap: Map<string, string>,
  accIdMap: Map<string, string>
) {
  if (catIdMap.size === 0 && accIdMap.size === 0) return;
  const transactions: any[] = JSON.parse(localStorage.getItem("app_transactions") || "[]");
  let changed = false;
  const updated = transactions.map((tx) => {
    let newTx = { ...tx };
    if (catIdMap.has(tx.categoryId)) { newTx.categoryId = catIdMap.get(tx.categoryId)!; changed = true; }
    if (accIdMap.has(tx.accountId))  { newTx.accountId  = accIdMap.get(tx.accountId)!;  changed = true; }
    return newTx;
  });
  if (changed) localStorage.setItem("app_transactions", JSON.stringify(updated));
}

// --- Push local data to server ---

// force=true: stamp everything with now (manual sync — user asserts their data is truth)
// force=false: use existing timestamp or epoch (auto sync — server data wins if newer)
export async function syncPush(token: string, force = false) {
  const now = new Date().toISOString();

  // On the very first sync (no last_sync_at), we do NOT know which local
  // categories/accounts are genuinely user-created vs. fresh-install defaults.
  // To avoid overwriting the server's existing data with local defaults,
  // stamp them with epoch (1970-01-01) so the server's ON CONFLICT rule
  // ("WHERE updated_at < EXCLUDED.updated_at") will always keep the server copy.
  // Transactions are still stamped with `now` since they are always new data.
  const isFirstSync = !localStorage.getItem("last_sync_at");
  const catAccStamp = isFirstSync ? new Date(0).toISOString() : now;

  // Promote source:"local" → source:"server" before push so server gets the correct ownership
  // and subsequent pulls treat them as server-owned (no ID-rename loop).
  // Also assign sortOrder based on current display index so the server preserves ordering.
  const pinnedCatId = "nocat";
  const pinnedAccId = "account_deleted";
  for (const [key, pinnedId] of [["app_categories", pinnedCatId], ["app_accounts", pinnedAccId]] as const) {
    const items: any[] = JSON.parse(localStorage.getItem(key) || "[]");
    let orderIdx = 0;
    const promoted = items.map((i) => {
      const isPromoted = i.source === "local" ? { ...i, source: "server" } : i;
      // Pinned items (nocat / account_deleted) don't get a sort_order
      const sortOrder = i.id === pinnedId ? undefined : orderIdx++;
      return { ...isPromoted, sortOrder };
    });
    localStorage.setItem(key, JSON.stringify(promoted));
  }

  const categories = (JSON.parse(localStorage.getItem("app_categories") || "[]") as any[])
    .map((c) => ({ ...c, updated_at: catAccStamp }));
  const accounts = (JSON.parse(localStorage.getItem("app_accounts") || "[]") as any[])
    .map((a) => ({ ...a, updated_at: catAccStamp }));
  const transactions = (JSON.parse(localStorage.getItem("app_transactions") || "[]") as any[])
    .map((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const type = tx.type || cat?.type || "expense";
      return { ...tx, type, fingerprint: tx.fingerprint || makeFingerprint(tx), updated_at: now };
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
  // Categories and accounts: name-based merge so server wins even when IDs differ
  const catIdMap = data.categories?.length
    ? mergeCategOrAccIntoLocal("app_categories", data.categories)
    : new Map<string, string>();
  const accIdMap = data.accounts?.length
    ? mergeCategOrAccIntoLocal("app_accounts", data.accounts)
    : new Map<string, string>();
  // If any local IDs were replaced by server IDs, update transaction references first
  updateTransactionRefs(catIdMap, accIdMap);
  // Transactions: ID-based merge (fingerprint dedup handled server-side)
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
