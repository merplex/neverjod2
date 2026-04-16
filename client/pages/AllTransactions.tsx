import { getCurrencySymbol } from "../utils/currency";
import { lk } from "../utils/ledgerStorage";
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { ChevronLeft, ArrowUpDown, X, Search, ChevronDown, Plus, ChevronRight } from "lucide-react";
import { getRealTransactionsList } from "../utils/transactionData";
import AddTransactionModal from "../components/AddTransactionModal";
import { useT } from "../hooks/useT";
import { getLang } from "../utils/i18n";

type TimeRange = "custom" | "month" | "all";
type SortOrder = "asc" | "desc";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function CalendarRangePicker({
  rangeStart, rangeEnd, onSelect, onClose,
}: {
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onSelect: (start: Date, end: Date) => void;
  onClose: () => void;
}) {
  const T = useT();
  const lang = getLang();
  const today = startOfDay(new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [picking, setPicking] = useState<"start" | "end">("start");
  const [tempStart, setTempStart] = useState<Date | null>(rangeStart);
  const [tempEnd, setTempEnd] = useState<Date | null>(rangeEnd);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const DAYS = [0, 1, 2, 3, 4, 5, 6].map((i) => T(`day.short.${i}`));

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function handleDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (picking === "start") {
      setTempStart(d);
      setTempEnd(null);
      setPicking("end");
    } else {
      if (tempStart && d < tempStart) {
        setTempStart(d);
        setTempEnd(null);
        setPicking("end");
      } else {
        setTempEnd(d);
        setPicking("start");
      }
    }
  }

  function isInRange(day: number) {
    if (!tempStart || !tempEnd) return false;
    const d = new Date(viewYear, viewMonth, day);
    return d > tempStart && d < tempEnd;
  }
  function isStart(day: number) {
    if (!tempStart) return false;
    return isSameDay(new Date(viewYear, viewMonth, day), tempStart);
  }
  function isEnd(day: number) {
    if (!tempEnd) return false;
    return isSameDay(new Date(viewYear, viewMonth, day), tempEnd);
  }

  const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monthFull = (m: number) => T(`month.full.${MONTH_KEYS[m]}`);
  const monthShort = (m: number) => T(`month.${MONTH_KEYS[m]}`);

  const formatMonthYear = (y: number, m: number) =>
    lang === "zh" ? `${y}年${m + 1}月` : `${monthFull(m)} ${y}`;

  const formatLabel = (d: Date) =>
    lang === "zh"
      ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
      : `${d.getDate()} ${monthShort(d.getMonth())} ${d.getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl p-4 pb-6">
        {/* Range display */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span className={`px-3 py-1.5 rounded-lg ${picking === "start" ? "bg-theme-600 text-white" : "bg-theme-50 text-theme-700"}`}>
              {tempStart ? formatLabel(tempStart) : T("calendar.start")}
            </span>
            <ChevronRight size={16} className="text-slate-400" />
            <span className={`px-3 py-1.5 rounded-lg ${picking === "end" ? "bg-theme-600 text-white" : "bg-theme-50 text-theme-700"}`}>
              {tempEnd ? formatLabel(tempEnd) : T("calendar.end")}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <span className="font-semibold text-slate-800">{formatMonthYear(viewYear, viewMonth)}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid — always 6 rows (42 cells) */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }).map((_, i) => {
            const day = i - firstDayOfWeek + 1;
            if (day < 1 || day > daysInMonth) {
              return <div key={`cell${i}`} className="w-9 h-9 mx-auto" />;
            }
            const start = isStart(day);
            const end = isEnd(day);
            const inRange = isInRange(day);
            return (
              <button
                key={`cell${i}`}
                onClick={() => handleDay(day)}
                className={`aspect-square flex items-center justify-center text-sm font-medium transition-colors rounded-full mx-auto w-9 h-9
                  ${start || end ? "bg-theme-600 text-white" : ""}
                  ${inRange ? "bg-theme-100 text-theme-700 rounded-none" : ""}
                  ${!start && !end && !inRange ? "hover:bg-slate-100 text-slate-700" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Confirm */}
        <button
          disabled={!tempStart || !tempEnd}
          onClick={() => tempStart && tempEnd && onSelect(tempStart, tempEnd)}
          className={`mt-4 w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
            tempStart && tempEnd
              ? "bg-theme-600 text-white hover:bg-theme-700"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {T("calendar.apply")}
        </button>
      </div>
    </div>
  );
}

export default function AllTransactions() {
  const navigate = useNavigate();
  useSwipeBack();
  const T = useT();
  const cur = getCurrencySymbol();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountIdFilter = searchParams.get("accountId");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showSearch, setShowSearch] = useState(!!searchParams.get("search"));
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [showAccountGrid, setShowAccountGrid] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("repeats-updated", handler);
    return () => window.removeEventListener("repeats-updated", handler);
  }, []);

  const storedAccounts = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(lk("app_accounts")) || "[]"); } catch { return []; }
  }, []);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
    else setSearchQuery("");
  }, [showSearch]);

  const allTransactions = useMemo(() => getRealTransactionsList(), [refreshKey]);

  // Running balance per transaction (ascending order, based on start balance + all txns)
  const runningBalances = useMemo(() => {
    const currentBalance: Record<string, number> = {};
    storedAccounts.forEach((acc: any) => { currentBalance[acc.id] = Number(acc.balance) || 0; });
    const asc = [...allTransactions].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id));
    const map: Record<string, number> = {};
    asc.forEach((t) => {
      currentBalance[t.accountId] = (currentBalance[t.accountId] || 0) + (t.type === "income" ? t.amount : -t.amount);
      map[t.id] = currentBalance[t.accountId];
    });
    return map;
  }, [allTransactions, storedAccounts]);

  const selectedAccountName = useMemo(() => {
    if (!accountIdFilter) return T("acc.all_accounts");
    const acc = storedAccounts.find((a: any) => a.id === accountIdFilter);
    if (acc) return acc.name;
    const found = allTransactions.find((t) => t.accountId === accountIdFilter);
    return found?.accountName ?? accountIdFilter;
  }, [accountIdFilter, storedAccounts, allTransactions]);

  const customLabel = useMemo(() => {
    if (!customStart || !customEnd) return T("filter.custom");
    const fmt = (d: Date) => d.getDate() + "/" + (d.getMonth() + 1);
    return `${fmt(customStart)}–${fmt(customEnd)}`;
  }, [customStart, customEnd, T]);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const q = searchQuery.trim().toLowerCase();


    return allTransactions.filter((transaction) => {
      if (accountIdFilter && transaction.accountId !== accountIdFilter) return false;
      if (q) {
        const transferLabel = T("acc.transfer").toLowerCase();
        const repeatLabel = T("txn.repeat").toLowerCase();
        const transferMatch = q === transferLabel && transaction.isTransfer;
        const repeatMatch = q === repeatLabel && transaction.isRepeat;
        if (!transferMatch && !repeatMatch &&
            !transaction.accountName.toLowerCase().includes(q) &&
            !transaction.category.toLowerCase().includes(q) &&
            !transaction.amount.toString().includes(q) &&
            !(transaction.description || "").toLowerCase().includes(q)) return false;
      }
      const transactionDate = new Date(
        transaction.date.getFullYear(),
        transaction.date.getMonth(),
        transaction.date.getDate()
      );

      if (timeRange === "custom") {
        if (!customStart || !customEnd) return true;
        return transactionDate >= customStart && transactionDate <= customEnd;
      } else if (timeRange === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return transactionDate >= monthAgo;
      }
      return true;
    });
  }, [allTransactions, timeRange, searchQuery, accountIdFilter, customStart, customEnd]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateCompare = startOfDay(a.date).getTime() - startOfDay(b.date).getTime();
      if (dateCompare !== 0) {
        return sortOrder === "asc" ? dateCompare : -dateCompare;
      }
      const aTime = a.time.split(":").map(Number);
      const bTime = b.time.split(":").map(Number);
      const aMinutes = aTime[0] * 60 + aTime[1];
      const bMinutes = bTime[0] * 60 + bTime[1];
      return sortOrder === "asc" ? aMinutes - bMinutes : bMinutes - aMinutes;
    });
  }, [filtered, sortOrder]);

  const lang = getLang();
  const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

  const formatGroupDate = (d: Date) => {
    const weekday = T(`day.full.${d.getDay()}`);
    const m = d.getMonth();
    const day = d.getDate();
    if (lang === "zh") return `${weekday}, ${T(`month.full.${MONTH_KEYS[m]}`)}${day}日`;
    if (lang === "th") return `${weekday}, ${T(`month.full.${MONTH_KEYS[m]}`)} ${day}`;
    return `${weekday}, ${T(`month.${MONTH_KEYS[m]}`)} ${day}`;
  };

  const grouped = useMemo(() => {
    const groups: { [key: string]: typeof sorted } = {};
    sorted.forEach((transaction) => {
      const dateStr = formatGroupDate(transaction.date);
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(transaction);
    });
    return groups;
  }, [sorted, lang]);

  function selectAccount(id: string | null) {
    if (id) setSearchParams({ accountId: id });
    else setSearchParams({});
    setShowAccountGrid(false);
  }

  function handleCustomSelect(start: Date, end: Date) {
    setCustomStart(start);
    setCustomEnd(end);
    setTimeRange("custom");
    setShowCustomPicker(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky header + controls wrapper */}
      <div className="sticky top-0 z-10">
        {/* Header */}
        <div className="bg-gradient-to-br from-theme-600 to-theme-700 text-white px-4 pb-4 pt-safe-header">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-theme-500 rounded-lg transition-colors flex-shrink-0"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Account selector button */}
            <button
              onClick={() => setShowAccountGrid((v) => !v)}
              className="flex-1 flex items-center justify-between gap-2 px-3 py-2 bg-theme-500/60 hover:bg-theme-500 rounded-xl transition-colors min-w-0"
            >
              <span className="text-sm font-semibold truncate">{selectedAccountName}</span>
              <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${showAccountGrid ? "rotate-180" : ""}`} />
            </button>

            {/* + Add transaction */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-shrink-0 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <Plus size={20} />
            </button>

            {accountIdFilter && (
              <button
                onClick={() => selectAccount(null)}
                className="flex-shrink-0 p-2 hover:bg-theme-500 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            )}
            <button
              onClick={() => setShowSearch((v) => !v)}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${showSearch ? "bg-theme-400" : "hover:bg-theme-500"}`}
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Account Grid Dropdown */}
        {showAccountGrid && (
          <div className="bg-theme-700 px-4 pb-4 pt-2">
            <div className="max-w-md mx-auto grid grid-cols-2 gap-2">
              <button
                onClick={() => selectAccount(null)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${
                  !accountIdFilter ? "bg-white text-theme-700" : "bg-theme-500/60 text-theme-100 hover:bg-theme-500"
                }`}
              >
                {T("acc.all_accounts")}
              </button>
              {storedAccounts.map((acc: any) => (
                <button
                  key={acc.id}
                  onClick={() => selectAccount(acc.id)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${
                    accountIdFilter === acc.id ? "bg-white text-theme-700" : "bg-theme-500/60 text-theme-100 hover:bg-theme-500"
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="max-w-md mx-auto px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex justify-between items-center gap-2 mb-1">
            <span className="text-xs text-slate-400">{T("txn.count", { n: sorted.length })}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              <ArrowUpDown size={16} />
              {sortOrder === "desc" ? T("sort.descending") : T("sort.ascending")}
            </button>
            <div className="flex gap-2">
              {/* Custom range button */}
              <button
                onClick={() => setShowCustomPicker(true)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  timeRange === "custom"
                    ? "bg-theme-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {customLabel}
              </button>
              {(["month", "all"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    timeRange === range
                      ? "bg-theme-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {range === "month" ? T("filter.month") : T("filter.all")}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="mt-2 flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา account หรือ category..."
                className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X size={15} className="text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="max-w-md mx-auto px-4 py-4">
        {Object.entries(grouped).map(([dateStr, transactions]) => (
          <div key={dateStr} className="mb-6">
            <div className="mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">{dateStr}</span>
            </div>
            <div className="space-y-2">
              {transactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  onClick={() => navigate(`/account/${transaction.accountId}/transactions/${transaction.id}`)}
                  className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">{index + 1}.</span>
                        <span
                          className="text-xs font-medium text-slate-600 cursor-pointer hover:underline"
                          onClick={(e) => { e.stopPropagation(); selectAccount(transaction.accountId); }}
                        >{transaction.accountName}</span>
                        {transaction.isTransfer ? (
                          <span className="text-xs text-slate-500">{T("acc.transfer")}</span>
                        ) : (
                          <span
                            className="text-xs font-semibold text-theme-600 cursor-pointer hover:underline"
                            onClick={(e) => { e.stopPropagation(); setSearchQuery(transaction.category); setShowSearch(true); }}
                          >{transaction.category}</span>
                        )}
                        {transaction.ledgerName && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 leading-none flex-shrink-0">{transaction.ledgerName}</span>
                        )}
                        {transaction.isRepeat && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-theme-100 text-theme-600 leading-none flex-shrink-0">{T("txn.repeat")}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{transaction.time}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold text-sm ${transaction.type === "income" ? "text-green-600" : "text-red-500"}`}>
                        {transaction.type === "income" ? "+" : "-"}{cur}{transaction.amount.toLocaleString()}
                      </span>
                      {runningBalances[transaction.id] !== undefined && (
                        <p className={`text-[10px] mt-0.5 ${runningBalances[transaction.id] >= 0 ? "text-slate-400" : "text-red-400"}`}>
                          {cur}{runningBalances[transaction.id].toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No transactions found</p>
          </div>
        )}
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <CalendarRangePicker
          rangeStart={customStart}
          rangeEnd={customEnd}
          onSelect={handleCustomSelect}
          onClose={() => setShowCustomPicker(false)}
        />
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
