import { useState } from "react";
import { ChevronLeft, Edit2, ArrowRightLeft, Trash2, GripVertical, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TimePicker from "../components/TimePicker";
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
  { id: "account_deleted", name: "Account Deleted", type: "deleted", icon: Trash2, balance: 0, keywords: [] },
];


export default function AccountsManagement() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const stored = localStorage.getItem("app_accounts");
      let list: Account[] = defaultAccounts;
      if (stored) {
        const storedAccounts = JSON.parse(stored);
        list = storedAccounts
          .map((acc: any) => {
            if (!acc || !acc.id) return null;
            const defaultAcc = defaultAccounts.find((d) => d.id === acc.id);
            if (!defaultAcc) {
              // Custom account — resolve icon by type string or fall back to MoreHorizontal
              if (!acc.id.startsWith("custom_acc_")) return null;
              const iconMap: Record<string, React.ComponentType<any>> = {
                creditcard: CreditCard, wallet: Wallet, cash: Banknote,
                invest: TrendingUp, phone: Smartphone, other: MoreHorizontal,
              };
              const icon = iconMap[acc.iconId] || MoreHorizontal;
              return { ...acc, icon };
            }
            return { ...acc, icon: defaultAcc.icon };
          })
          .filter((acc: any) => acc !== null);
      }
      // Ensure account_deleted always exists
      if (!list.find((a) => a.id === "account_deleted")) {
        const deletedDefault = defaultAccounts.find((a) => a.id === "account_deleted")!;
        list = [...list, deletedDefault];
      }
      return list;
    } catch (e) {
      return defaultAccounts;
    }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [keywordError, setKeywordError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reorderSelectedId, setReorderSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("savings account");
  const [newAccBalance, setNewAccBalance] = useState("0");
  const [newAccIconId, setNewAccIconId] = useState("wallet");
  const [newAccKeywords, setNewAccKeywords] = useState("");
  const [newAccKeywordError, setNewAccKeywordError] = useState("");

  const accIconOptions = [
    { id: "creditcard", icon: CreditCard },
    { id: "wallet", icon: Wallet },
    { id: "cash", icon: Banknote },
    { id: "invest", icon: TrendingUp },
    { id: "phone", icon: Smartphone },
    { id: "other", icon: MoreHorizontal },
  ];

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;

    const keywords = newAccKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k);

    // Validate: keywords must not already exist in other accounts or categories
    const storedCategories = JSON.parse(localStorage.getItem("app_categories") || "[]");
    for (const kw of keywords) {
      const dupAcc = accounts.find((a) => (a.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupAcc) {
        setNewAccKeywordError(`Keyword "${kw}" ซ้ำกับที่มีอยู่ใน ${dupAcc.name}`);
        return;
      }
      const dupCat = storedCategories.find((c: any) => (c.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupCat) {
        setNewAccKeywordError(`Keyword "${kw}" ซ้ำกับที่มีอยู่ใน ${dupCat.name}`);
        return;
      }
    }

    const iconEntry = accIconOptions.find((o) => o.id === newAccIconId) || accIconOptions[1];
    const newId = `custom_acc_${Date.now()}`;
    const newAcc: Account & { iconId?: string } = {
      id: newId,
      name: newAccName.trim(),
      type: newAccType.trim(),
      icon: iconEntry.icon,
      iconId: newAccIconId,
      balance: parseFloat(newAccBalance) || 0,
      keywords,
    };
    const deletedAcc = accounts.find((a) => a.id === "account_deleted");
    const rest = accounts.filter((a) => a.id !== "account_deleted");
    const updated = deletedAcc ? [...rest, newAcc, deletedAcc] : [...rest, newAcc];
    setAccounts(updated);
    localStorage.setItem("app_accounts", JSON.stringify(updated));
    setNewAccName(""); setNewAccType("savings account"); setNewAccBalance("0"); setNewAccIconId("wallet");
    setNewAccKeywords(""); setNewAccKeywordError("");
    setShowAddForm(false);
  };

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | null>(null);
  const [transferToId, setTransferToId] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [transferTime, setTransferTime] = useState(new Date());

  const startEditing = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditType(account.type);
    setEditBalance(account.balance?.toString() || "0");
    setEditKeywords((account.keywords || []).join(", "));
    setKeywordError("");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    const keywords = editKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k);

    // Validate: keywords must not already exist in other accounts or any category
    const otherAccs = accounts.filter((a) => a.id !== editingId);
    const storedCategories = JSON.parse(localStorage.getItem("app_categories") || "[]");

    for (const kw of keywords) {
      const dupAcc = otherAccs.find((a) => (a.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupAcc) {
        setKeywordError(`Keyword "${kw}" ซ้ำกับที่มีอยู่ใน ${dupAcc.name}`);
        return;
      }
      const dupCat = storedCategories.find((c: any) => (c.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupCat) {
        setKeywordError(`Keyword "${kw}" ซ้ำกับที่มีอยู่ใน ${dupCat.name}`);
        return;
      }
    }

    setKeywordError("");
    const updatedAccounts = accounts.map((acc) =>
      acc.id === editingId
        ? { ...acc, name: editName, type: editType, balance: parseFloat(editBalance) || 0, keywords }
        : acc
    );

    setAccounts(updatedAccounts);
    localStorage.setItem("app_accounts", JSON.stringify(updatedAccounts));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditType("");
    setEditBalance("");
    setEditKeywords("");
    setKeywordError("");
  };

  const deleteTransactionCount = (accountId: string): number => {
    try {
      const txns = JSON.parse(localStorage.getItem("app_transactions") || "[]");
      return txns.filter((t: any) => t.accountId === accountId).length;
    } catch { return 0; }
  };

  const confirmDelete = (accountId: string) => {
    // Move all transactions to account_deleted
    try {
      const txns = JSON.parse(localStorage.getItem("app_transactions") || "[]");
      const updated = txns.map((t: any) =>
        t.accountId === accountId ? { ...t, accountId: "account_deleted" } : t
      );
      localStorage.setItem("app_transactions", JSON.stringify(updated));
    } catch {}
    // Remove account from list
    const updatedAccounts = accounts.filter((a) => a.id !== accountId);
    setAccounts(updatedAccounts);
    localStorage.setItem("app_accounts", JSON.stringify(updatedAccounts));
    setDeleteConfirmId(null);
    setEditingId(null);
  };

  const handleGripClick = (accountId: string) => {
    if (reorderSelectedId === null) {
      setReorderSelectedId(accountId);
    } else if (reorderSelectedId === accountId) {
      setReorderSelectedId(null);
    } else {
      // Swap the two — keep account_deleted always last
      const reorderableAccounts = accounts.filter((a) => a.id !== "account_deleted");
      const deletedAccount = accounts.find((a) => a.id === "account_deleted");
      const firstIdx = reorderableAccounts.findIndex((a) => a.id === reorderSelectedId);
      const secondIdx = reorderableAccounts.findIndex((a) => a.id === accountId);
      const newList = [...reorderableAccounts];
      [newList[firstIdx], newList[secondIdx]] = [newList[secondIdx], newList[firstIdx]];
      const finalList = deletedAccount ? [...newList, deletedAccount] : newList;
      setAccounts(finalList);
      localStorage.setItem("app_accounts", JSON.stringify(finalList));
      setReorderSelectedId(null);
    }
  };

  const openTransferModal = () => {
    setShowTransferModal(true);
    setTransferFromId(null);
    setTransferToId(null);
    setTransferAmount("");
    setTransferDate(new Date().toISOString().split("T")[0]);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setShowTimePicker(false);
    setTransferFromId(null);
    setTransferToId(null);
    setTransferAmount("");
  };

  const handleTransfer = () => {
    if (!transferFromId || !transferToId || !transferAmount || transferFromId === transferToId) {
      alert("Please select different accounts and enter amount");
      return;
    }

    const amount = parseFloat(transferAmount);
    if (amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === transferFromId) {
        return { ...acc, balance: (acc.balance || 0) - amount };
      }
      if (acc.id === transferToId) {
        return { ...acc, balance: (acc.balance || 0) + amount };
      }
      return acc;
    });

    setAccounts(updatedAccounts);
    // Save to localStorage
    localStorage.setItem("app_accounts", JSON.stringify(updatedAccounts));

    closeTransferModal();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Accounts</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setNewAccName(""); setNewAccType("savings account"); setNewAccBalance("0"); setNewAccIconId("wallet"); setNewAccKeywords(""); setNewAccKeywordError(""); setShowAddForm(true); }}
              className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
              title="Add account"
            >
              <Plus size={24} />
            </button>
            <button
              onClick={openTransferModal}
              className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-500 rounded-lg transition-colors text-sm font-semibold"
              title="Transfer between accounts"
            >
              <span>Transfer</span>
              <ArrowRightLeft size={20} />
            </button>
          </div>
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
                      <label className="text-xs font-semibold text-slate-600">Account Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Account Type</label>
                      <input
                        type="text"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="เช่น credit card, savings account"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Start Balance</label>
                      <input
                        type="number"
                        value={editBalance}
                        onChange={(e) => setEditBalance(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Keywords (คั่นด้วยจุลภาค)</label>
                      <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => { setEditKeywords(e.target.value); setKeywordError(""); }}
                        className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${keywordError ? "border-red-400" : "border-slate-300"}`}
                        placeholder="เช่น กรุงศรี, อยุธยา"
                      />
                      {keywordError && (
                        <p className="text-xs text-red-500 mt-1">{keywordError}</p>
                      )}
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
                    {account.id !== "account_deleted" && (
                      <button
                        onClick={() => setDeleteConfirmId(account.id)}
                        className="w-full px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 size={15} />
                        Delete Account
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`flex items-start gap-2 rounded-lg transition-colors ${reorderSelectedId === account.id ? "bg-indigo-50 -mx-1 px-1" : ""}`}>
                    {account.id !== "account_deleted" ? (
                      <button
                        onClick={() => handleGripClick(account.id)}
                        className={`mt-1 p-1 rounded transition-colors flex-shrink-0 ${
                          reorderSelectedId === account.id
                            ? "text-indigo-600 bg-indigo-100"
                            : reorderSelectedId !== null
                            ? "text-indigo-400 hover:text-indigo-600"
                            : "text-slate-300 hover:text-slate-500"
                        }`}
                      >
                        <GripVertical size={18} />
                      </button>
                    ) : (
                      <div className="w-7 flex-shrink-0" />
                    )}
                    <div className="flex items-start justify-between flex-1">
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
                    {account.id !== "account_deleted" && (
                      <button
                        onClick={() => startEditing(account)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-indigo-600"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add Account</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Account Name</label>
              <input
                type="text"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="e.g. My Bank"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Account Type</label>
              <input
                type="text"
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="เช่น credit card, savings account"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Initial Balance</label>
              <input
                type="number"
                value={newAccBalance}
                onChange={(e) => setNewAccBalance(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Keywords (คั่นด้วยจุลภาค)</label>
              <input
                type="text"
                value={newAccKeywords}
                onChange={(e) => { setNewAccKeywords(e.target.value); setNewAccKeywordError(""); }}
                className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${newAccKeywordError ? "border-red-400" : "border-slate-300"}`}
                placeholder="เช่น กรุงศรี, อยุธยา"
              />
              {newAccKeywordError && (
                <p className="text-xs text-red-500 mt-1">{newAccKeywordError}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {accIconOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setNewAccIconId(opt.id)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                        newAccIconId === opt.id
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddAccount}
                disabled={!newAccName.trim()}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (() => {
        const acc = accounts.find((a) => a.id === deleteConfirmId);
        const count = deleteTransactionCount(deleteConfirmId);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 size={20} className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-slate-900">ลบ Account</h2>
              </div>
              <p className="text-sm text-slate-700">
                Account <span className="font-semibold">"{acc?.name}"</span> มี{" "}
                <span className="font-bold text-red-600">{count} รายการ</span> ที่ใช้งานอยู่
              </p>
              <p className="text-sm text-slate-500">
                ถ้ายืนยัน รายการทั้งหมดจะย้ายไปอยู่ใน <span className="font-semibold text-slate-700">Account Deleted</span> และลบ account นี้ออก
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => confirmDelete(deleteConfirmId)}
                  className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  ยืนยันลบ
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Transfer Money</h2>

            {/* From Account */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                From Account
              </label>
              <select
                value={transferFromId || ""}
                onChange={(e) => setTransferFromId(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select account to withdraw</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (฿{acc.balance?.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* To Account */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                To Account
              </label>
              <select
                value={transferToId || ""}
                onChange={(e) => setTransferToId(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select account to deposit</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (฿{acc.balance?.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                Amount
              </label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="0"
              />
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                Date
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            {/* Time */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                Time
              </label>
              <button
                onClick={() => setShowTimePicker(true)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-left bg-white hover:bg-slate-50 transition-colors"
              >
                {transferTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleTransfer}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Transfer
              </button>
              <button
                onClick={closeTransferModal}
                className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <TimePicker
          value={transferTime}
          onChange={setTransferTime}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </div>
  );
}
