// On-device backups (max 3), stored in this app's IndexedDB — on the phone itself, not the cloud.
// IndexedDB is used instead of localStorage because localStorage has a small shared quota (~5MB)
// that the live data already uses; three full copies could overflow it.
//
// A backup holds every ledger's data: transactions, accounts, categories, repeats, settings.
// Restore puts that data back as the current truth and makes sync agree:
//  - restored records differ from what sync last saw → they're pushed (stamped now), and
//  - records that exist now but not in the backup get delete tombstones, so the server (and
//    other devices) drop them too instead of them coming back on the next pull.

import { markDeleted } from "./syncService";
import { lk } from "./ledgerStorage";

export const MAX_BACKUPS = 3;

export interface DeviceBackup {
  id: string;
  createdAt: string; // ISO
  data: Record<string, string>; // localStorage key → raw value
}

const DB_NAME = "neverjod_backups";
const STORE = "backups";
const DATA_BASES = ["app_transactions", "app_accounts", "app_categories", "app_repeat_transactions", "app_settings"];

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

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
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

// "app_transactions" → main, "app_transactions__abc" → abc
function parseKey(key: string): { base: string; ledgerId: string } | null {
  const sep = key.indexOf("__");
  const base = sep === -1 ? key : key.slice(0, sep);
  if (!DATA_BASES.includes(base)) return null;
  return { base, ledgerId: sep === -1 ? "main" : key.slice(sep + 2) };
}

export async function listBackups(): Promise<DeviceBackup[]> {
  const all = await tx<DeviceBackup[]>("readonly", (s) => s.getAll() as IDBRequest<DeviceBackup[]>);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createBackup(): Promise<DeviceBackup> {
  const existing = await listBackups();
  if (existing.length >= MAX_BACKUPS) throw new Error("max");
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !parseKey(key)) continue;
    const v = localStorage.getItem(key);
    if (v !== null) data[key] = v;
  }
  const backup: DeviceBackup = { id: `bk_${Date.now()}`, createdAt: new Date().toISOString(), data };
  await tx("readwrite", (s) => s.put(backup));
  return backup;
}

export async function deleteBackup(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

function sameRecord(a: any, b: any): boolean {
  const strip = (o: any) => JSON.stringify(Object.keys(o).sort().filter((k) => k !== "updated_at" && k !== "source" && k !== "synced_at").map((k) => [k, o[k]]));
  return strip(a) === strip(b);
}

const parseList = (raw: string | null | undefined): any[] => {
  try { const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

export async function restoreBackup(id: string): Promise<void> {
  const backup = await tx<DeviceBackup | undefined>("readonly", (s) => s.get(id) as IDBRequest<DeviceBackup | undefined>);
  if (!backup) throw new Error("not found");

  // Ledgers covered by the backup. Ledgers created after it are left as they are.
  const ledgers = new Set<string>();
  for (const key of Object.keys(backup.data)) {
    const p = parseKey(key);
    if (p) ledgers.add(p.ledgerId);
  }

  const now = new Date().toISOString();
  for (const ledgerId of ledgers) {
    // Tombstones for records that exist now but not in the backup.
    for (const [base, type] of [["app_transactions", "transaction"], ["app_accounts", "account"], ["app_categories", "category"]] as const) {
      const key = lk(base, ledgerId);
      const keep = new Set(parseList(backup.data[key]).map((i) => i?.id));
      for (const item of parseList(localStorage.getItem(key))) {
        if (item?.id && !keep.has(item.id)) markDeleted(type, item, ledgerId);
      }
    }
    const rKey = lk("app_repeat_transactions", ledgerId);
    const keepR = new Set(parseList(backup.data[rKey]).map((i) => i?.id));
    const pendR = parseList(localStorage.getItem(lk("app_pending_deletes_repeats", ledgerId)));
    for (const item of parseList(localStorage.getItem(rKey))) {
      if (item?.id && !keepR.has(item.id) && item.source !== "local" && !pendR.some((p) => p.id === item.id)) {
        pendR.push({ ...item, deleted_at: now });
      }
    }
    localStorage.setItem(lk("app_pending_deletes_repeats", ledgerId), JSON.stringify(pendR));

    // Put the data back. A key the backup didn't have (e.g. no repeats yet) is emptied.
    for (const base of DATA_BASES) {
      const key = lk(base, ledgerId);
      const value = backup.data[key];
      if (value !== undefined) {
        // Settings: newer stamp so the restored settings win over the server's on next sync.
        if (base === "app_settings") {
          try { localStorage.setItem(key, JSON.stringify({ ...JSON.parse(value), updatedAt: now })); continue; } catch {}
        }
        // Records: anything that differs from what's here now (or is gone now) is stamped with the
        // restore time. Keeping the backup's old updated_at would lose to a newer server copy or
        // delete, and the restored version would never reach the server.
        const current = new Map(parseList(localStorage.getItem(key)).filter((i) => i?.id).map((i) => [i.id, i]));
        const restored = parseList(value).map((item) => {
          if (!item?.id) return item;
          const cur = current.get(item.id);
          return cur && sameRecord(cur, item) ? cur : { ...item, updated_at: now };
        });
        localStorage.setItem(key, JSON.stringify(restored));
      } else if (base !== "app_settings") {
        localStorage.setItem(key, "[]");
      }
    }
  }
}
