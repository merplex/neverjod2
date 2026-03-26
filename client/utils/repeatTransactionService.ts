export type RepeatOption =
  | "daily"          // every day
  | "weekly"         // every week (same weekday)
  | "biweekly"       // every 2 weeks
  | "monthly"        // every month, same day
  | "bimonthly"      // every 2 months
  | "quarterly"      // every 3 months
  | "semiannual"     // every 6 months
  | "annual";        // every year

export const REPEAT_OPTIONS: { value: RepeatOption; label: string; desc: string }[] = [
  { value: "daily",      label: "ทุกวัน",          desc: "Every day" },
  { value: "weekly",     label: "ทุกสัปดาห์",      desc: "Every week, same weekday" },
  { value: "biweekly",   label: "ทุก 2 สัปดาห์",   desc: "Every 2 weeks" },
  { value: "monthly",    label: "ทุกเดือน",         desc: "Every month, same date" },
  { value: "bimonthly",  label: "ทุก 2 เดือน",      desc: "Every 2 months" },
  { value: "quarterly",  label: "ทุก 3 เดือน",      desc: "Quarterly" },
  { value: "semiannual", label: "ทุก 6 เดือน",      desc: "Every 6 months" },
  { value: "annual",     label: "ทุกปี",            desc: "Every year, same date" },
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
}

const KEY = "app_repeat_transactions";

export function getRepeatTransactions(): RepeatTransaction[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveRepeatTransactions(list: RepeatTransaction[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}
export function addRepeatTransaction(rt: RepeatTransaction) {
  const list = getRepeatTransactions();
  list.push(rt);
  saveRepeatTransactions(list);
}
export function deleteRepeatTransaction(id: string) {
  saveRepeatTransactions(getRepeatTransactions().filter((r) => r.id !== id));
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

      // create the transaction
      const txns = JSON.parse(localStorage.getItem("app_transactions") || "[]");
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
      localStorage.setItem("app_transactions", JSON.stringify(txns));

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
