import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ArrowUpDown, X, Search } from "lucide-react";
import { getRealTransactionsList } from "../utils/transactionData";

type TimeRange = "week" | "month" | "all";
type SortOrder = "asc" | "desc";

export default function AllTransactions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountIdFilter = searchParams.get("accountId");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chipScrollRef = useRef<HTMLDivElement>(null);

  const storedAccounts = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("app_accounts") || "[]"); } catch { return []; }
  }, []);

  // Auto-scroll chip row to selected account
  useEffect(() => {
    if (!chipScrollRef.current) return;
    if (!accountIdFilter) {
      chipScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const chip = chipScrollRef.current.querySelector(`[data-account-id="${accountIdFilter}"]`) as HTMLElement;
    if (chip) chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [accountIdFilter]);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
    else setSearchQuery("");
  }, [showSearch]);

  const allTransactions = useMemo(() => getRealTransactionsList(), []);

  const accountName = useMemo(() => {
    if (!accountIdFilter) return null;
    const found = allTransactions.find((t) => t.accountId === accountIdFilter);
    return found?.accountName ?? accountIdFilter;
  }, [accountIdFilter, allTransactions]);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const q = searchQuery.trim().toLowerCase();

    return allTransactions.filter((transaction) => {
      if (accountIdFilter && transaction.accountId !== accountIdFilter) return false;
      if (q && !transaction.accountName.toLowerCase().includes(q) &&
               !transaction.category.toLowerCase().includes(q) &&
               !transaction.amount.toString().includes(q) &&
               !(transaction.description || "").toLowerCase().includes(q)) return false;
      const transactionDate = new Date(
        transaction.date.getFullYear(),
        transaction.date.getMonth(),
        transaction.date.getDate()
      );

      if (timeRange === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return transactionDate >= weekAgo && transactionDate <= today;
      } else if (timeRange === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return transactionDate >= monthAgo && transactionDate <= today;
      }
      return true;
    });
  }, [allTransactions, timeRange, searchQuery, accountIdFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
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

  const grouped = useMemo(() => {
    const groups: { [key: string]: typeof sorted } = {};
    sorted.forEach((transaction) => {
      const dateStr = transaction.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(transaction);
    });
    return groups;
  }, [sorted]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky header + controls wrapper */}
      <div className="sticky top-0 z-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          {/* Scrollable account filter chips */}
          <div
            ref={chipScrollRef}
            className="flex-1 overflow-x-auto scrollbar-hide flex gap-2 items-center py-1"
            style={{ maskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)" }}
          >
            <button
              onClick={() => setSearchParams({})}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                !accountIdFilter
                  ? "bg-white text-indigo-600"
                  : "bg-indigo-500 text-indigo-100 hover:bg-indigo-400"
              }`}
            >
              All
            </button>
            {storedAccounts.map((acc: any) => (
              <button
                key={acc.id}
                data-account-id={acc.id}
                onClick={() => setSearchParams({ accountId: acc.id })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  accountIdFilter === acc.id
                    ? "bg-white text-indigo-600"
                    : "bg-indigo-500 text-indigo-100 hover:bg-indigo-400"
                }`}
              >
                {acc.name}
              </button>
            ))}
          </div>
          {accountIdFilter && (
            <button
              onClick={() => setSearchParams({})}
              className="flex-shrink-0 p-2 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
          <button
            onClick={() => setShowSearch((v) => !v)}
            className={`p-2 rounded-lg transition-colors ${showSearch ? "bg-indigo-400" : "hover:bg-indigo-500"}`}
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-md mx-auto px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex justify-between items-center gap-2 mb-1">
          <span className="text-xs text-slate-400">{sorted.length} transactions</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
          >
            <ArrowUpDown size={16} />
            {sortOrder === "desc" ? "Descending" : "Ascending"}
          </button>
          <div className="flex gap-2">
            {(["week", "month", "all"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  timeRange === range
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {range === "week" ? "Week" : range === "month" ? "Month" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar — shown when search toggled */}
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
      </div>{/* end sticky wrapper */}

      {/* Transactions List */}
      <div className="max-w-md mx-auto px-4 py-4">
        {Object.entries(grouped).map(([dateStr, transactions]) => (
          <div key={dateStr} className="mb-6">
            {/* Date Header */}
            <div className="mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                {dateStr}
              </span>
            </div>

            {/* Transaction Items */}
            <div className="space-y-2">
              {transactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  onClick={() => navigate(`/account/${transaction.accountId}/transactions/${transaction.id}`)}
                  className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-500">
                          {index + 1}.
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          {transaction.accountName}
                        </span>
                        <span className="text-xs font-semibold text-indigo-600">
                          {transaction.category}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {transaction.time}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold text-sm ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-slate-900"
                      }`}>
                        {transaction.type === "income" ? "+" : ""}{transaction.amount}฿
                      </span>
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
    </div>
  );
}
