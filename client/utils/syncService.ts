export const API_BASE = (import.meta.env.VITE_API_URL ?? "") + "/api";

import { Capacitor } from "@capacitor/core";
import { getActiveLedgerId, lk } from "./ledgerStorage";
import { loadShadow, saveShadow, emptyShadow, recordHash, isDirty, actionTime, serverWins, type Shadow, type Kind } from "./syncShadow";
import { quietly } from "./syncQuiet";

// --- Auth ---

export type AuthResponse = {
  token: string;
  email: string;
  isPremium: boolean;
  planType: "monthly" | "yearly" | null;
  premiumExpiresAt: string | null;
  autoRenew: boolean;
};

export async function apiRegister(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Register failed");
  return data as AuthResponse;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data as AuthResponse;
}

export async function apiGoogleLogin(idToken: string) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Google sign-in failed");
  return data as AuthResponse;
}

export async function apiAppleLogin(identityToken: string) {
  const res = await fetch(`${API_BASE}/auth/apple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identityToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Apple sign-in failed");
  return data as AuthResponse;
}

export async function apiForgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data as { ok: boolean };
}

export async function apiResetPassword(token: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data as { ok: boolean };
}

export async function apiDeleteAccount(token: string) {
  const res = await fetch(`${API_BASE}/auth/delete-account`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Delete failed");
  return data as { ok: boolean };
}

export async function apiVerifyPurchase(receipt: string) {
  const token = localStorage.getItem("cloud_token");
  if (!token) throw new Error("ต้อง login ก่อนซื้อ");
  const res = await fetch(`${API_BASE}/subscription/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ receipt, platform: Capacitor.getPlatform() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verify failed");
  return data as { ok: boolean };
}

// --- Soft-delete tombstone helpers ---

// ledgerId: defaults to the active ledger; pass explicitly when deleting an item that lives in
// another ledger (e.g. the paired leg of a cross-ledger transfer) so its tombstone is pushed there.
export function markDeleted(type: "category" | "account" | "transaction", item: any, ledgerId?: string) {
  const key = lk("app_pending_deletes", ledgerId);
  const pending: any[] = JSON.parse(localStorage.getItem(key) || "[]");
  if (!pending.find((p) => p._type === type && p.id === item.id)) {
    pending.push({ ...item, _type: type, deleted_at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(pending));
  }
}

// Remove only the tombstones that were actually sent in the push that just succeeded. A delete
// made while that request was in flight isn't on the server yet — wiping it too (as a blanket
// removeItem did) dropped the delete for good, and the item came back from the server later.
function flushPendingDeletes(ledgerId: string, sent: any[], sentRepeats: any[]) {
  const sentKeys = new Set(sent.map((p) => `${p._type}:${p.id}`));
  const key = lk("app_pending_deletes", ledgerId);
  const left = (JSON.parse(localStorage.getItem(key) || "[]") as any[]).filter((p) => !sentKeys.has(`${p._type}:${p.id}`));
  if (left.length) localStorage.setItem(key, JSON.stringify(left)); else localStorage.removeItem(key);

  const sentRepeatIds = new Set(sentRepeats.map((p) => p.id));
  const rKey = lk("app_pending_deletes_repeats", ledgerId);
  const rLeft = (JSON.parse(localStorage.getItem(rKey) || "[]") as any[]).filter((p) => !sentRepeatIds.has(p.id));
  if (rLeft.length) localStorage.setItem(rKey, JSON.stringify(rLeft)); else localStorage.removeItem(rKey);
}

function getPendingDeletes(ledgerId?: string): { categories: any[]; accounts: any[]; transactions: any[] } {
  const pending: any[] = JSON.parse(localStorage.getItem(lk("app_pending_deletes", ledgerId)) || "[]");
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
  if ("is_repeat"  in out) { out.isRepeat  = out.is_repeat  || false; delete out.is_repeat; }
  if ("repeat_id"  in out) { out.repeatId  = out.repeat_id  || null;    delete out.repeat_id; }
  if ("amount" in out && typeof out.amount === "string") { out.amount = parseFloat(out.amount) || 0; }
  if ("exchange_rate" in out) { out.exchangeRate = out.exchange_rate != null ? parseFloat(out.exchange_rate) : undefined; delete out.exchange_rate; }
  if ("currency_amount" in out) { out.currencyAmount = out.currency_amount != null ? parseFloat(out.currency_amount) : undefined; delete out.currency_amount; }
  // keywords comes as JSONB array from PG; ensure it's an array
  if (out.keywords && !Array.isArray(out.keywords)) {
    try { out.keywords = JSON.parse(out.keywords); } catch { out.keywords = []; }
  }
  return out;
}

// Normalize snake_case DB fields for repeat transactions
function normalizeRepeatItem(raw: any): any {
  const out = { ...raw };
  if ("category_id"   in out) { out.categoryId   = out.category_id;   delete out.category_id; }
  if ("account_id"    in out) { out.accountId    = out.account_id;    delete out.account_id; }
  if ("category_name" in out) { out.categoryName = out.category_name; delete out.category_name; }
  if ("account_name"  in out) { out.accountName  = out.account_name;  delete out.account_name; }
  if ("category_type" in out) { out.categoryType = out.category_type; delete out.category_type; }
  if ("repeat_option" in out) { out.repeatOption = out.repeat_option; delete out.repeat_option; }
  if ("day_of_month"  in out) { out.dayOfMonth   = out.day_of_month;  delete out.day_of_month; }
  if ("month_of_year" in out) { out.monthOfYear  = out.month_of_year; delete out.month_of_year; }
  if ("start_date"    in out) { out.startDate    = out.start_date;    delete out.start_date; }
  if ("next_due"      in out) { out.nextDue      = out.next_due;      delete out.next_due; }
  if ("last_executed" in out) { out.lastExecuted = out.last_executed; delete out.last_executed; }
  if ("amount" in out && typeof out.amount === "string") { out.amount = parseFloat(out.amount) || 0; }
  delete out.user_id;
  return out;
}

// Merge repeat transactions (ID-based; server wins on conflict; local-only items preserved)
// Same ID-collision rule as cat/acc: if a source="local" item clashes with a server item,
// reassign the local item a new unique ID so BOTH coexist — nothing is silently dropped.
function mergeRepeatTransIntoLocal(serverItems: any[], ledgerId?: string, shadow?: Shadow | null) {
  const local: any[] = JSON.parse(localStorage.getItem(lk("app_repeat_transactions", ledgerId)) || "[]");
  // Don't restore items the user has locally deleted but not yet pushed
  const pendingRepeats: any[] = JSON.parse(localStorage.getItem(lk("app_pending_deletes_repeats", ledgerId)) || "[]");
  const pendingDeleteIds = new Set(pendingRepeats.map((p: any) => p.id));
  const serverById = new Map<string, any>();
  const deletedIds = new Set<string>();

  for (const raw of serverItems) {
    const item = normalizeRepeatItem(raw);
    if (raw.deleted_at) {
      deletedIds.add(item.id);
      if (shadow) delete shadow.r[item.id];
    } else {
      serverById.set(item.id, { ...item, source: "server" });
    }
  }

  const result: any[] = [];
  const seenIds = new Set<string>();
  let renameCounter = 0;

  for (const localItem of local) {
    if (deletedIds.has(localItem.id)) continue;  // server deleted this item

    if (localItem.source === "local") {
      // Not yet synced — must always appear.
      // If ID collides with a server item, give local a new ID so both coexist.
      if (serverById.has(localItem.id)) {
        const newId = `local_${Date.now()}_${++renameCounter}`;
        result.push({ ...localItem, id: newId });
        seenIds.add(newId);
      } else {
        result.push(localItem);
        seenIds.add(localItem.id);
      }
      continue;
    }

    if (serverById.has(localItem.id)) {
      const serverItem = serverById.get(localItem.id)!;
      // last-write-wins for editable fields (description, amount, etc.)
      const localUpdated = new Date(localItem.updated_at || 0).getTime();
      const serverUpdated = new Date(serverItem.updated_at || 0).getTime();
      const takeServer = shadow
        ? serverWins(shadow, "r", localItem, serverItem.updated_at)
        : !(localUpdated > serverUpdated);
      const base = takeServer ? serverItem : localItem;
      if (takeServer && shadow) shadow.r[serverItem.id] = [recordHash("r", serverItem), serverItem.updated_at];
      // always use the further nextDue — prevents re-execution if repeat already fired locally
      const localNextDue = new Date(localItem.nextDue || 0).getTime();
      const serverNextDue = new Date(serverItem.nextDue || 0).getTime();
      const merged = localNextDue > serverNextDue
        ? { ...base, nextDue: localItem.nextDue, lastExecuted: localItem.lastExecuted }
        : { ...base, nextDue: serverItem.nextDue, lastExecuted: serverItem.lastExecuted };
      result.push(merged);
      seenIds.add(localItem.id);
    } else {
      result.push(localItem);  // server hasn't changed it — keep local
      seenIds.add(localItem.id);
    }
  }
  // Append new server items not yet present locally (skip pending-delete items)
  for (const [id, item] of serverById) {
    if (!seenIds.has(id) && !pendingDeleteIds.has(id)) {
      result.push(item);
      if (shadow) shadow.r[id] = [recordHash("r", item), item.updated_at];
    }
  }

  localStorage.setItem(lk("app_repeat_transactions", ledgerId), JSON.stringify(result));
}

// Merge transactions (ID-based, server wins on conflict)
function mergeIntoLocal(storageKey: string, serverItems: any[], ledgerId?: string, shadow?: Shadow | null) {
  const local: any[] = JSON.parse(localStorage.getItem(lk(storageKey, ledgerId)) || "[]");
  const localMap = new Map(local.map((item) => [item.id, item]));

  // Do not restore items that the user has locally deleted (pending push to server).
  // Only relevant for the transactions store; skip the Set build for other keys.
  const pendingDeleteIds = storageKey === "app_transactions"
    ? new Set(getPendingDeletes(ledgerId).transactions.map((p: any) => p.id))
    : new Set<string>();

  for (const raw of serverItems) {
    const serverItem = normalizeServerItem(raw);
    if (serverItem.deleted_at) {
      localMap.delete(serverItem.id);
      if (shadow) delete shadow.t[serverItem.id];
    } else {
      if (pendingDeleteIds.has(serverItem.id)) continue;
      const existing = localMap.get(serverItem.id);
      // With a shadow: compare against the local edit's own action time (an unsynced local edit
      // is never overwritten by an older server copy). Legacy ledgers keep the old rule.
      const takeServer = shadow
        ? serverWins(shadow, "t", existing, serverItem.updated_at)
        : (!existing || !existing.updated_at || existing.updated_at < serverItem.updated_at);
      if (takeServer) {
        if (shadow) shadow.t[serverItem.id] = [recordHash("t", serverItem), serverItem.updated_at];
        // Preserve local-only fields (isRepeat, repeatId) that server doesn't store
        const preserve: any = {};
        if (existing?.isRepeat)  preserve.isRepeat  = existing.isRepeat;
        if (existing?.repeatId)  preserve.repeatId  = existing.repeatId;
        if (existing?.isTransfer) preserve.isTransfer = existing.isTransfer;
        if (existing?.transferRef) preserve.transferRef = existing.transferRef;
        localMap.set(serverItem.id, { ...(existing || {}), ...serverItem, ...preserve });
      }
    }
  }
  localStorage.setItem(lk(storageKey, ledgerId), JSON.stringify(Array.from(localMap.values())));
}

// Source-based merge for categories and accounts.
// Rules for local-owned items (source="local"):
//   - Always coexist with server data — never dropped
//   - If name matches a server item → append "-new" so user can distinguish them
//   - If ID collides with a server item → reassign a new unique ID
//   - Transaction refs are updated to the new ID
// Rules for server-owned items (source="server"):
//   - Same ID → server version already in result (server wins)
//   - ID not in server response → keep local copy (unchanged since last sync)
//   - Server soft-deleted → drop
// Returns a map of { oldLocalId → newId } for all ID changes.
function mergeCategOrAccIntoLocal(
  storageKey: string,
  serverItems: any[],
  ledgerId?: string,
  shadow?: Shadow | null
): Map<string, string> {
  const kind: Kind = storageKey === "app_accounts" ? "a" : "c";
  const local: any[] = JSON.parse(localStorage.getItem(lk(storageKey, ledgerId)) || "[]");
  const normalized = serverItems.map(normalizeServerItem);
  const serverLive = normalized.filter((i) => !i.deleted_at);
  const deletedIds = new Set(normalized.filter((i) => i.deleted_at).map((i) => i.id));

  const serverById = new Map(serverLive.map((i) => [i.id, i]));
  const serverByName = new Map(serverLive.map((i) => [i.name?.toLowerCase()?.trim(), i]));

  const idReplacements = new Map<string, string>();

  // Start result with all live server items
  const resultMap = new Map<string, any>(serverLive.map((i) => [i.id, i]));

  let renameCounter = 0;
  for (const localItem of local) {
    if (localItem.source === "local") {
      // Not yet synced — must always appear.
      let item = { ...localItem };

      // If server already has an item with the same name, add "-new" to disambiguate.
      // The server item keeps its original name; local gets the suffix so nothing is hidden.
      const nameKey = item.name?.toLowerCase()?.trim();
      if (nameKey && serverByName.has(nameKey)) {
        item = { ...item, name: item.name + "-new" };
      }

      // If ID collides with a server item, assign a new unique ID so both coexist.
      if (resultMap.has(item.id)) {
        const newId = `local_${Date.now()}_${++renameCounter}`;
        idReplacements.set(localItem.id, newId);
        resultMap.set(newId, { ...item, id: newId });
      } else {
        if (item.id !== localItem.id) idReplacements.set(localItem.id, item.id);
        resultMap.set(item.id, item);
      }
      continue;
    }

    // Server-owned (previously synced)
    if (deletedIds.has(localItem.id)) continue;   // Server soft-deleted this item
    if (serverById.has(localItem.id)) {
      // Last-write-wins: if local is newer, keep local (will be pushed right after pull)
      const serverTime = new Date(serverById.get(localItem.id).updated_at || 0).getTime();
      const localTime  = new Date(localItem.updated_at || 0).getTime();
      const keepLocal = shadow
        ? !serverWins(shadow, kind, localItem, serverById.get(localItem.id).updated_at)
        : localTime > serverTime;
      if (keepLocal) resultMap.set(localItem.id, localItem);
      continue;
    }

    // Server-owned item absent from server response → unchanged since last sync, keep it
    resultMap.set(localItem.id, localItem);
  }

  // Shadow: server copies that ended up in the result are now "in sync"; server deletes drop out.
  if (shadow) {
    for (const id of deletedIds) delete shadow[kind][id];
    for (const s of serverLive) {
      if (resultMap.get(s.id) === s) shadow[kind][s.id] = [recordHash(kind, s), s.updated_at];
    }
  }

  // Preserve local-only fields (currency, exchangeRate) for accounts where server returned null.
  // This protects against server not yet having deployed currency column migrations.
  if (storageKey === "app_accounts") {
    const localById = new Map(local.map((i) => [i.id, i]));
    for (const [id, item] of resultMap) {
      if (!item.currency && !item.exchangeRate) {
        const loc = localById.get(id);
        if (loc?.currency) {
          resultMap.set(id, { ...item, currency: loc.currency, exchangeRate: loc.exchangeRate });
        }
      }
    }
  }

  // Order: local items first (source="local", preserve their relative order)
  // then server items sorted by sortOrder, then pinned item at the bottom.
  const bottomId = storageKey === "app_categories" ? "nocat" : "account_deleted";
  const allItems = Array.from(resultMap.values());
  const pinnedItem = allItems.find((i) => i.id === bottomId);
  const localItems = local
    .filter((i) => i.source === "local" && i.id !== bottomId)
    .map((i) => {
      const effectiveId = idReplacements.get(i.id) ?? i.id;
      return resultMap.get(effectiveId);
    })
    .filter(Boolean) as any[];
  const localIds = new Set(localItems.map((i: any) => i.id));
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
  localStorage.setItem(lk(storageKey, ledgerId), JSON.stringify(finalItems));
  return idReplacements;
}

// After name-based merge, update transaction categoryId/accountId references
// to point to the new (server) IDs when a local item was replaced by a server item.
function updateTransactionRefs(
  catIdMap: Map<string, string>,
  accIdMap: Map<string, string>,
  ledgerId?: string
) {
  if (catIdMap.size === 0 && accIdMap.size === 0) return;
  const transactions: any[] = JSON.parse(localStorage.getItem(lk("app_transactions", ledgerId)) || "[]");
  let changed = false;
  const updated = transactions.map((tx) => {
    let newTx = { ...tx };
    if (catIdMap.has(tx.categoryId)) { newTx.categoryId = catIdMap.get(tx.categoryId)!; changed = true; }
    if (accIdMap.has(tx.accountId))  { newTx.accountId  = accIdMap.get(tx.accountId)!;  changed = true; }
    return newTx;
  });
  if (changed) localStorage.setItem(lk("app_transactions", ledgerId), JSON.stringify(updated));
}

// --- Push local data to server ---

// Push only what changed since the last sync (see syncShadow.ts), each record carrying the time
// the user actually changed it, so the server's last-write-wins compares real action times.
// force=true (manual Sync button) or a ledger with no shadow yet (synced by an older version):
// send everything, stamped like before, and build the shadow from it.
// isFirstSync: passed in from syncAll so pull (which sets last_sync_at) doesn't flip the flag
// ledgerId: defaults to the currently active ledger; pass explicitly to flush a ledger the user
// has already switched away from (its localStorage keys are untouched by the switch).
async function syncPushNow(token: string, force = false, isFirstSync?: boolean, ledgerId?: string) {
  if (localStorage.getItem("app_premium") !== "true") return false;
  const now = new Date().toISOString();
  ledgerId = ledgerId ?? getActiveLedgerId();

  // On the very first sync (no last_sync_at) we can't tell user-created categories/accounts from
  // fresh-install defaults, so they're stamped with epoch and the server's copy always wins.
  // NOTE: caller (syncAll) captures this flag BEFORE pull runs.
  if (isFirstSync === undefined) isFirstSync = !localStorage.getItem(lk("last_sync_at", ledgerId));
  const catAccStamp = isFirstSync ? new Date(0).toISOString() : now;

  const prevShadow = loadShadow(ledgerId);
  const sendAll = force || !prevShadow;
  const shadow: Shadow = prevShadow || emptyShadow();

  const read = (key: string): any[] => { try { return JSON.parse(localStorage.getItem(lk(key, ledgerId)) || "[]"); } catch { return []; } };
  const withOrder = (items: any[], pinnedId: string) => {
    let idx = 0;
    return items.map((i) => ({ ...i, sortOrder: i.id === pinnedId ? undefined : idx++ }));
  };
  const rawCategories = withOrder(read("app_categories"), "nocat");
  const rawAccounts = withOrder(read("app_accounts"), "account_deleted");
  const rawRepeats = read("app_repeat_transactions");
  const rawTransactions = read("app_transactions");

  // What gets sent, with its stamp. Records are sent with source:"server" (they will be once
  // this succeeds) — the local copy is only promoted after a successful push.
  const pick = (kind: Kind, items: any[], legacyStamp: string) => {
    const out: any[] = [];
    for (const i of items) {
      if (!sendAll && !isDirty(shadow, kind, i)) continue;
      const updated_at = sendAll ? legacyStamp : actionTime(shadow, kind, i, now);
      out.push({ ...i, ...(i.source === "local" ? { source: "server" } : {}), updated_at });
    }
    return out;
  };
  const categories = pick("c", rawCategories, catAccStamp);
  const accounts = pick("a", rawAccounts, catAccStamp);
  const repeats = pick("r", rawRepeats, catAccStamp);
  const transactions = pick("t", rawTransactions, now).map((tx) => {
    const cat = rawCategories.find((c) => c.id === tx.categoryId);
    const type = tx.type || cat?.type || "expense";
    return { ...tx, type, fingerprint: makeFingerprint(tx) };
  });

  // Soft-delete tombstones
  const pendingAll: any[] = JSON.parse(localStorage.getItem(lk("app_pending_deletes", ledgerId)) || "[]");
  const pending = getPendingDeletes(ledgerId);
  const pendingRepeats: any[] = JSON.parse(localStorage.getItem(lk("app_pending_deletes_repeats", ledgerId)) || "[]");
  const allCategories = mergeWithTombstones(categories, pending.categories, now);
  const allAccounts = mergeWithTombstones(accounts, pending.accounts, now);
  const allTransactions = mergeWithTombstones(transactions, pending.transactions, now);
  const allRepeatTransactions = mergeWithTombstones(repeats, pendingRepeats, now);

  // Settings: single per-ledger blob, same first-sync epoch trick. Only sent when it changed
  // since it was last pushed.
  let settings: any = null;
  try { settings = JSON.parse(localStorage.getItem(lk("app_settings", ledgerId)) || "null"); } catch {}
  const settingsUpdatedAt = isFirstSync ? new Date(0).toISOString() : (settings?.updatedAt || now);
  const settingsSig = settings ? JSON.stringify(settings) : "";
  const sendSettings = !!settings && (sendAll || localStorage.getItem(lk("settings_pushed_sig", ledgerId)) !== settingsSig);

  const nothingToSend = !sendSettings && !allCategories.length && !allAccounts.length
    && !allTransactions.length && !allRepeatTransactions.length;
  if (nothingToSend) return true;

  const res = await fetch(`${API_BASE}/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      categories: allCategories, accounts: allAccounts, transactions: allTransactions, repeatTransactions: allRepeatTransactions,
      settings: sendSettings ? settings : null, settings_updated_at: settingsUpdatedAt,
      ledger_id: ledgerId,
    }),
  });
  if (!res.ok) throw new Error(`push:${res.status}`);

  // Push succeeded. Re-read CURRENT storage (never write back the pre-request snapshot — an edit
  // made while the request was in flight would be reverted), promote sent items to
  // source:"server", and record what was sent in the shadow. Anything changed meanwhile no
  // longer matches the shadow hash, so it stays dirty and goes up next time.
  quietly(() => {
    const sentIds = (list: any[]) => new Set(list.map((i) => i.id));
    for (const [key, pinnedId, sent] of [
      ["app_categories", "nocat", sentIds(categories)],
      ["app_accounts", "account_deleted", sentIds(accounts)],
    ] as const) {
      const current = withOrder(read(key), pinnedId).map((i) =>
        i.source === "local" && sent.has(i.id) ? { ...i, source: "server" } : i);
      localStorage.setItem(lk(key, ledgerId), JSON.stringify(current));
    }
    const sentRepeatIds = sentIds(repeats);
    localStorage.setItem(
      lk("app_repeat_transactions", ledgerId),
      JSON.stringify(read("app_repeat_transactions").map((r) =>
        r.source === "local" && sentRepeatIds.has(r.id) ? { ...r, source: "server" } : r))
    );

    const next: Shadow = sendAll ? emptyShadow() : shadow;
    for (const [kind, list] of [["c", categories], ["a", accounts], ["r", repeats], ["t", transactions]] as const) {
      for (const i of list) next[kind][i.id] = [recordHash(kind, i), i.updated_at];
    }
    for (const p of pending.categories) delete next.c[p.id];
    for (const p of pending.accounts) delete next.a[p.id];
    for (const p of pending.transactions) delete next.t[p.id];
    for (const p of pendingRepeats) delete next.r[p.id];
    saveShadow(ledgerId!, next);
    if (sendSettings) localStorage.setItem(lk("settings_pushed_sig", ledgerId), settingsSig);

    flushPendingDeletes(ledgerId!, pendingAll, pendingRepeats);
  });
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

// ledgerId: defaults to the active ledger; pass explicitly to pull a ledger that isn't open
// (its data lands in that ledger's own localStorage keys, the active ledger is untouched).
async function syncPullNow(token: string, ledgerId?: string) {
  if (localStorage.getItem("app_premium") !== "true") return false;
  ledgerId = ledgerId ?? getActiveLedgerId();
  const lastSync = localStorage.getItem(lk("last_sync_at", ledgerId)) || null;
  const res = await fetch(`${API_BASE}/sync/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ last_sync_at: lastSync, ledger_id: ledgerId }),
  });
  if (!res.ok) throw new Error(`pull:${res.status}`);

  const data = await res.json();
  quietly(() => applyPull(data, ledgerId!));
  return true;
}

// Synchronous (no awaits) so no user action can interleave with the merge.
function applyPull(data: any, ledgerId: string) {
  const shadow = loadShadow(ledgerId); // null = legacy ledger (not yet pushed with tracking)
  // Categories and accounts: name-based merge so server wins even when IDs differ
  const catIdMap = data.categories?.length
    ? mergeCategOrAccIntoLocal("app_categories", data.categories, ledgerId, shadow)
    : new Map<string, string>();
  const accIdMap = data.accounts?.length
    ? mergeCategOrAccIntoLocal("app_accounts", data.accounts, ledgerId, shadow)
    : new Map<string, string>();
  // If any local IDs were replaced by server IDs, update transaction references first
  updateTransactionRefs(catIdMap, accIdMap, ledgerId);
  // Transactions: ID-based merge (fingerprint dedup handled server-side)
  if (data.transactions?.length) mergeIntoLocal("app_transactions", data.transactions, ledgerId, shadow);
  // Repeat transactions: ID-based merge (server wins; local-only items preserved)
  if (data.repeatTransactions?.length) mergeRepeatTransIntoLocal(data.repeatTransactions, ledgerId, shadow);
  if (shadow) saveShadow(ledgerId, shadow);
  // Settings: single blob, last-write-wins by timestamp (server never clobbers a newer local edit)
  if (data.settings) {
    let local: any = null;
    try { local = JSON.parse(localStorage.getItem(lk("app_settings", ledgerId)) || "null"); } catch {}
    const localStamp = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
    const serverStamp = data.settingsUpdatedAt ? new Date(data.settingsUpdatedAt).getTime() : 0;
    if (serverStamp > localStamp) {
      localStorage.setItem(lk("app_settings", ledgerId), JSON.stringify(data.settings));
    }
  }
  // Always refresh premium status from server (handles DB changes without re-login)
  if (typeof data.isPremium === "boolean") {
    localStorage.setItem("app_premium", data.isPremium ? "true" : "false");
  }
  if (data.planType) localStorage.setItem("app_plan_type", data.planType);
  else localStorage.removeItem("app_plan_type");
  if (data.premiumExpiresAt) localStorage.setItem("app_premium_expires_at", data.premiumExpiresAt);
  else localStorage.removeItem("app_premium_expires_at");
  if (typeof data.autoRenew === "boolean") {
    localStorage.setItem("app_auto_renew", data.autoRenew ? "true" : "false");
  }
  localStorage.setItem(lk("last_sync_at", ledgerId), data.server_time);
  if (data.last_push_at) localStorage.setItem(lk("last_push_at", ledgerId), data.last_push_at);
}

// --- Ledger API ---

export async function apiListLedgers(token: string): Promise<{ id: string; name: string; created_at: string }[]> {
  const res = await fetch(`${API_BASE}/ledgers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data.ledgers;
}

export async function apiCreateLedger(token: string, name: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${API_BASE}/ledgers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
  return data;
}

export async function apiRenameLedger(token: string, id: string, name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ledgers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed");
}

export async function apiDeleteLedger(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/ledgers/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed");
  }
}

// --- Full sync (pull then push) ---
// Pull first: get server data, resolve conflicts, set source="server" on server items.
// Push second: promote remaining source="local" items to server.
// isFirstSync is captured BEFORE pull so that pull setting last_sync_at doesn't
// accidentally make push think it's a non-first sync and use `now` as timestamp.
// Syncs EVERY ledger, not just the open one — e.g. the incoming leg of a cross-ledger transfer
// is written straight into the other ledger's storage and must reach the server without the
// user having to open that ledger. Active ledger goes first so its errors surface as before.
async function syncAllNow(token: string, force = false): Promise<void> {
  if (localStorage.getItem("app_premium") !== "true") return;
  const activeId = getActiveLedgerId();
  await syncLedger(token, force, activeId);

  const otherIds = (await getAllLedgerIds(token)).filter((id) => id !== activeId);
  let firstError: unknown = null;
  for (const id of otherIds) {
    try { await syncLedger(token, force, id); }
    catch (e) { firstError = firstError ?? e; }
  }
  if (firstError) throw firstError;
}

async function syncLedger(token: string, force: boolean, ledgerId: string) {
  const isFirstSync = !localStorage.getItem(lk("last_sync_at", ledgerId));
  await syncPullNow(token, ledgerId);
  await syncPushNow(token, force, isFirstSync, ledgerId);
}

// --- Serialization ---
// Every sync entry point runs one at a time. Boot (ledger flush push + syncAll), app resume, and
// the Settings button can all fire syncs that overlap; a pull and a push of the same ledger running
// concurrently interleave their localStorage reads/writes, and the later writer silently reverts
// what the other merged (account balances, deletes, repeat schedules).
let syncChain: Promise<unknown> = Promise.resolve();
let queuedSyncAll: { promise: Promise<void>; force: boolean } | null = null;

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = syncChain.then(fn, fn);
  syncChain = run.catch(() => {});
  return run;
}

export function syncPush(token: string, force = false, isFirstSync?: boolean, ledgerId?: string) {
  // Resolve the ledger NOW (caller's intent), not when the queued job eventually runs.
  const id = ledgerId ?? getActiveLedgerId();
  return serialized(() => syncPushNow(token, force, isFirstSync, id));
}

export function syncPull(token: string, ledgerId?: string) {
  const id = ledgerId ?? getActiveLedgerId();
  return serialized(() => syncPullNow(token, id));
}

// A syncAll that is queued but hasn't started yet already covers any new request (it will read
// the latest local state when it runs), so callers share it instead of stacking duplicates.
export function syncAll(token: string, force = false): Promise<void> {
  if (queuedSyncAll && (queuedSyncAll.force || !force)) return queuedSyncAll.promise;
  const entry = { force, promise: null as unknown as Promise<void> };
  entry.promise = serialized(() => {
    if (queuedSyncAll === entry) queuedSyncAll = null;
    return syncAllNow(token, force);
  });
  queuedSyncAll = entry;
  return entry.promise;
}

// Server list is the source of truth (a fresh device may not have opened Settings yet to cache
// it); fall back to the locally cached list when offline. "main" is never stored on the server.
async function getAllLedgerIds(token: string): Promise<string[]> {
  let ids: string[] = [];
  try {
    ids = (await apiListLedgers(token)).map((l) => l.id);
  } catch {
    try { ids = (JSON.parse(localStorage.getItem("app_ledgers") || "[]") as any[]).map((l) => l.id); } catch {}
  }
  return Array.from(new Set(["main", ...ids]));
}
