// Per-record change tracking for sync ("shadow" of what the server last agreed with).
//
// For every synced record we remember [hash of its server-stored fields, its updated_at] as of
// the last successful push or pull. A record whose current hash differs from the shadow is
// "dirty" — the user changed it since the last sync — and only dirty records are pushed.
//
// Each dirty record keeps its OWN action timestamp (updated_at set when the user edited it), so
// the server's last-write-wins compares when things were actually changed, not when they happened
// to be pushed. Write paths that change a record without stamping updated_at are still caught by
// the hash; such a change is stamped with the push time.
//
// Ledgers synced before this existed have no shadow yet → "legacy" mode: the next push sends
// everything (the old behaviour) and creates the shadow from what it sent.

import { lk } from "./ledgerStorage";

export type Kind = "t" | "a" | "c" | "r"; // transactions, accounts, categories, repeats
type Entry = [hash: string, at: string];
export type Shadow = Record<Kind, Record<string, Entry>>;

const KEY = "app_sync_shadow";

export function loadShadow(ledgerId: string): Shadow | null {
  try {
    const raw = localStorage.getItem(lk(KEY, ledgerId));
    if (!raw) return null;
    const s = JSON.parse(raw);
    return { t: s.t || {}, a: s.a || {}, c: s.c || {}, r: s.r || {} };
  } catch { return null; }
}

export function saveShadow(ledgerId: string, s: Shadow) {
  localStorage.setItem(lk(KEY, ledgerId), JSON.stringify(s));
}

export function emptyShadow(): Shadow {
  return { t: {}, a: {}, c: {}, r: {} };
}

// FNV-1a 32-bit, base36 — short, stable, good enough to detect edits.
function fnv(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const num = (v: any) => (v === null || v === undefined || v === "" ? null : Number(v) || 0);
const str = (v: any) => (v === null || v === undefined || v === "" ? null : String(v));
const iso = (v: any) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
};

// Only the fields the server stores — local-only fields (isTransfer, transferRef, pairLedgerId,
// source…) never round-trip, so they must not make a record look changed.
// Accepts both the local (camelCase) shape and a normalized server item.
export function recordHash(kind: Kind, r: any): string {
  let f: any[];
  switch (kind) {
    case "t":
      f = [str(r.categoryId), str(r.accountId), num(r.amount), str(r.description), iso(r.date), str(r.time),
        str(r.crossLedgerRef ?? r.cross_ledger_ref), !!r.isRepeat, str(r.repeatId),
        str(r.currency), num(r.exchangeRate) || null, num(r.currencyAmount) || null];
      break;
    case "a":
      f = [str(r.name), str(r.type), num(r.startBalance || r.balance || 0), str(r.iconId),
        JSON.stringify(r.keywords || []), num(r.sortOrder ?? r.sort_order), str(r.currency), num(r.exchangeRate) || null];
      break;
    case "c":
      f = [str(r.name), str(r.type), str(r.iconId), JSON.stringify(r.keywords || []), num(r.sortOrder ?? r.sort_order)];
      break;
    case "r":
      f = [str(r.categoryId), str(r.accountId), str(r.categoryName), str(r.accountName), num(r.amount),
        str(r.description), str(r.categoryType), str(r.repeatOption), num(r.dayOfMonth), num(r.weekday),
        num(r.monthOfYear), str(r.time), iso(r.startDate), iso(r.nextDue), iso(r.lastExecuted)];
      break;
  }
  return fnv(JSON.stringify(f));
}

export function isDirty(shadow: Shadow, kind: Kind, rec: any): boolean {
  const e = shadow[kind][rec.id];
  return !e || e[0] !== recordHash(kind, rec);
}

const t = (v: any) => (v ? new Date(v).getTime() || 0 : 0);

// The time a dirty record was changed: its own action stamp if the edit set one after the last
// sync, otherwise "now" (changed by a path that didn't stamp — it still happened after last sync).
export function actionTime(shadow: Shadow, kind: Kind, rec: any, now: string): string {
  const e = shadow[kind][rec.id];
  if (rec.updated_at && (!e || t(rec.updated_at) > t(e[1]))) return new Date(rec.updated_at).toISOString();
  return now;
}

// Pull: should the server's copy replace the local one?
//  - clean local record → yes if the server's is newer than what we last synced
//  - dirty local record (unsynced edit) → only if the server's change is newer than that edit
export function serverWins(shadow: Shadow, kind: Kind, local: any, serverUpdatedAt: any): boolean {
  if (!local) return true;
  const serverT = t(serverUpdatedAt);
  if (isDirty(shadow, kind, local)) {
    return serverT > t(actionTime(shadow, kind, local, new Date().toISOString()));
  }
  const e = shadow[kind][local.id];
  return serverT > Math.max(t(e?.[1]), t(local.updated_at));
}
