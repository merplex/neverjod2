// Push to the cloud right after every user action (add / edit / delete a transaction, account,
// category, repeat, settings…) instead of waiting for an app resume or ledger switch.
//
// Every such action ends in a localStorage write to one of the ledger data keys, so we hook
// Storage.setItem/removeItem once instead of touching each of the many write paths. Writes made
// by the sync engine itself run inside quietly() and are ignored (otherwise: push → write → push…).
// Pushes are debounced per ledger, so a burst (e.g. a transfer writing two ledgers, or a delete
// writing the list + its tombstone) becomes one request. Only changed records are sent (see
// syncShadow.ts), so this is cheap. If offline, the change stays dirty and goes up next time.

import { isQuiet } from "./syncQuiet";
import { syncAll, syncPush } from "./syncService";
import { lk } from "./ledgerStorage";

const DATA_KEYS = new Set([
  "app_transactions",
  "app_accounts",
  "app_categories",
  "app_repeat_transactions",
  "app_pending_deletes",
  "app_pending_deletes_repeats",
  "app_settings",
]);

const DEBOUNCE_MS = 1000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let installed = false;

// "app_transactions" → main, "app_transactions__abc" → abc (see lk()).
function ledgerOf(key: string): string | null {
  const sep = key.indexOf("__");
  const base = sep === -1 ? key : key.slice(0, sep);
  if (!DATA_KEYS.has(base)) return null;
  return sep === -1 ? "main" : key.slice(sep + 2);
}

function enabled(): boolean {
  return !!localStorage.getItem("cloud_token")
    && localStorage.getItem("app_premium") === "true"
    && localStorage.getItem("sync_auto_enabled") === "true";
}

function run(ledgerId: string) {
  timers.delete(ledgerId);
  const token = localStorage.getItem("cloud_token");
  if (!token || !enabled()) return;
  const p = localStorage.getItem(lk("last_sync_at", ledgerId))
    // Never pulled this ledger yet → do a full sync first (push alone can't know what the
    // server already has; see the first-sync rule in syncPush).
    ? syncPush(token, false, undefined, ledgerId)
    : syncAll(token);
  p.then(() => {
    localStorage.setItem("sync_direction", "client");
    localStorage.setItem("last_client_sync_at", new Date().toISOString());
    window.dispatchEvent(new CustomEvent("sync-updated"));
  }).catch(() => {});
}

function schedule(ledgerId: string) {
  const t = timers.get(ledgerId);
  if (t) clearTimeout(t);
  timers.set(ledgerId, setTimeout(() => run(ledgerId), DEBOUNCE_MS));
}

// Send anything still waiting in the debounce now (e.g. the app is going to the background).
export function flushAutoPush() {
  for (const [ledgerId, t] of Array.from(timers)) {
    clearTimeout(t);
    run(ledgerId);
  }
}

export function installAutoPush() {
  if (installed || typeof Storage === "undefined") return;
  installed = true;
  const proto = Storage.prototype;
  const origSet = proto.setItem;
  const origRemove = proto.removeItem;
  const onWrite = (storage: Storage, key: string) => {
    if (storage !== window.localStorage || isQuiet()) return;
    const ledgerId = ledgerOf(String(key));
    if (ledgerId && enabled()) schedule(ledgerId);
  };
  proto.setItem = function (this: Storage, key: string, value: string) {
    origSet.call(this, key, value);
    onWrite(this, key);
  };
  proto.removeItem = function (this: Storage, key: string) {
    origRemove.call(this, key);
    onWrite(this, key);
  };
}
