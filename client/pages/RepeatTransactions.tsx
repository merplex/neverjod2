import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, RefreshCw, Pencil, X } from "lucide-react";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { useT } from "../hooks/useT";
import {
  getRepeatTransactions, deleteRepeatTransaction, updateRepeatTransaction,
  REPEAT_OPTIONS, RepeatTransaction, RepeatOption,
} from "../utils/repeatTransactionService";
import AddTransactionModal from "../components/AddTransactionModal";

function repeatLabel(rt: RepeatTransaction): string {
  const opt = REPEAT_OPTIONS.find((o) => o.value === rt.repeatOption);
  return opt ? opt.label : rt.repeatOption;
}

function formatNextDue(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function RepeatTransactions() {
  const navigate = useNavigate();
  const T = useT();
  useSwipeBack();

  const [list, setList] = useState<RepeatTransaction[]>(() => getRepeatTransactions());
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editRepeatOption, setEditRepeatOption] = useState<RepeatOption>("monthly");
  const [showEditRepeatPicker, setShowEditRepeatPicker] = useState(false);

  const openEdit = (rt: RepeatTransaction) => {
    setEditId(rt.id);
    setEditAmount(rt.amount.toString());
    setEditDesc(rt.description || "");
    setEditRepeatOption(rt.repeatOption);
    setShowEditRepeatPicker(false);
  };

  const handleEditSave = () => {
    if (!editId) return;
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) return;
    updateRepeatTransaction(editId, { amount, description: editDesc, repeatOption: editRepeatOption });
    setEditId(null);
    refresh();
  };

  const refresh = () => setList(getRepeatTransactions());

  const handleDelete = (id: string) => {
    deleteRepeatTransaction(id);
    setDeleteConfirmId(null);
    refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-theme-600 to-theme-700 text-white px-4 pb-4 pt-safe-header">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-theme-500 rounded-lg transition-colors flex-shrink-0"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="flex-1 text-base font-semibold">Repeat Transactions</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-16">
            <RefreshCw size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">{T("repeat.empty")}</p>
            <p className="text-slate-400 text-xs mt-1">{T("repeat.empty_hint")}</p>
          </div>
        ) : (
          list.map((rt) => {
            const sign = rt.categoryType === "income" ? "+" : "-";
            const amtColor = rt.categoryType === "income" ? "text-green-600" : "text-red-500";

            return (
              <div key={rt.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Category + Account */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800 truncate">{rt.categoryName}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 truncate">{rt.accountName}</span>
                    </div>
                    {/* Amount */}
                    <p className={`text-base font-bold ${amtColor} mb-2`}>
                      {sign}฿{rt.amount.toLocaleString()}
                    </p>
                    {/* Repeat info */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-theme-50 text-theme-700 rounded-full text-xs font-semibold">
                        <RefreshCw size={10} />
                        {repeatLabel(rt)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {T("repeat.next_due")}: {formatNextDue(rt.nextDue)}
                      </span>
                    </div>
                    {/* Description */}
                    {rt.description ? (
                      <p className="text-xs text-slate-400 mt-1 truncate">{rt.description}</p>
                    ) : null}
                  </div>

                  {/* Edit + Delete */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(rt)}
                      className="p-2 text-slate-300 hover:text-theme-500 transition-colors flex-shrink-0"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(rt.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Bottom Sheet */}
      {editId && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditId(null)} />
          <div className="relative bg-white rounded-t-2xl p-5 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{T("repeat.edit_title")}</p>
              <button onClick={() => setEditId(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">{T("repeat.amount")}</label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">{T("repeat.note")}</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            {/* Repeat Option */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">{T("repeat.frequency")}</label>
              <button
                onClick={() => setShowEditRepeatPicker((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-xl text-sm"
              >
                <span className="font-semibold text-slate-800">
                  {REPEAT_OPTIONS.find((o) => o.value === editRepeatOption)?.label}
                </span>
                <span className="text-xs text-slate-400">
                  {REPEAT_OPTIONS.find((o) => o.value === editRepeatOption)?.desc}
                </span>
              </button>
              {showEditRepeatPicker && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden">
                  {REPEAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setEditRepeatOption(opt.value); setShowEditRepeatPicker(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${opt.value === editRepeatOption ? "bg-theme-50" : ""}`}
                    >
                      <span className={`text-sm font-semibold w-28 text-left ${opt.value === editRepeatOption ? "text-theme-700" : "text-slate-800"}`}>{opt.label}</span>
                      <span className="text-xs text-slate-400 flex-1 text-left">{opt.desc}</span>
                      {opt.value === editRepeatOption && <span className="text-theme-600">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleEditSave}
              className="w-full py-3 bg-theme-600 hover:bg-theme-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {T("save")}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Bottom Sheet */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-t-2xl p-5 pb-8 space-y-3">
            <p className="text-sm font-semibold text-slate-800 text-center">{T("repeat.delete_confirm")}</p>
            <p className="text-xs text-slate-500 text-center">{T("repeat.delete_hint")}</p>
            <button
              onClick={() => handleDelete(deleteConfirmId)}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              {T("delete")}
            </button>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
            >
              {T("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddTransactionModal
          isRepeatMode
          onClose={() => setShowAddModal(false)}
          onSaved={() => { refresh(); }}
        />
      )}
    </div>
  );
}
