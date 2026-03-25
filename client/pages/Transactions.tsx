import { useState } from "react";
import { ChevronLeft, ArrowUpDown, ArrowDownUp } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { getTransactionsList, type Transaction } from "../utils/transactionData";

type SortOrder = "asc" | "desc";
type TimeRange = "week" | "month" | "all";

const sampleTransactions = getTransactionsList();

const accountData: Record<string, { name: string; type: string }> = {
  uob: { name: "UOB", type: "credit card" },
  banka: { name: "BankA", type: "debit card" },
  krungsri: { name: "Krungsri", type: "savings account" },
  bangkok: { name: "Bangkok Bank", type: "credit card" },
  kasikorn: { name: "Kasikornbank", type: "debit card" },
  tmb: { name: "TMB", type: "savings account" },
  scb: { name: "SCB", type: "credit card" },
  acme: { name: "ACME", type: "debit card" },
  cash: { name: "Cash", type: "cash" },
  crypto: { name: "Crypto", type: "cryptocurrency" },
  baht_pay: { name: "Baht Pay", type: "digital wallet" },
  other_acc: { name: "Other", type: "other" },
};

export default function Transactions() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const account = accountData[accountId || ""];
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [targetAccount, setTargetAccount] = useState<string>("");

  const handleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedTransactions.size === 0) return;
    // In a real app, this would send to backend
    console.log("Deleting transactions:", Array.from(selectedTransactions));
    setSelectedTransactions(new Set());
    setIsSelectMode(false);
  };

  const handleMoveSelected = () => {
    if (selectedTransactions.size === 0 || !targetAccount) return;
    // In a real app, this would send to backend
    console.log("Moving transactions:", Array.from(selectedTransactions), "to", targetAccount);
    setSelectedTransactions(new Set());
    setTargetAccount("");
    setIsSelectMode(false);
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Account not found</h1>
        </div>
      </div>
    );
  }

  // Filter transactions by time range
  const getFilteredTransactions = () => {
    const today = new Date();
    let startDate = new Date();

    if (timeRange === "week") {
      startDate.setDate(today.getDate() - 7);
    } else if (timeRange === "month") {
      startDate.setMonth(today.getMonth() - 1);
    }
    // else 'all' - no filtering

    const filtered = sampleTransactions.filter((t) => {
      if (timeRange === "all") return true;
      return t.date >= startDate && t.date <= today;
    });

    // Sort transactions by date, then by time within each day
    const sorted = [...filtered].sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();

      // If dates are different, sort by date
      if (dateCompare !== 0) {
        if (sortOrder === "asc") {
          return dateCompare;
        } else {
          return -dateCompare;
        }
      }

      // If dates are the same, sort by time
      const aTime = a.time.split(":").map(Number);
      const bTime = b.time.split(":").map(Number);
      const aMinutes = aTime[0] * 60 + aTime[1];
      const bMinutes = bTime[0] * 60 + bTime[1];

      if (sortOrder === "asc") {
        return aMinutes - bMinutes;
      } else {
        return bMinutes - aMinutes;
      }
    });

    return sorted;
  };

  // Group transactions by day
  const groupTransactionsByDay = () => {
    const transactions = getFilteredTransactions();
    const grouped: Record<string, Transaction[]> = {};

    transactions.forEach((transaction) => {
      const dateKey = transaction.date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(transaction);
    });

    return grouped;
  };

  const groupedTransactions = groupTransactionsByDay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col p-4 pb-24">
      <div className="w-full max-w-md mx-auto">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-screen">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={24} className="text-slate-700" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{account.name}</h1>
                <p className="text-xs text-slate-600">{account.type}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedTransactions(new Set());
              }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                isSelectMode
                  ? "bg-theme-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isSelectMode ? "Done" : "Select"}
            </button>
          </div>

          {/* Filters / Actions */}
          <div className="px-6 py-4 bg-white border-b border-slate-200">
            {!isSelectMode ? (
              <div className="flex gap-2">
                {/* Sort Button */}
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-2 px-3 py-2 bg-theme-50 hover:bg-theme-100 text-theme-700 font-semibold rounded-lg transition-colors text-sm"
                >
                  {sortOrder === "asc" ? (
                    <ArrowUpDown size={16} />
                  ) : (
                    <ArrowDownUp size={16} />
                  )}
                  {sortOrder === "asc" ? "Ascending" : "Descending"}
                </button>

                {/* Time Range Buttons */}
                <div className="flex gap-2 flex-1">
                  {["week", "month", "all"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range as TimeRange)}
                      className={`flex-1 px-2 py-2 rounded-lg font-semibold text-sm transition-all capitalize ${
                        timeRange === range
                          ? "bg-theme-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {/* Delete Button */}
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedTransactions.size === 0}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    selectedTransactions.size === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  Delete ({selectedTransactions.size})
                </button>

                {/* Move Account Select */}
                <select
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  disabled={selectedTransactions.size === 0}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all border ${
                    selectedTransactions.size === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                      : "bg-white text-slate-700 border-theme-300 hover:border-theme-500"
                  }`}
                >
                  <option value="">Move to Account...</option>
                  {Object.entries(accountData).map(([id, data]) => (
                    <option key={id} value={id}>
                      {data.name}
                    </option>
                  ))}
                </select>

                {/* Move Button */}
                <button
                  onClick={handleMoveSelected}
                  disabled={selectedTransactions.size === 0 || !targetAccount}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    selectedTransactions.size === 0 || !targetAccount
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  Move
                </button>
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="px-6 py-4 flex-1 overflow-y-auto">
            {Object.entries(groupedTransactions).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTransactions).map(([dateKey, transactions]) => (
                  <div key={dateKey}>
                    {/* Day Header */}
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span>{new Date(dateKey).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}</span>
                    </h3>

                    {/* Day's Transactions */}
                    <div className="space-y-2">
                      {transactions.map((transaction, index) => (
                        <div
                          key={transaction.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                            selectedTransactions.has(transaction.id)
                              ? "bg-theme-100 border-2 border-theme-500"
                              : "bg-slate-50 hover:bg-slate-100"
                          }`}
                          onClick={() => {
                            if (isSelectMode) {
                              handleSelectTransaction(transaction.id);
                            } else {
                              navigate(`/account/${accountId}/transactions/${transaction.id}`);
                            }
                          }}
                        >
                          {/* Number / Checkbox */}
                          <div className="w-8 flex-shrink-0">
                            {isSelectMode ? (
                              <input
                                type="checkbox"
                                checked={selectedTransactions.has(transaction.id)}
                                onChange={() => handleSelectTransaction(transaction.id)}
                                className="w-5 h-5 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="text-sm font-semibold text-slate-600">
                                {index + 1}.
                              </span>
                            )}
                          </div>

                          {/* Transaction Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {transaction.category}
                              </p>
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {transaction.time}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              {transaction.description}
                            </p>
                          </div>

                          {/* Amount */}
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-slate-900">
                              {transaction.type === "income" ? "+" : "-"}฿{transaction.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
