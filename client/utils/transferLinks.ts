// Restore the link between the two legs of a transfer when it has been lost.
//
// A transfer's legs know each other through local-only fields: isTransfer, transferRef and, for a
// transfer between two ledgers, pairLedgerId/ledgerName. Servers before the `extra` column never
// stored them, so a device whose data came from the cloud (new phone, reinstall) has legs that
// don't know their pair: editing or deleting one leg leaves the other — often in another ledger —
// unchanged.
//
// The pair can be recovered exactly from the ids, which every app version has generated the same
// way:
//   TransferModal:         `${N}_transfer_out`  ↔  `${N + 1}_transfer_in`   transferRef `transfer_${N}`
//   repeat transfer:       `${id}_out`          ↔  `${id}_in`               transferRef `transfer_${id}`
// A leg is only repaired when its pair is actually found, and existing values are never replaced.
// The repaired legs are then pushed like any edit, so the server (and other devices) get the link.

import { lk } from "./ledgerStorage";

const MAIN_NAME = "Main"; // the main ledger is called "Main" in every language

function ledgerIds(): string[] {
  const ids = new Set<string>(["main"]);
  try { for (const l of JSON.parse(localStorage.getItem("app_ledgers") || "[]")) if (l?.id) ids.add(l.id); } catch {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("app_transactions__")) ids.add(k.slice("app_transactions__".length));
  }
  return Array.from(ids);
}

function ledgerName(id: string): string {
  if (id === "main") return MAIN_NAME;
  try {
    const l = (JSON.parse(localStorage.getItem("app_ledgers") || "[]") as any[]).find((x) => x?.id === id);
    return l?.name || "";
  } catch { return ""; }
}

// [transferRef, id of the other leg] derived from a leg's id, or null if it doesn't follow a known pattern
function pairOf(t: any): [string, string] | null {
  const id = String(t.id);
  let m = id.match(/^(\d+)_transfer_(out|in)$/);
  if (m) {
    const n = Number(m[1]);
    return m[2] === "out"
      ? [`transfer_${n}`, `${n + 1}_transfer_in`]
      : [`transfer_${n - 1}`, `${n - 1}_transfer_out`];
  }
  m = id.match(/^(.+)_(out|in)$/);
  if (m) return [`transfer_${m[1]}`, `${m[1]}_${m[2] === "out" ? "in" : "out"}`];
  return null;
}

/** Returns true if any leg was repaired. */
export function repairTransferLinks(): boolean {
  const ids = ledgerIds();
  const lists = new Map<string, any[]>();
  const where = new Map<string, string>(); // txn id → ledger id
  for (const L of ids) {
    let list: any[] = [];
    try { list = JSON.parse(localStorage.getItem(lk("app_transactions", L)) || "[]"); } catch {}
    if (!Array.isArray(list)) list = [];
    lists.set(L, list);
    for (const t of list) if (t?.id && (t.categoryId === "transfer_in" || t.categoryId === "transfer_out")) where.set(String(t.id), L);
  }

  const changedLedgers = new Set<string>();
  for (const [L, list] of lists) {
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (!t?.id || (t.categoryId !== "transfer_in" && t.categoryId !== "transfer_out")) continue;
      const p = pairOf(t);
      if (!p) continue;
      const [ref, pairId] = p;
      const pairL = where.get(pairId);
      if (!pairL) continue; // pair not found → don't guess
      const cross = pairL !== L;
      const fix: any = {};
      if (!t.isTransfer) fix.isTransfer = true;
      if (!t.transferRef) fix.transferRef = ref;
      if (cross && !t.pairLedgerId) fix.pairLedgerId = pairL;
      if (cross && !t.ledgerName) { const n = ledgerName(pairL); if (n) fix.ledgerName = n; }
      if (Object.keys(fix).length) {
        list[i] = { ...t, ...fix };
        changedLedgers.add(L);
      }
    }
  }

  for (const L of changedLedgers) localStorage.setItem(lk("app_transactions", L), JSON.stringify(lists.get(L)));
  return changedLedgers.size > 0;
}
