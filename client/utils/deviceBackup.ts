// Device backups (max 3): kept on the phone (this app's IndexedDB) AND on the server.
// IndexedDB rather than localStorage because localStorage has a small shared quota (~5MB) that
// the live data already uses; three full copies could overflow it.
//
// A backup set is a snapshot of EVERY ledger: transactions, accounts, categories, repeats,
// settings — exactly what was on the phone at the moment shown as its date/time.
//
// Integrity — a set is only ever used if it is provably complete:
//  - At creation we compute a checksum + per-ledger record counts. The set is written to the
//    phone, read back and re-checked before it's listed. If Cloud is on, the phone first syncs
//    so the snapshot includes the latest from every ledger.
//  - Upload is confirmed by downloading the server's copy and comparing checksums; only then is
//    the set marked "on Cloud" (a failed/partial upload is retried later).
//  - Restore uses the phone's copy first, the server's if the phone has none (or it fails the
//    check); either copy must match its checksum or nothing is restored.
//  - Restore writes every key at once and rolls everything back if any write fails (e.g. storage
//    full), so it never leaves half-restored data.
//
// Restore makes sync agree with the restored data: changed records are stamped with the restore
// time (so they win on the server) and records added since the backup get delete tombstones.

import { API_BASE, syncAll } from "./syncService";
import { Capacitor } from "@capacitor/core";
import { lk } from "./ledgerStorage";

export const MAX_BACKUPS = 3;

export type LedgerCounts = { t: number; a: number; c: number; r: number };

interface StoredBackup {
  id: string;
  createdAt: string; // ISO
  data: Record<string, string>; // localStorage key → raw value
  checksum: string;
  counts: Record<string, LedgerCounts>; // per ledger id
  uploaded?: boolean; // server copy verified
}

// What the UI lists: union of the phone's and the server's sets
export interface BackupEntry {
  id: string;
  createdAt: string;
  ledgerIds: string[];
  counts: Record<string, LedgerCounts>;
  onDevice: boolean;
  onCloud: boolean;
}

const DB_NAME = "neverjod_backups";
const STORE = "backups";
const DATA_BASES = ["app_transactions", "app_accounts", "app_categories", "app_repeat_transactions", "app_settings"];
const PENDING_SERVER_DELETES = "backup_pending_server_deletes";

// ---- IndexedDB ------------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

const getLocal = (id: string) => idb<StoredBackup | undefined>("readonly", (s) => s.get(id) as IDBRequest<StoredBackup | undefined>);
const getAllLocal = () => idb<StoredBackup[]>("readonly", (s) => s.getAll() as IDBRequest<StoredBackup[]>);
const putLocal = (b: StoredBackup) => idb("readwrite", (s) => s.put(b));

// ---- data helpers ---------------------------------------------------------------------------

// "app_transactions" → main, "app_transactions__abc" → abc
function parseKey(key: string): { base: string; ledgerId: string } | null {
  const sep = key.indexOf("__");
  const base = sep === -1 ? key : key.slice(0, sep);
  if (!DATA_BASES.includes(base)) return null;
  return { base, ledgerId: sep === -1 ? "main" : key.slice(sep + 2) };
}

const parseList = (raw: string | null | undefined): any[] => {
  try { const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

const safeParse = (v: string) => { try { return JSON.parse(v); } catch { return v; } };

// Key-order-independent JSON, so the server's JSONB copy (which reorders object keys) has the
// same checksum as the phone's original.
function canonical(v: any): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

// cyrb53 — fast 53-bit hash; this detects corruption/truncation, it isn't a security measure
function hash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function checksumOf(data: Record<string, string>): string {
  const obj: Record<string, any> = {};
  for (const k of Object.keys(data)) obj[k] = safeParse(data[k]);
  return hash(canonical(obj));
}

function countsOf(data: Record<string, string>): Record<string, LedgerCounts> {
  const out: Record<string, LedgerCounts> = {};
  for (const [key, raw] of Object.entries(data)) {
    const p = parseKey(key);
    if (!p) continue;
    const c = (out[p.ledgerId] ||= { t: 0, a: 0, c: 0, r: 0 });
    const n = parseList(raw).length;
    if (p.base === "app_transactions") c.t = n;
    else if (p.base === "app_accounts") c.a = n;
    else if (p.base === "app_categories") c.c = n;
    else if (p.base === "app_repeat_transactions") c.r = n;
  }
  return out;
}

function sortLedgers(ids: string[]): string[] {
  return Array.from(new Set(ids)).sort((a, c) => (a === "main" ? -1 : c === "main" ? 1 : 0));
}

const isIntact = (b: StoredBackup) => !!b.checksum && checksumOf(b.data) === b.checksum;

// ---- server ---------------------------------------------------------------------------------

function cloudToken(): string | null {
  if (localStorage.getItem("app_premium") !== "true") return null;
  return localStorage.getItem("cloud_token");
}

export function cloudEnabled(): boolean {
  return !!cloudToken();
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function fetchServerList(token: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE}/backups`, { headers: auth(token) });
    if (!res.ok) return null;
    return (await res.json()).backups || [];
  } catch { return null; }
}

// Full set from the server, converted back to the phone's shape; null unless it passes its checksum
async function fetchServerBackup(id: string, token: string): Promise<StoredBackup | null> {
  try {
    const res = await fetch(`${API_BASE}/backups/${encodeURIComponent(id)}`, { headers: auth(token) });
    if (!res.ok) return null;
    const row = await res.json();
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(row.data || {})) data[k] = typeof v === "string" ? v : JSON.stringify(v);
    const b: StoredBackup = {
      id: row.id,
      createdAt: new Date(row.created_at).toISOString(),
      data,
      checksum: row.checksum,
      counts: row.counts || countsOf(data),
      uploaded: true,
    };
    return isIntact(b) ? b : null;
  } catch { return null; }
}

// Upload, then download and compare — only a verified copy counts as "on Cloud"
async function uploadVerified(b: StoredBackup, token: string): Promise<boolean> {
  try {
    const body: Record<string, any> = {};
    for (const [k, v] of Object.entries(b.data)) body[k] = safeParse(v);
    const res = await fetch(`${API_BASE}/backups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth(token) },
      body: JSON.stringify({
        id: b.id, created_at: b.createdAt, device: Capacitor.getPlatform(),
        checksum: b.checksum, counts: b.counts, data: body,
      }),
    });
    if (!res.ok) return false;
    const back = await fetchServerBackup(b.id, token);
    return !!back && back.checksum === b.checksum;
  } catch { return false; }
}

async function deleteOnServer(id: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/backups/${encodeURIComponent(id)}`, { method: "DELETE", headers: auth(token) });
    return res.ok;
  } catch { return false; }
}

function pendingServerDeletes(): string[] {
  try { return JSON.parse(localStorage.getItem(PENDING_SERVER_DELETES) || "[]"); } catch { return []; }
}
function setPendingServerDeletes(ids: string[]) {
  if (ids.length) localStorage.setItem(PENDING_SERVER_DELETES, JSON.stringify(ids.slice(-20)));
  else localStorage.removeItem(PENDING_SERVER_DELETES);
}

// Upload sets the server doesn't have a verified copy of yet; finish deletes that failed earlier.
let cloudSyncRunning: Promise<void> | null = null;
export function syncBackupsToCloud(): Promise<void> {
  // one run at a time (resume + back-online + Settings can all ask together)
  if (!cloudSyncRunning) {
    cloudSyncRunning = syncBackupsToCloudNow().finally(() => { cloudSyncRunning = null; });
  }
  return cloudSyncRunning;
}

async function syncBackupsToCloudNow(): Promise<void> {
  const token = cloudToken();
  if (!token) return;
  let changed = false;
  const left: string[] = [];
  for (const id of pendingServerDeletes()) if (!(await deleteOnServer(id, token))) left.push(id);
  setPendingServerDeletes(left);
  for (const b of await getAllLocal()) {
    if (!b.uploaded && isIntact(b) && (await uploadVerified(b, token))) {
      await putLocal({ ...b, uploaded: true });
      changed = true;
    }
  }
  // Let an open backup box drop the italics
  if (changed) window.dispatchEvent(new CustomEvent("backups-updated"));
}

// ---- public API -----------------------------------------------------------------------------

export async function listBackups(): Promise<BackupEntry[]> {
  const byId = new Map<string, BackupEntry>();
  for (const b of await getAllLocal()) {
    byId.set(b.id, {
      id: b.id, createdAt: b.createdAt, counts: b.counts || countsOf(b.data),
      ledgerIds: sortLedgers(Object.keys(b.data).map((k) => parseKey(k)?.ledgerId || "").filter(Boolean)),
      onDevice: true, onCloud: !!b.uploaded,
    });
  }
  const token = cloudToken();
  const pendingDel = new Set(pendingServerDeletes());
  const server = token ? await fetchServerList(token) : null;
  for (const s of server || []) {
    if (pendingDel.has(s.id)) continue;
    const cur = byId.get(s.id);
    if (cur) {
      // Server row exists but the phone hasn't verified it yet → don't claim "on Cloud" until it has
      continue;
    }
    byId.set(s.id, {
      id: s.id, createdAt: new Date(s.created_at).toISOString(), counts: s.counts || {},
      ledgerIds: sortLedgers(s.ledger_ids || []), onDevice: false, onCloud: true,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// The set exists once the PHONE copy is written and verified (read back, checksum matches);
// otherwise nothing is kept and "incomplete" is thrown, so the user simply creates it again.
// The server copy is separate: if it can't be uploaded and verified now (offline, server error,
// server copy incomplete) the set stays "not on Cloud yet" — shown in italics — and is uploaded
// again automatically (app resume, back online, opening Settings) until it verifies.
export async function createBackup(): Promise<void> {
  if ((await listBackups()).length >= MAX_BACKUPS) throw new Error("max");
  const token = cloudToken();
  const id = `bk_${Date.now()}`;
  let backup: StoredBackup;
  try {
    // Cloud on → bring every ledger up to date first (best effort: offline still backs up the phone)
    if (token) { try { await syncAll(token); } catch {} }

    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !parseKey(key)) continue;
      const v = localStorage.getItem(key);
      if (v !== null) data[key] = v;
    }
    if (!data["app_transactions"] && !data["app_accounts"] && !data["app_categories"]) throw new Error("empty");
    backup = {
      id, createdAt: new Date().toISOString(),
      data, checksum: checksumOf(data), counts: countsOf(data), uploaded: false,
    };
    await putLocal(backup);
    const stored = await getLocal(id); // read back what the phone actually stored
    if (!stored || !isIntact(stored) || stored.checksum !== backup.checksum) throw new Error("verify");
  } catch {
    await idb("readwrite", (s) => s.delete(id)).catch(() => {});
    throw new Error("incomplete");
  }

  if (token && (await uploadVerified(backup, token))) await putLocal({ ...backup, uploaded: true });
}

// Deleted on the phone AND on the server (server delete queued if offline).
export async function deleteBackup(id: string): Promise<void> {
  await idb("readwrite", (s) => s.delete(id));
  const token = cloudToken();
  if (!token || !(await deleteOnServer(id, token))) {
    setPendingServerDeletes(Array.from(new Set([...pendingServerDeletes(), id])));
  }
}

function sameRecord(a: any, b: any): boolean {
  const strip = (o: any) => JSON.stringify(Object.keys(o).sort().filter((k) => k !== "updated_at" && k !== "source" && k !== "synced_at").map((k) => [k, o[k]]));
  return strip(a) === strip(b);
}

// Phone copy first; server copy if the phone has none or its copy fails the check.
async function loadForRestore(id: string): Promise<StoredBackup> {
  const local = await getLocal(id).catch(() => undefined);
  if (local && isIntact(local)) return local;
  const token = cloudToken();
  const remote = token ? await fetchServerBackup(id, token) : null;
  if (remote) {
    await putLocal(remote).catch(() => {}); // keep a phone copy from now on
    return remote;
  }
  throw new Error(local ? "corrupt" : "not found");
}

export async function restoreBackup(id: string): Promise<void> {
  const backup = await loadForRestore(id);

  // Ledgers covered by the backup. Ledgers created after it are left as they are.
  const ledgers = new Set<string>();
  for (const key of Object.keys(backup.data)) {
    const p = parseKey(key);
    if (p) ledgers.add(p.ledgerId);
  }

  // Compute every write first, then apply them all (with rollback) — never half a restore.
  const now = new Date().toISOString();
  const writes = new Map<string, string>();
  for (const ledgerId of ledgers) {
    // Tombstones for records that exist now but not in the backup.
    const pKey = lk("app_pending_deletes", ledgerId);
    const pending = parseList(localStorage.getItem(pKey));
    const has = (type: string, rid: string) => pending.some((p) => p._type === type && p.id === rid);
    for (const [base, type] of [["app_transactions", "transaction"], ["app_accounts", "account"], ["app_categories", "category"]] as const) {
      const key = lk(base, ledgerId);
      const keep = new Set(parseList(backup.data[key]).map((i) => i?.id));
      for (const item of parseList(localStorage.getItem(key))) {
        if (item?.id && !keep.has(item.id) && !has(type, item.id)) pending.push({ ...item, _type: type, deleted_at: now });
      }
    }
    writes.set(pKey, JSON.stringify(pending));

    const rKey = lk("app_repeat_transactions", ledgerId);
    const keepR = new Set(parseList(backup.data[rKey]).map((i) => i?.id));
    const prKey = lk("app_pending_deletes_repeats", ledgerId);
    const pendR = parseList(localStorage.getItem(prKey));
    for (const item of parseList(localStorage.getItem(rKey))) {
      if (item?.id && !keepR.has(item.id) && item.source !== "local" && !pendR.some((p) => p.id === item.id)) {
        pendR.push({ ...item, deleted_at: now });
      }
    }
    writes.set(prKey, JSON.stringify(pendR));

    // The data itself. A list the backup didn't have (e.g. no repeats yet) is emptied.
    for (const base of DATA_BASES) {
      const key = lk(base, ledgerId);
      const value = backup.data[key];
      if (value === undefined) {
        if (base !== "app_settings") writes.set(key, "[]");
        continue;
      }
      if (base === "app_settings") {
        // Newer stamp so the restored settings win over the server's on the next sync
        const s = safeParse(value);
        writes.set(key, s && typeof s === "object" ? JSON.stringify({ ...s, updatedAt: now }) : value);
        continue;
      }
      // Anything that differs from what's here now (or is gone now) is stamped with the restore
      // time — the backup's old updated_at would lose to a newer server copy or delete.
      const current = new Map(parseList(localStorage.getItem(key)).filter((i) => i?.id).map((i) => [i.id, i]));
      const restored = parseList(value).map((item) => {
        if (!item?.id) return item;
        const cur = current.get(item.id);
        return cur && sameRecord(cur, item) ? cur : { ...item, updated_at: now };
      });
      writes.set(key, JSON.stringify(restored));
    }
  }

  const previous = new Map<string, string | null>();
  for (const key of writes.keys()) previous.set(key, localStorage.getItem(key));
  try {
    for (const [key, value] of writes) localStorage.setItem(key, value);
  } catch (e) {
    for (const [key, value] of previous) {
      try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {}
    }
    throw e;
  }
}
