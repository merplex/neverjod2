import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, RefreshCw } from "lucide-react";
import { useSwipeBack } from "../hooks/useSwipeBack";
import {
  getRepeatTransactions, deleteRepeatTransaction,
  REPEAT_OPTIONS, RepeatTransaction,
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
  useSwipeBack();

  const [list, setList] = useState<RepeatTransaction[]>(() => getRepeatTransactions());
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const refresh = () => setList(getRepeatTransactions());

  const handleDelete = (id: string) => {
    deleteRepeatTransaction(id);
    setDeleteConfirmId(null);
    refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-theme-600 to-theme-700 text-white px-4 py-4">
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
            <p className="text-slate-500 text-sm">ยังไม่มี repeat transaction</p>
            <p className="text-slate-400 text-xs mt-1">กด + เพื่อสร้าง</p>
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
                        ถัดไป: {formatNextDue(rt.nextDue)}
                      </span>
                    </div>
                    {/* Description */}
                    {rt.description ? (
                      <p className="text-xs text-slate-400 mt-1 truncate">{rt.description}</p>
                    ) : null}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirmId(rt.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirm Bottom Sheet */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-t-2xl p-5 pb-8 space-y-3">
            <p className="text-sm font-semibold text-slate-800 text-center">ลบ repeat transaction นี้?</p>
            <p className="text-xs text-slate-500 text-center">transaction ที่สร้างไปแล้วจะไม่ถูกลบ</p>
            <button
              onClick={() => handleDelete(deleteConfirmId)}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              ลบ
            </button>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
            >
              ยกเลิก
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
