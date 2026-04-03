import { getCurrencySymbol } from "../utils/currency";
import { lk, getActiveLedgerId } from "../utils/ledgerStorage";
import { useState, useEffect, useMemo } from "react";
import { X, ChevronRight, ArrowRightLeft } from "lucide-react";
import TimePicker from "./TimePicker";
import { useT } from "../hooks/useT";
import { getLang } from "../utils/i18n";
import {
  REPEAT_OPTIONS, RepeatOption, RepeatTransaction,
  addRepeatTransaction, getRepeatTransactions, buildInitialNextDue,
  updateRepeatTransfer,
} from "../utils/repeatTransactionService";

interface TransferModalProps {
  editRepeatId?: string;  // if set, editing an existing repeat transfer
  onClose: () => void;
  onSaved: () => void;
}

function formatTime(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function getAccountCurrentBalance(accountId: string, startBalance: number): number {
  try {
    const txns: any[] = JSON.parse(localStorage.getItem(lk("app_transactions")) || "[]");
    const cats: any[] = JSON.parse(localStorage.getItem(lk("app_categories")) || "[]");
    const catTypeMap: Record<string, string> = {};
    cats.forEach((c: any) => { catTypeMap[c.id] = c.type; });
    const incomeIds = new Set(["salary", "bonus", "freelance", "investment", "rental", "transfer_in"]);
    return txns
      .filter((t: any) => t.accountId === accountId)
      .reduce((sum: number, t: any) => {
        const type = catTypeMap[t.categoryId] || (incomeIds.has(t.categoryId) ? "income" : "expense");
        return type === "income" ? sum + Number(t.amount) : sum - Number(t.amount);
      }, startBalance);
  } catch {
    return startBalance;
  }
}

export default function TransferModal({ editRepeatId, onClose, onSaved }: TransferModalProps) {
  const T = useT();
  const cur = getCurrencySymbol();
  const activeLedgerId = getActiveLedgerId();

  // Ledger list (for cross-ledger toggle)
  const [ledgers] = useState<{ id: string; name: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("app_ledgers") || "null") || [{ id: "main", name: "Main" }]; }
    catch { return [{ id: "main", name: "Main" }]; }
  });

  // Load accounts (current ledger)
  const [accounts] = useState<any[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(lk("app_accounts")) || "[]");
      return stored
        .filter((a: any) => a && a.id && a.id !== "account_deleted")
        .map((a: any) => ({ ...a, currentBalance: getAccountCurrentBalance(a.id, Number(a.balance) || 0) }));
    } catch { return []; }
  });

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [toLedgerId, setToLedgerId] = useState<string>(activeLedgerId);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date());

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Which ledger tab is active inside the To picker
  const [toPickerTab, setToPickerTab] = useState<string>(activeLedgerId);

  // Accounts in the currently-selected To picker tab
  const toPickerAccounts = useMemo(() => {
    if (toPickerTab === activeLedgerId) return accounts;
    try {
      const stored = JSON.parse(localStorage.getItem(lk("app_accounts", toPickerTab)) || "[]");
      return stored
        .filter((a: any) => a && a.id && a.id !== "account_deleted")
        .map((a: any) => ({ ...a, currentBalance: getAccountCurrentBalance(a.id, Number(a.balance) || 0) }));
    } catch { return []; }
  }, [toPickerTab, activeLedgerId, accounts]);

  // Repeat
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatOption, setRepeatOption] = useState<RepeatOption>("monthly");
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (!editRepeatId) return;
    const list = getRepeatTransactions();
    const rt = list.find((r) => r.id === editRepeatId);
    if (!rt) return;

    setFromId(rt.fromAccountId || rt.accountId || null);
    setToId(rt.toAccountId || null);
    if (rt.toLedgerId) { setToLedgerId(rt.toLedgerId); setToPickerTab(rt.toLedgerId); }
    setAmount(rt.amount.toString());

    const d = new Date(rt.startDate);
    setDate(d.toISOString().split("T")[0]);
    const [h, m] = rt.time.split(":").map(Number);
    const timeDate = new Date();
    timeDate.setHours(h, m, 0, 0);
    setTime(timeDate);

    setRepeatEnabled(true);
    setRepeatOption(rt.repeatOption);
  }, [editRepeatId]);

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = toPickerAccounts.find((a) => a.id === toId) || accounts.find((a) => a.id === toId);
  const isCrossLedger = toLedgerId !== activeLedgerId;
  const toLedgerName = ledgers.find((l) => l.id === toLedgerId)?.name || "";

  const canSave = fromId && toId && (fromId !== toId || isCrossLedger) && parseFloat(amount) > 0;

  const handleSave = () => {
    if (!canSave) return;

    const parsedAmount = parseFloat(amount);
    const txDate = new Date(date);
    txDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
    const timeStr = formatTime(time);

    if (editRepeatId) {
      // Update existing repeat transfer
      updateRepeatTransfer(editRepeatId, {
        fromAccountId: fromId!,
        fromAccountName: fromAcc?.name || fromId!,
        toAccountId: toId!,
        toAccountName: toAcc?.name || toId!,
        amount: parsedAmount,
        repeatOption,
        date: txDate,
        time: timeStr,
        ...(isCrossLedger ? { toLedgerId, toLedgerName } : {}),
      });
      onSaved();
      onClose();
      return;
    }

    if (repeatEnabled) {
      // Save as RepeatTransaction
      const partial: Omit<RepeatTransaction, "nextDue"> = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        categoryId: "transfer_out",
        categoryType: "expense",
        categoryName: toAcc?.name || toId!,
        accountId: fromId!,
        accountName: fromAcc?.name || fromId!,
        amount: parsedAmount,
        description: "",
        repeatOption,
        dayOfMonth: txDate.getDate(),
        weekday: txDate.getDay(),
        monthOfYear: txDate.getMonth(),
        time: timeStr,
        startDate: txDate.toISOString(),
        source: "local",
        isTransfer: true,
        fromAccountId: fromId!,
        fromAccountName: fromAcc?.name || fromId!,
        toAccountId: toId!,
        toAccountName: toAcc?.name || toId!,
        ...(isCrossLedger ? { toLedgerId, toLedgerName } : {}),
      };
      const nextDue = buildInitialNextDue(partial as any);
      addRepeatTransaction({ ...partial, nextDue });
    } else {
      // Save immediate transactions
      const now = Date.now();
      const transferRef = `transfer_${now}`;
      // transfer_out — always in the current (from) ledger
      const txnsOut: any[] = JSON.parse(localStorage.getItem(lk("app_transactions")) || "[]");
      txnsOut.unshift({
        id: `${now}_transfer_out`,
        categoryId: "transfer_out",
        accountId: fromId,
        amount: parsedAmount,
        description: `→ ${toAcc?.name || toId}`,
        date: txDate.toISOString(),
        time: timeStr,
        isTransfer: true,
        transferRef,
        ...(isCrossLedger ? { ledgerName: toLedgerName, pairLedgerId: toLedgerId } : {}),
      });
      localStorage.setItem(lk("app_transactions"), JSON.stringify(txnsOut));
      // transfer_in — goes to the destination ledger (same or cross)
      const toTxnsKey = isCrossLedger ? lk("app_transactions", toLedgerId) : lk("app_transactions");
      const txnsIn: any[] = JSON.parse(localStorage.getItem(toTxnsKey) || "[]");
      const fromLedgerName = ledgers.find((l) => l.id === activeLedgerId)?.name || "";
      txnsIn.unshift({
        id: `${now + 1}_transfer_in`,
        categoryId: "transfer_in",
        accountId: toId,
        amount: parsedAmount,
        description: `← ${fromAcc?.name || fromId}`,
        date: txDate.toISOString(),
        time: timeStr,
        isTransfer: true,
        transferRef,
        ...(isCrossLedger ? { ledgerName: fromLedgerName, pairLedgerId: activeLedgerId } : {}),
      });
      localStorage.setItem(toTxnsKey, JSON.stringify(txnsIn));
      window.dispatchEvent(new CustomEvent("app-data-updated"));
    }

    onSaved();
    onClose();
  };

  const selectedRepeat = REPEAT_OPTIONS.find((o) => o.value === repeatOption)!;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-theme-600" />
              <h2 className="text-base font-bold text-slate-900">
                {editRepeatId ? T("acc.edit_transfer") : T("acc.transfer_money_title")}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Scrollable form */}
          <div className="overflow-y-auto px-5 pb-4 space-y-4 flex-1">
            {/* From Account */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{T("acc.from_account")}</label>
              <button
                onClick={() => { setShowFromPicker(true); setShowToPicker(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm transition-colors ${fromId ? "border-theme-400 bg-theme-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                {fromAcc ? (
                  <>
                    <span className="font-semibold text-slate-800">{fromAcc.name}</span>
                    <span className={`text-xs ${fromAcc.currentBalance >= 0 ? "text-slate-500" : "text-red-500"}`}>
                      {cur}{fromAcc.currentBalance.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 text-xs">{T("acc.select_source")}</span>
                )}
              </button>
            </div>

            {/* To Account */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{T("acc.to_account")}</label>
              <button
                onClick={() => { setShowToPicker(true); setShowFromPicker(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm transition-colors ${toId ? "border-theme-400 bg-theme-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                {toAcc ? (
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-800 truncate">{toAcc.name}</span>
                      {isCrossLedger && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 leading-none flex-shrink-0">{toLedgerName}</span>
                      )}
                    </div>
                    <span className={`text-xs flex-shrink-0 ${toAcc.currentBalance >= 0 ? "text-slate-500" : "text-red-500"}`}>
                      {cur}{toAcc.currentBalance.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">{T("acc.select_dest")}</span>
                )}
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{T("acc.amount")}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                placeholder="0"
              />
            </div>

            {/* Date + Time */}
            <div className="flex gap-2">
              <div className="flex-[2] min-w-0">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{T("acc.date")}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white appearance-none"
                />
              </div>
              <div className="flex-[1]">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">{T("acc.time")}</label>
                <button
                  onClick={() => setShowTimePicker(true)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  {formatTime(time)}
                </button>
              </div>
            </div>

            {/* Repeat Toggle Row */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Repeat</span>
                <button
                  onClick={() => setRepeatEnabled((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${repeatEnabled ? "bg-theme-600" : "bg-slate-200"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${repeatEnabled ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {repeatEnabled && (
                <button
                  onClick={() => setShowRepeatPicker(true)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800 text-left flex-1">
                    {getLang() === "en" ? selectedRepeat.labelEn : getLang() === "zh" ? selectedRepeat.labelZh : selectedRepeat.label}
                  </span>
                  <span className="text-xs text-slate-400 mr-2">{selectedRepeat.desc}</span>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  canSave
                    ? "bg-theme-600 text-white hover:bg-theme-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                {editRepeatId ? T("save") : repeatEnabled ? T("modal.save_repeat") : T("acc.transfer")}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                {T("cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* From Picker */}
      {showFromPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFromPicker(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-slate-800">{T("acc.select_source")}</h3>
              <button onClick={() => setShowFromPicker(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="overflow-y-auto">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => { setFromId(acc.id); setShowFromPicker(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${acc.id === fromId ? "bg-theme-50" : ""}`}
                >
                  <span className={`text-sm font-semibold ${acc.id === fromId ? "text-theme-700" : "text-slate-800"}`}>{acc.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${acc.currentBalance >= 0 ? "text-slate-400" : "text-red-500"}`}>{cur}{acc.currentBalance.toLocaleString()}</span>
                    {acc.id === fromId && <span className="text-theme-600 text-base">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* To Picker */}
      {showToPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowToPicker(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm max-h-[75vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-slate-800">{T("acc.select_dest")}</h3>
              <button onClick={() => setShowToPicker(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            {/* Ledger tab toggle — only show if more than 1 ledger */}
            {ledgers.length > 1 && (
              <div className="px-4 py-2.5 border-b border-slate-100 flex-shrink-0">
                <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
                  {ledgers.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setToPickerTab(l.id)}
                      className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-colors ${toPickerTab === l.id ? "bg-white text-theme-700 shadow-sm" : "text-slate-500"}`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-y-auto flex-1">
              {toPickerAccounts.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">No accounts</p>
              ) : toPickerAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setToId(acc.id);
                    setToLedgerId(toPickerTab);
                    setShowToPicker(false);
                  }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${acc.id === toId && toPickerTab === toLedgerId ? "bg-theme-50" : ""}`}
                >
                  <span className={`text-sm font-semibold ${acc.id === toId && toPickerTab === toLedgerId ? "text-theme-700" : "text-slate-800"}`}>{acc.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${acc.currentBalance >= 0 ? "text-slate-400" : "text-red-500"}`}>{cur}{acc.currentBalance.toLocaleString()}</span>
                    {acc.id === toId && toPickerTab === toLedgerId && <span className="text-theme-600 text-base">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <TimePicker
          value={time}
          onChange={(t) => { setTime(t); setShowTimePicker(false); }}
          onClose={() => setShowTimePicker(false)}
        />
      )}

      {/* Repeat Frequency Picker */}
      {showRepeatPicker && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRepeatPicker(false)} />
          <div className="relative bg-white rounded-t-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Repeat Frequency</h3>
              <button onClick={() => setShowRepeatPicker(false)}>
                <span className="text-slate-400 text-lg">✕</span>
              </button>
            </div>
            <div className="py-2 pb-8">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setRepeatOption(opt.value); setShowRepeatPicker(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors ${opt.value === repeatOption ? "bg-theme-50" : ""}`}
                >
                  <span className={`text-sm font-semibold w-28 text-left ${opt.value === repeatOption ? "text-theme-700" : "text-slate-800"}`}>
                    {getLang() === "en" ? opt.labelEn : getLang() === "zh" ? opt.labelZh : opt.label}
                  </span>
                  <span className="text-xs text-slate-400 flex-1 text-left">{opt.desc}</span>
                  {opt.value === repeatOption && (
                    <span className="text-theme-600 text-base">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
