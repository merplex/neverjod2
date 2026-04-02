// Ledger-aware localStorage helper
// - Main ledger uses bare keys (backward-compatible with existing data)
// - Other ledgers use key__<ledgerId> format

export function getActiveLedgerId(): string {
  return localStorage.getItem("active_ledger_id") || "main";
}

export function setActiveLedgerId(id: string) {
  localStorage.setItem("active_ledger_id", id);
}

// Prefix key with ledger ID.
// main ledger → bare key (no prefix, backward-compat)
// other ledger → "<key>__<ledgerId>"
export function lk(key: string, ledgerId?: string): string {
  const id = ledgerId ?? getActiveLedgerId();
  if (id === "main") return key;
  return `${key}__${id}`;
}

// Get all ledger-scoped keys for a given ledger (useful for switching)
export function getLedgerKeys(ledgerId: string) {
  return {
    categories:           lk("app_categories",              ledgerId),
    accounts:             lk("app_accounts",                ledgerId),
    transactions:         lk("app_transactions",            ledgerId),
    repeatTransactions:   lk("app_repeat_transactions",     ledgerId),
    settings:             lk("app_settings",                ledgerId),
    pendingDeletes:       lk("app_pending_deletes",         ledgerId),
    pendingDeletesRepeats:lk("app_pending_deletes_repeats", ledgerId),
    lastSyncAt:           lk("last_sync_at",                ledgerId),
    lastPushAt:           lk("last_push_at",                ledgerId),
  };
}
