export type RepeatOption =
  | "daily"          // every day
  | "weekly"         // every week (same weekday)
  | "biweekly"       // every 2 weeks
  | "monthly"        // every month, same day
  | "bimonthly"      // every 2 months
  | "quarterly"      // every 3 months
  | "quadmonthly"    // every 4 months
  | "semiannual"     // every 6 months
  | "annual";        // every year

export const REPEAT_OPTIONS: { value: RepeatOption; label: string; labelEn: string; desc: string }[] = [
  { value: "daily",        label: "ทุกวัน",          labelEn: "Everyday",    desc: "Every day" },
  { value: "weekly",       label: "ทุกสัปดาห์",      labelEn: "Every week",  desc: "Every week, same weekday" },
  { value: "biweekly",     label: "ทุก 2 สัปดาห์",   labelEn: "2 weekly",    desc: "Every 2 weeks, same weekday" },
  { value: "monthly",      label: "ทุกเดือน",         labelEn: "Monthly",     desc: "Every month, same date" },
  { value: "bimonthly",    label: "ทุก 2 เดือน",      labelEn: "2 monthly",   desc: "Every 2 months" },
  { value: "quarterly",    label: "ทุก 3 เดือน",      labelEn: "3 monthly",   desc: "Every 3 months" },
  { value: "quadmonthly",  label: "ทุก 4 เดือน",      labelEn: "4 monthly",   desc: "Every 4 months" },
  { value: "semiannual",   label: "ทุก 6 เดือน",      labelEn: "6 monthly",   desc: "Every 6 months" },
  { value: "annual",       label: "ทุกปี",            labelEn: "Yearly",      desc: "Every year, same date" },
];

export interface RepeatTransaction {
  id: string;
  categoryId: string;
  categoryName: string;
  accountId: string;
  accountName: string;
  amount: number;
  description: string;
  categoryType: "expense" | "income";

  repeatOption: RepeatOption;
  dayOfMonth: number;    // original day (for clamping in short months)
  weekday: number;       // 0-6, for weekly/biweekly
  monthOfYear: number;   // 0-11, for annual

  time: string;          // HH:MM
  startDate: string;     // ISO — date of first transaction
  nextDue: string;       // ISO — next scheduled execution
  lastExecuted?: string;
  source?: "local" | "server";  // "local" = not yet synced; "server" = synced

  // Transfer-specific fields
  isTransfer?: boolean;
  fromAccountId?: string;
  fromAccountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  toLedgerId?: string;    // cross-ledger target (future)
  toLedgerName?: string;  // cross-ledger target name (future)
}

import { lk } from "./ledgerStorage";

export function getRepeatTransactions(): RepeatTransaction[] {
  try { return JSON.parse(localStorage.getItem(lk("app_repeat_transactions")) || "[]"); } catch { return []; }
}
export function saveRepeatTransactions(list: RepeatTransaction[]) {
  localStorage.setItem(lk("app_repeat_transactions"), JSON.stringify(list));
}
export function addRepeatTransaction(rt: RepeatTransaction) {
  const list = getRepeatTransactions();
  list.push({ ...rt, source: rt.source ?? "local" });
  saveRepeatTransactions(list);
}
export function deleteRepeatTransaction(id: string) {
  const list = getRepeatTransactions();
  const item = list.find((r) => r.id === id);
  // If already synced to server, record tombstone (full item) so next push can DELETE on server
  if (item && item.source !== "local") {
    const pending: any[] = JSON.parse(localStorage.getItem(lk("app_pending_deletes_repeats")) || "[]");
    if (!pending.find((p: any) => p.id === id)) {
      pending.push({ ...item, deleted_at: new Date().toISOString() });
      localStorage.setItem(lk("app_pending_deletes_repeats"), JSON.stringify(pending));
    }
  }
  saveRepeatTransactions(list.filter((r) => r.id !== id));
}
export function updateRepeatTransaction(id: string, updates: Partial<Pick<RepeatTransaction, "amount" | "description" | "repeatOption">>) {
  const list = getRepeatTransactions();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...updates };
  if (updates.repeatOption) {
    list[idx].nextDue = buildInitialNextDue(list[idx]);
  }
  saveRepeatTransactions(list);
}

export function updateRepeatTransfer(
  id: string,
  updates: {
    fromAccountId: string;
    fromAccountName: string;
    toAccountId: string;
    toAccountName: string;
    amount: number;
    repeatOption: RepeatOption;
    date: Date;
    time: string;
    toLedgerId?: string;
    toLedgerName?: string;
  }
) {
  const list = getRepeatTransactions();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return;
  list[idx] = {
    ...list[idx],
    fromAccountId: updates.fromAccountId,
    fromAccountName: updates.fromAccountName,
    toAccountId: updates.toAccountId,
    toAccountName: updates.toAccountName,
    accountId: updates.fromAccountId,
    accountName: updates.fromAccountName,
    categoryName: updates.toAccountName,
    amount: updates.amount,
    repeatOption: updates.repeatOption,
    dayOfMonth: updates.date.getDate(),
    weekday: updates.date.getDay(),
    monthOfYear: updates.date.getMonth(),
    time: updates.time,
    startDate: updates.date.toISOString(),
    ...(updates.toLedgerId ? { toLedgerId: updates.toLedgerId, toLedgerName: updates.toLedgerName } : { toLedgerId: undefined, toLedgerName: undefined }),
  };
  list[idx].nextDue = buildInitialNextDue(list[idx]);
  saveRepeatTransactions(list);
}

/** Last valid day of a given month (handles Feb 28/29, 30-day months). */
function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Clamp day to valid range for the given year+month. */
function clampDay(year: number, month: number, day: number) {
  return Math.min(day, lastDayOfMonth(year, month));
}

/** Add months safely, returning the correct Date. */
function addMonths(from: Date, months: number, targetDay: number): Date {
  let y = from.getFullYear();
  let m = from.getMonth() + months;
  y += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  const d = clampDay(y, m, targetDay);
  const result = new Date(y, m, d);
  return result;
}

/** Calculate the next due date after `from`. */
export function calcNextDue(rt: RepeatTransaction, from: Date): Date {
  const [h, min] = rt.time.split(":").map(Number);
  let next: Date;

  switch (rt.repeatOption) {
    case "daily":
      next = new Date(from);
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next = new Date(from);
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next = new Date(from);
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next = addMonths(from, 1, rt.dayOfMonth);
      break;
    case "bimonthly":
      next = addMonths(from, 2, rt.dayOfMonth);
      break;
    case "quarterly":
      next = addMonths(from, 3, rt.dayOfMonth);
      break;
    case "quadmonthly":
      next = addMonths(from, 4, rt.dayOfMonth);
      break;
    case "semiannual":
      next = addMonths(from, 6, rt.dayOfMonth);
      break;
    case "annual":
      next = addMonths(from, 12, rt.dayOfMonth);
      break;
    default:
      next = addMonths(from, 1, rt.dayOfMonth);
  }
  next.setHours(h, min, 0, 0);
  return next;
}

/** Build the initial nextDue — if startDate is today/future use it, else advance to >= today. */
export function buildInitialNextDue(rt: Omit<RepeatTransaction, "nextDue">): string {
  const [h, m] = rt.time.split(":").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(rt.startDate);
  next.setHours(h, m, 0, 0);

  let safety = 0;
  while (
    new Date(next.getFullYear(), next.getMonth(), next.getDate()) < today &&
    safety < 400
  ) {
    safety++;
    next = calcNextDue({ ...rt, nextDue: "" } as RepeatTransaction, next);
  }
  return next.toISOString();
}

/** Check all repeat transactions; create any that are due; update nextDue. Returns true if any were created. */
export function checkAndExecuteRepeats(): boolean {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const repeats = getRepeatTransactions();
  let changed = false;

  for (const rt of repeats) {
    let nextDue = new Date(rt.nextDue);
    let nextDueDay = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());

    let safety = 0;
    while (nextDueDay <= todayStart && safety < 400) {
      safety++;

      // create the transaction(s)
      const txns = JSON.parse(localStorage.getItem(lk("app_transactions")) || "[]");
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      if (rt.isTransfer) {
        const transferRef = `transfer_${id}`;
        txns.unshift({
          id: `${id}_out`,
          categoryId: "transfer_out",
          accountId: rt.fromAccountId || rt.accountId,
          amount: rt.amount,
          description: `→ ${rt.toAccountName}`,
          date: nextDue.toISOString(),
          time: rt.time,
          isTransfer: true,
          isRepeat: true,
          repeatId: rt.id,
          transferRef,
          ...(rt.toLedgerName ? { ledgerName: rt.toLedgerName } : {}),
        });
        txns.unshift({
          id: `${id}_in`,
          categoryId: "transfer_in",
          accountId: rt.toAccountId || "",
          amount: rt.amount,
          description: `← ${rt.fromAccountName || rt.accountName}`,
          date: nextDue.toISOString(),
          time: rt.time,
          isTransfer: true,
          isRepeat: true,
          repeatId: rt.id,
          transferRef,
        });
      } else {
        txns.unshift({
          id,
          categoryId: rt.categoryId,
          accountId: rt.accountId,
          amount: rt.amount,
          description: rt.description || "",
          date: nextDue.toISOString(),
          time: rt.time,
          repeatId: rt.id,
          isRepeat: true,
        });
      }
      localStorage.setItem(lk("app_transactions"), JSON.stringify(txns));

      rt.lastExecuted = nextDue.toISOString();
      nextDue = calcNextDue(rt, nextDue);
      nextDueDay = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
      changed = true;
    }
    rt.nextDue = nextDue.toISOString();
  }

  if (changed) saveRepeatTransactions(repeats);
  return changed;
}
