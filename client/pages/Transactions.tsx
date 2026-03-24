import { useState } from "react";
import { ChevronLeft, ArrowUpDown, ArrowDownUp } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

type SortOrder = "asc" | "desc";
type TimeRange = "week" | "month" | "all";

interface Transaction {
  id: string;
  date: Date;
  category: string;
  amount: number;
  description: string;
}

// Sample transaction data
const sampleTransactions: Transaction[] = [
  { id: "1", date: new Date(2024, 2, 24), category: "Food", amount: 250, description: "Lunch" },
  { id: "2", date: new Date(2024, 2, 24), category: "Transport", amount: 50, description: "Taxi" },
  { id: "3", date: new Date(2024, 2, 23), category: "Shopping", amount: 1200, description: "Clothes" },
  { id: "4", date: new Date(2024, 2, 23), category: "Food", amount: 180, description: "Dinner" },
  { id: "5", date: new Date(2024, 2, 22), category: "Bills", amount: 5000, description: "Electricity" },
  { id: "6", date: new Date(2024, 2, 21), category: "Food", amount: 320, description: "Groceries" },
  { id: "7", date: new Date(2024, 2, 20), category: "Entertainment", amount: 600, description: "Movie" },
  { id: "8", date: new Date(2024, 2, 19), category: "Transport", amount: 80, description: "BTS Card" },
  { id: "9", date: new Date(2024, 2, 18), category: "Food", amount: 150, description: "Coffee" },
  { id: "10", date: new Date(2024, 2, 17), category: "Shopping", amount: 2500, description: "Electronics" },
];

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

    // Sort transactions
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === "asc") {
        return a.date.getTime() - b.date.getTime();
      } else {
        return b.date.getTime() - a.date.getTime();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-screen">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 flex items-center gap-3">
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

          {/* Filters */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex gap-2">
            {/* Sort Button */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition-colors text-sm"
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
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
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
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">
                              {transaction.category}
                            </p>
                            <p className="text-xs text-slate-600">
                              {transaction.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">
                              {transaction.amount > 0 ? "+" : ""}{transaction.amount}฿
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
