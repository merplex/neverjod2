import { useState } from "react";
import { ChevronLeft, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { CreditCard, Wallet, Banknote, TrendingUp, Smartphone, MoreHorizontal } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  icon: React.ComponentType<any>;
  balance?: number;
  keywords?: string[];
}

const defaultAccounts: Account[] = [
  { id: "uob", name: "UOB", type: "credit card", icon: CreditCard, balance: 5000, keywords: [] },
  { id: "banka", name: "BankA", type: "debit card", icon: CreditCard, balance: 15000, keywords: [] },
  { id: "krungsri", name: "Krungsri", type: "savings account", icon: Wallet, balance: 50000, keywords: [] },
  { id: "bangkok", name: "Bangkok Bank", type: "credit card", icon: CreditCard, balance: 8000, keywords: [] },
  { id: "kasikorn", name: "Kasikornbank", type: "debit card", icon: CreditCard, balance: 12000, keywords: [] },
  { id: "tmb", name: "TMB", type: "savings account", icon: Wallet, balance: 30000, keywords: [] },
  { id: "scb", name: "SCB", type: "credit card", icon: CreditCard, balance: 6000, keywords: [] },
  { id: "acme", name: "ACME", type: "debit card", icon: CreditCard, balance: 10000, keywords: [] },
  { id: "cash", name: "Cash", type: "cash", icon: Banknote, balance: 2000, keywords: [] },
  { id: "crypto", name: "Crypto", type: "cryptocurrency", icon: TrendingUp, balance: 100000, keywords: [] },
  { id: "baht_pay", name: "Baht Pay", type: "digital wallet", icon: Smartphone, balance: 5000, keywords: [] },
  { id: "other_acc", name: "Other", type: "other", icon: MoreHorizontal, balance: 0, keywords: [] },
  { id: "kbank", name: "K-Bank", type: "digital bank", icon: Smartphone, balance: 20000, keywords: [] },
  { id: "revolut", name: "Revolut", type: "digital wallet", icon: CreditCard, balance: 3000, keywords: [] },
  { id: "wise", name: "Wise", type: "digital bank", icon: Wallet, balance: 5000, keywords: [] },
  { id: "stripe", name: "Stripe", type: "payment gateway", icon: CreditCard, balance: 0, keywords: [] },
  { id: "paypal", name: "PayPal", type: "digital wallet", icon: Banknote, balance: 1000, keywords: [] },
];

export default function AccountsManagement() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>(defaultAccounts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editKeywords, setEditKeywords] = useState("");

  const startEditing = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditBalance(account.balance?.toString() || "0");
    setEditKeywords((account.keywords || []).join(", "));
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    const keywords = editKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    setAccounts(
      accounts.map((acc) =>
        acc.id === editingId
          ? {
              ...acc,
              name: editName,
              balance: parseFloat(editBalance) || 0,
              keywords,
            }
          : acc
      )
    );
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditBalance("");
    setEditKeywords("");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Accounts</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="space-y-2">
          {accounts.map((account) => {
            const IconComponent = account.icon;
            const isEditing = editingId === account.id;

            return (
              <div
                key={account.id}
                className="bg-white rounded-lg border border-slate-200 p-4"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Balance
                      </label>
                      <input
                        type="number"
                        value={editBalance}
                        onChange={(e) => setEditBalance(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => setEditKeywords(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="e.g., uob, credit"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <IconComponent size={24} className="text-indigo-600 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-900">{account.name}</p>
                        <p className="text-xs text-slate-500">{account.type}</p>
                        <p className="text-sm font-semibold text-indigo-600 mt-1">
                          ฿{account.balance?.toLocaleString()}
                        </p>
                        {account.keywords && account.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {account.keywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => startEditing(account)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-indigo-600"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
