import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ArrowUpDown } from "lucide-react";
import { getTransactionsList } from "../utils/transactionData";

type TimeRange = "week" | "month" | "all";
type SortOrder = "asc" | "desc";

export default function AllTransactions() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const allTransactions = getTransactionsList();

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return allTransactions.filter((transaction) => {
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
  }, [allTransactions, timeRange]);

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
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">All Transactions</h1>
            <p className="text-sm text-indigo-100">{sorted.length} transactions</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-md mx-auto px-4 py-3 bg-white border-b border-slate-200 sticky top-14 z-10">
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
      </div>

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
