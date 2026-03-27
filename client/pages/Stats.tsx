import { useState, useMemo } from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { getRealTransactionsList } from "../utils/transactionData";

type TabType = "summary" | "stats";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function Stats() {
  const navigate = useNavigate();
  useSwipeBack();
  const [tab, setTab] = useState<TabType>("summary");

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());

  const allTransactions = useMemo(() => getRealTransactionsList(), []);

  const storedAccounts = useMemo<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("app_accounts") || "[]"); } catch { return []; }
  }, []);

  // --- Tab 1: Summary (all-time per account) ---
  const summaryData = useMemo(() =>
    storedAccounts.map((acc: any) => {
      const txns = allTransactions.filter((t) => t.accountId === acc.id);
      const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { ...acc, income, expense };
    }),
  [storedAccounts, allTransactions]);

  // --- Tab 2: month-filtered ---
  const monthFiltered = useMemo(() =>
    allTransactions.filter(
      (t) => t.date.getFullYear() === selectedYear && t.date.getMonth() === selectedMonth
    ),
  [allTransactions, selectedYear, selectedMonth]);

  const expenseByCat = useMemo(() => {
    const map: Record<string, number> = {};
    monthFiltered.filter((t) => t.type === "expense" && !t.isTransfer).forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthFiltered]);

  const incomeByCat = useMemo(() => {
    const map: Record<string, number> = {};
    monthFiltered.filter((t) => t.type === "income" && !t.isTransfer).forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthFiltered]);

  const accountMonthData = useMemo(() =>
    storedAccounts
      .map((acc: any) => {
        const txns = monthFiltered.filter((t) => t.accountId === acc.id && !t.isTransfer);
        const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        return { ...acc, income, expense };
      })
      .filter((a: any) => a.income > 0 || a.expense > 0),
  [storedAccounts, monthFiltered]);

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-10">
        <div className="bg-gradient-to-br from-theme-600 to-theme-700 text-white px-4 pb-4 pt-safe-header">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-theme-500 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Report</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto bg-white border-b border-slate-200">
          <div className="flex gap-2 px-4 py-4">
            <button
              onClick={() => setTab("summary")}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                tab === "summary"
                  ? "bg-theme-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setTab("stats")}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                tab === "stats"
                  ? "bg-theme-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Stats
            </button>
          </div>
        </div>
      </div>

      {/* ===== Tab 1: Summary ===== */}
      {tab === "summary" && (
        <div className="max-w-md mx-auto px-4 py-4">
          {summaryData.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No accounts found</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {summaryData.map((acc: any, i: number) => {
                const balance = Number(acc.balance || 0) + acc.income - acc.expense;
                return (
                  <div key={acc.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                    <p className="font-medium text-slate-800">{acc.name}</p>
                    <p className={`font-bold text-sm ${balance >= 0 ? "text-slate-800" : "text-red-500"}`}>
                      {balance >= 0 ? "+" : "-"}฿{Math.abs(balance).toLocaleString()}
                    </p>
                  </div>
                );
              })}
              {summaryData.length > 0 && (() => {
                const total = summaryData.reduce((s: number, acc: any) => s + Number(acc.balance || 0) + acc.income - acc.expense, 0);
                return (
                  <div className="flex items-center justify-between px-4 py-3 border-t-2 border-slate-200 bg-slate-50">
                    <p className="font-semibold text-slate-600 text-sm">รวมทั้งหมด</p>
                    <p className={`font-bold text-sm ${total >= 0 ? "text-slate-800" : "text-red-500"}`}>
                      {total >= 0 ? "+" : "-"}฿{Math.abs(total).toLocaleString()}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ===== Tab 2: Stats ===== */}
      {tab === "stats" && (
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          {/* Month picker */}
          <div className="relative">
            <button
              onClick={() => { setShowMonthPicker((v) => !v); setPickerYear(selectedYear); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>{MONTHS[selectedMonth]} {selectedYear}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${showMonthPicker ? "rotate-180" : ""}`}
              />
            </button>

            {showMonthPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-4">
                {/* Year row */}
                <div className="flex gap-2 mb-3">
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => setPickerYear(y)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        pickerYear === y
                          ? "bg-theme-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
                {/* Month grid */}
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedYear(pickerYear);
                        setSelectedMonth(i);
                        setShowMonthPicker(false);
                      }}
                      className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                        selectedYear === pickerYear && selectedMonth === i
                          ? "bg-theme-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Single box: Expense + Income + Account breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Expense section */}
            <div className="px-4 py-3 bg-slate-50">
              <p className="font-semibold text-slate-700 text-sm">รายจ่าย</p>
            </div>
            {expenseByCat.length === 0 ? (
              <p className="text-xs text-slate-400 px-4 py-3 text-center border-b border-slate-100">ไม่มีรายจ่ายในช่วงนี้</p>
            ) : (
              <>
                {expenseByCat.map(([cat, total]) => (
                  <div key={cat} className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-700">{cat}</span>
                    <span className="text-sm font-semibold text-red-500">-฿{total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-sm font-semibold text-slate-600">รวมรายจ่าย</span>
                  <span className="text-sm font-bold text-red-500">-฿{expenseByCat.reduce((s, [, v]) => s + v, 0).toLocaleString()}</span>
                </div>
              </>
            )}

            {/* Income section */}
            <div className="px-4 py-3 bg-slate-50">
              <p className="font-semibold text-slate-700 text-sm">รายรับ</p>
            </div>
            {incomeByCat.length === 0 ? (
              <p className="text-xs text-slate-400 px-4 py-3 text-center border-b border-slate-100">ไม่มีรายรับในช่วงนี้</p>
            ) : (
              <>
                {incomeByCat.map(([cat, total]) => (
                  <div key={cat} className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-700">{cat}</span>
                    <span className="text-sm font-semibold text-green-600">+฿{total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-sm font-semibold text-slate-600">รวมรายรับ</span>
                  <span className="text-sm font-bold text-green-600">+฿{incomeByCat.reduce((s, [, v]) => s + v, 0).toLocaleString()}</span>
                </div>
              </>
            )}

            {/* Per-account section */}
            <div className="px-4 py-3 bg-slate-50">
              <p className="font-semibold text-slate-700 text-sm">แยกตาม Account</p>
            </div>
            {accountMonthData.length === 0 ? (
              <p className="text-xs text-slate-400 px-4 py-3 text-center">ไม่มีรายการในช่วงนี้</p>
            ) : (
              <>
                <div className="grid grid-cols-3 px-4 py-2 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-400">Account</span>
                  <span className="text-xs font-medium text-slate-400 text-center">รายรับ</span>
                  <span className="text-xs font-medium text-slate-400 text-right">รายจ่าย</span>
                </div>
                {accountMonthData.map((acc: any) => (
                  <div key={acc.id} className="grid grid-cols-3 px-4 py-3 items-center border-b border-slate-100">
                    <span className="text-sm text-slate-700 font-medium truncate pr-2">{acc.name}</span>
                    <span className="text-sm font-semibold text-green-600 text-center">
                      {acc.income > 0 ? `+฿${acc.income.toLocaleString()}` : "—"}
                    </span>
                    <span className="text-sm font-semibold text-red-500 text-right">
                      {acc.expense > 0 ? `-฿${acc.expense.toLocaleString()}` : "—"}
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-3 px-4 py-3 items-center bg-slate-50">
                  <span className="text-sm font-semibold text-slate-600">รวม</span>
                  <span className="text-sm font-bold text-green-600 text-center">
                    +฿{accountMonthData.reduce((s: number, a: any) => s + a.income, 0).toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-red-500 text-right">
                    -฿{accountMonthData.reduce((s: number, a: any) => s + a.expense, 0).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
