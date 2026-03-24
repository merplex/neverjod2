import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const accountData: Record<string, { name: string; type: string }> = {
  uob: { name: "UOB", type: "credit card" },
  banka: { name: "BankA", type: "debit card" },
  krungsri: { name: "Krungsri", type: "savings account" },
  bangkok: { name: "Bangkok Bank", type: "credit card" },
  kasikorn: { name: "Kasikornbank", type: "debit card" },
  other: { name: "Other", type: "account" },
};

export default function Transactions() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const account = accountData[accountId || ""];

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Account not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{account.name}</h1>
              <p className="text-xs text-slate-600">{account.type}</p>
            </div>
          </div>

          {/* Transactions List */}
          <div className="px-6 py-6">
            <div className="text-center py-12">
              <p className="text-slate-600">No transactions yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
