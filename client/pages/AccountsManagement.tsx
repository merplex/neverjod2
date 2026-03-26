import { useState, useRef } from "react";
import { ChevronLeft, Edit2, ArrowRightLeft, Trash2, GripVertical, Plus, X, Lock } from "lucide-react";
import CloudAuthModal from "../components/CloudAuthModal";
import PremiumModal from "../components/PremiumModal";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";
import TimePicker from "../components/TimePicker";
import { CreditCard, Wallet, Banknote, TrendingUp, Smartphone, MoreHorizontal, Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap, Plane, ShoppingBag, Dumbbell, Gift, Home, Car, Coffee, Briefcase, Star, Clock, Camera, Headphones, Wrench, Scissors, Flame, Leaf, Baby, Package, Truck, Train, Bike, Building2 } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  icon: React.ComponentType<any>;
  balance?: number;
  keywords?: string[];
}

const FREE_ACC_LIMIT = 3;

const defaultAccounts: Account[] = [
  { id: "kbank", name: "K-Bank", type: "savings account", icon: Smartphone, balance: 0, keywords: ["กสิกร"] },
  { id: "scb", name: "SCB", type: "savings account", icon: CreditCard, balance: 0, keywords: ["ไทยพาณิชย์"] },
  { id: "bbl", name: "Bangkok Bank", type: "savings account", icon: Building2, balance: 0, keywords: ["แบงค์กรุงเทพ"] },
  { id: "account_deleted", name: "Account Deleted", type: "deleted", icon: Trash2, balance: 0, keywords: [] },
];


export default function AccountsManagement() {
  const navigate = useNavigate();
  useSwipeBack();
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
                creditcard: CreditCard, card: CreditCard, wallet: Wallet, cash: Banknote,
                invest: TrendingUp, salary: TrendingUp, phone: Smartphone, other: MoreHorizontal,
                food: Utensils, transport: Bus, entertainment: Music, shopping: ShoppingCart,
                bills: FileText, health: Heart, education: BookOpen, utilities: Zap,
                travel: Plane, clothing: ShoppingBag, sports: Dumbbell, gifts: Gift,
                home: Home, car: Car, coffee: Coffee, briefcase: Briefcase, star: Star,
                clock: Clock, camera: Camera, headphones: Headphones, wrench: Wrench,
                scissors: Scissors, flame: Flame, leaf: Leaf, baby: Baby, package: Package,
                truck: Truck, train: Train, bike: Bike, building: Building2,
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
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editNewKeyword, setEditNewKeyword] = useState("");
  const [editIconId, setEditIconId] = useState("other");
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [keywordError, setKeywordError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("savings account");
  const [newAccBalance, setNewAccBalance] = useState("0");
  const [newAccIconId, setNewAccIconId] = useState("other");
  const [newAccKeywords, setNewAccKeywords] = useState<string[]>([]);
  const [newAccKeyword, setNewAccKeyword] = useState("");
  const [newAccKeywordError, setNewAccKeywordError] = useState("");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState("");
  const [showCloudAuth, setShowCloudAuth] = useState(false);

  const accIconOptions = [
    { id: "food", icon: Utensils }, { id: "transport", icon: Bus }, { id: "entertainment", icon: Music },
    { id: "shopping", icon: ShoppingCart }, { id: "bills", icon: FileText }, { id: "health", icon: Heart },
    { id: "education", icon: BookOpen }, { id: "utilities", icon: Zap }, { id: "travel", icon: Plane },
    { id: "clothing", icon: ShoppingBag }, { id: "sports", icon: Dumbbell }, { id: "gifts", icon: Gift },
    { id: "salary", icon: TrendingUp }, { id: "card", icon: CreditCard }, { id: "wallet", icon: Wallet },
    { id: "phone", icon: Smartphone }, { id: "cash", icon: Banknote }, { id: "other", icon: MoreHorizontal },
    { id: "home", icon: Home }, { id: "car", icon: Car }, { id: "coffee", icon: Coffee },
    { id: "briefcase", icon: Briefcase }, { id: "star", icon: Star }, { id: "clock", icon: Clock },
    { id: "camera", icon: Camera }, { id: "headphones", icon: Headphones }, { id: "wrench", icon: Wrench },
    { id: "scissors", icon: Scissors }, { id: "flame", icon: Flame }, { id: "leaf", icon: Leaf },
    { id: "baby", icon: Baby }, { id: "package", icon: Package }, { id: "truck", icon: Truck },
    { id: "train", icon: Train }, { id: "bike", icon: Bike }, { id: "building", icon: Building2 },
  ];

  const isPremium = localStorage.getItem("app_premium") === "true";

  // Accounts over free limit (by position in list, excluding account_deleted) — locked when not premium
  const reorderableAccs = accounts.filter((a) => a.id !== "account_deleted");
  const isOverLimitAcc = (accId: string) =>
    !isPremium && reorderableAccs.findIndex((a) => a.id === accId) >= FREE_ACC_LIMIT;

  const showPremium = (msg: string) => {
    setPremiumMessage(msg);
    setShowPremiumModal(true);
  };

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;

    const keywords = newAccKeywords;

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

    const iconEntry = accIconOptions.find((o) => o.id === newAccIconId) || accIconOptions[accIconOptions.length - 1];
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
    setNewAccName(""); setNewAccType("savings account"); setNewAccBalance("0"); setNewAccIconId("other");
    setNewAccKeywords([]); setNewAccKeyword(""); setNewAccKeywordError("");
    setShowAddForm(false);
  };

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | null>(null);
  const [transferToId, setTransferToId] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [transferTime, setTransferTime] = useState(new Date());

  const startEditing = (account: Account & { iconId?: string }) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditType(account.type);
    setEditBalance(account.balance?.toString() || "0");
    setEditKeywords(account.keywords || []);
    setEditNewKeyword("");
    const matchedOpt = accIconOptions.find((o) => o.icon === account.icon);
    setEditIconId(account.iconId || matchedOpt?.id || "other");
    setShowEditIconPicker(false);
    setKeywordError("");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    const keywords = editKeywords;

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
    const iconEntry = accIconOptions.find((o) => o.id === editIconId) || accIconOptions[accIconOptions.length - 1];
    const updatedAccounts = accounts.map((acc) =>
      acc.id === editingId
        ? { ...acc, name: editName, type: editType, balance: parseFloat(editBalance) || 0, keywords, icon: iconEntry.icon, iconId: editIconId }
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
    setEditKeywords([]);
    setEditNewKeyword("");
    setEditIconId("other");
    setShowEditIconPicker(false);
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

  const handleDragMove = (e: React.PointerEvent) => {
    if (!draggingId) return;
    const y = e.clientY;
    for (const id of Object.keys(itemRefs.current)) {
      const el = itemRefs.current[id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setDragOverId(id);
        break;
      }
    }
  };

  const handleDragEnd = (fromId: string) => {
    if (fromId && dragOverId && fromId !== dragOverId) {
      const reorderable = accounts.filter((a) => a.id !== "account_deleted");
      const deletedAccount = accounts.find((a) => a.id === "account_deleted");
      const fromIdx = reorderable.findIndex((a) => a.id === fromId);
      const toIdx = reorderable.findIndex((a) => a.id === dragOverId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const newList = [...reorderable];
        const [removed] = newList.splice(fromIdx, 1);
        newList.splice(toIdx, 0, removed);
        const finalList = deletedAccount ? [...newList, deletedAccount] : newList;
        setAccounts(finalList);
        localStorage.setItem("app_accounts", JSON.stringify(finalList));
      }
    }
    setDraggingId(null);
    setDragOverId(null);
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
      <div className="bg-gradient-to-br from-theme-600 to-theme-700 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-theme-500 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Accounts</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const atLimit = accounts.filter((a) => a.id !== "account_deleted").length >= FREE_ACC_LIMIT;
                if (atLimit) {
                  const token = localStorage.getItem("cloud_token");
                  if (!token) { setShowCloudAuth(true); return; }
                  if (!isPremium) { showPremium(`แพลนฟรีเพิ่มได้สูงสุด ${FREE_ACC_LIMIT} บัญชี\nอัปเกรด Premium เพื่อเพิ่มได้ไม่จำกัด`); return; }
                }
                setNewAccName(""); setNewAccType("savings account"); setNewAccBalance("0"); setNewAccIconId("other"); setNewAccKeywords([]); setNewAccKeyword(""); setNewAccKeywordError(""); setShowAddForm(true);
              }}
              className="p-2 hover:bg-theme-500 rounded-lg transition-colors"
              title="Add account"
            >
              <Plus size={24} />
            </button>
            <button
              onClick={openTransferModal}
              className="flex items-center gap-2 px-3 py-2 hover:bg-theme-500 rounded-lg transition-colors text-sm font-semibold"
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
                ref={(el) => { itemRefs.current[account.id] = el; }}
                className={`bg-white rounded-lg border p-4 transition-all ${
                  isOverLimitAcc(account.id)
                    ? "border-amber-200 bg-amber-50/30"
                    : draggingId === account.id
                    ? "opacity-40 border-slate-200"
                    : dragOverId === account.id && draggingId !== null
                    ? "border-theme-400 ring-2 ring-theme-300"
                    : "border-slate-200"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Account Name</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => setShowEditIconPicker((v) => !v)}
                          className="flex-shrink-0 p-2 border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                          title="Change icon"
                        >
                          {(() => { const opt = accIconOptions.find((o) => o.id === editIconId) || accIconOptions[accIconOptions.length - 1]; const Icon = opt.icon; return <Icon size={18} className="text-theme-600" />; })()}
                        </button>
                      </div>
                      {showEditIconPicker && (
                        <div className="mt-2 grid grid-cols-6 gap-2">
                          {accIconOptions.map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => { setEditIconId(opt.id); setShowEditIconPicker(false); }}
                                className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                                  editIconId === opt.id
                                    ? "bg-theme-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <Icon size={18} />
                              </button>
                            );
                          })}
                        </div>
                      )}
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
                      <label className="text-xs font-semibold text-slate-600">Keywords</label>
                      <div className={`mt-1 min-h-[42px] px-2 py-1.5 border rounded-lg flex flex-wrap gap-1 items-center ${keywordError ? "border-red-400" : "border-slate-300"}`}>
                        {editKeywords.map((kw) => (
                          <span key={kw} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            {kw}
                            <button
                              type="button"
                              onClick={() => { setEditKeywords((prev) => prev.filter((k) => k !== kw)); setKeywordError(""); }}
                              className="text-slate-400 hover:text-red-500 leading-none"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        {(isPremium || editKeywords.length < 1) && (
                          <input
                            type="text"
                            value={editNewKeyword}
                            onChange={(e) => {
                              setKeywordError("");
                              const val = e.target.value;
                              if (val.includes(",")) {
                                const parts = val.split(",").map((p) => p.trim().toLowerCase()).filter((p) => p);
                                const remaining = val.endsWith(",") ? "" : parts.pop() || "";
                                setEditKeywords((prev) => {
                                  const next = [...prev];
                                  for (const kw of parts) { if (!next.includes(kw)) next.push(kw); }
                                  return next;
                                });
                                setEditNewKeyword(remaining);
                              } else {
                                setEditNewKeyword(val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editNewKeyword.trim()) {
                                e.preventDefault();
                                const kw = editNewKeyword.trim().toLowerCase();
                                const el = e.currentTarget;
                                if (!editKeywords.includes(kw)) setEditKeywords((prev) => [...prev, kw]);
                                setEditNewKeyword("");
                                requestAnimationFrame(() => el.focus());
                              }
                            }}
                            onBlur={() => {
                              if (editNewKeyword.trim()) {
                                const kw = editNewKeyword.trim().toLowerCase();
                                if (!editKeywords.includes(kw)) setEditKeywords((prev) => [...prev, kw]);
                                setEditNewKeyword("");
                              }
                            }}
                            className="flex-1 min-w-[80px] text-sm outline-none bg-transparent py-1"
                            placeholder={editKeywords.length === 0 ? "พิมพ์แล้ว Enter" : "+ เพิ่ม keyword"}
                          />
                        )}
                      </div>
                      {keywordError && <p className="text-xs text-red-500 mt-1">{keywordError}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 px-3 py-2 bg-theme-600 text-white rounded-lg text-sm font-semibold hover:bg-theme-700 transition-colors"
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
                  <div className="flex items-start gap-2 rounded-lg transition-colors">
                    {account.id !== "account_deleted" && !isOverLimitAcc(account.id) ? (
                      <button
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDraggingId(account.id);
                          setDragOverId(account.id);
                        }}
                        onPointerMove={handleDragMove}
                        onPointerUp={() => handleDragEnd(account.id)}
                        onPointerCancel={() => { setDraggingId(null); setDragOverId(null); }}
                        className="mt-1 p-1 rounded transition-colors flex-shrink-0 text-slate-300 hover:text-slate-500 touch-none cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical size={18} />
                      </button>
                    ) : (
                      <div className="w-7 flex-shrink-0" />
                    )}
                    <div className="flex items-start justify-between flex-1">
                    <div className="flex items-start gap-3 flex-1">
                      <IconComponent size={24} className="text-theme-600 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-1">
                          {account.name}
                          {isOverLimitAcc(account.id) && <Lock size={11} className="text-amber-500" />}
                        </p>
                        <p className="text-xs text-slate-500">{account.type}</p>
                        <p className="text-sm font-semibold text-theme-600 mt-1">
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
                      isOverLimitAcc(account.id) ? (
                        <button
                          onClick={() => showPremium(`แพลนฟรีใช้งานได้ ${FREE_ACC_LIMIT} บัญชี\nอัปเกรด Premium เพื่อปลดล็อคทุก account`)}
                          className="p-2 rounded-lg text-amber-400 hover:bg-amber-50 transition-colors"
                        >
                          <Lock size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditing(account)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-theme-600"
                        >
                          <Edit2 size={18} />
                        </button>
                      )
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-[60]">
          <div className="bg-white rounded-t-2xl shadow-xl w-full max-w-sm flex flex-col" style={{ maxHeight: "60vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-slate-900">Add Account</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto px-5 pb-2 space-y-4 flex-1">
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
                <label className="text-xs font-semibold text-slate-600">Start Balance</label>
                <input
                  type="number"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Keywords</label>
                <div className={`mt-1 min-h-[42px] px-2 py-1.5 border rounded-lg flex flex-wrap gap-1 items-center ${newAccKeywordError ? "border-red-400" : "border-slate-300"}`}>
                  {newAccKeywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {kw}
                      <button
                        type="button"
                        onClick={() => { setNewAccKeywords((prev) => prev.filter((k) => k !== kw)); setNewAccKeywordError(""); }}
                        className="text-slate-400 hover:text-red-500 leading-none"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {(isPremium || newAccKeywords.length < 1) && (
                    <input
                      type="text"
                      value={newAccKeyword}
                      onChange={(e) => {
                        setNewAccKeywordError("");
                        const val = e.target.value;
                        if (val.includes(",")) {
                          const parts = val.split(",").map((p) => p.trim().toLowerCase()).filter((p) => p);
                          const remaining = val.endsWith(",") ? "" : parts.pop() || "";
                          setNewAccKeywords((prev) => {
                            const next = [...prev];
                            for (const kw of parts) { if (!next.includes(kw)) next.push(kw); }
                            return next;
                          });
                          setNewAccKeyword(remaining);
                        } else {
                          setNewAccKeyword(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newAccKeyword.trim()) {
                          e.preventDefault();
                          const kw = newAccKeyword.trim().toLowerCase();
                          const el = e.currentTarget;
                          if (!newAccKeywords.includes(kw)) setNewAccKeywords((prev) => [...prev, kw]);
                          setNewAccKeyword("");
                          requestAnimationFrame(() => el.focus());
                        }
                      }}
                      onBlur={() => {
                        if (newAccKeyword.trim()) {
                          const kw = newAccKeyword.trim().toLowerCase();
                          if (!newAccKeywords.includes(kw)) setNewAccKeywords((prev) => [...prev, kw]);
                          setNewAccKeyword("");
                        }
                      }}
                      className="flex-1 min-w-[80px] text-sm outline-none bg-transparent py-1"
                      placeholder={newAccKeywords.length === 0 ? "พิมพ์แล้ว Enter" : "+ เพิ่ม keyword"}
                    />
                  )}
                </div>
                {newAccKeywordError && <p className="text-xs text-red-500 mt-1">{newAccKeywordError}</p>}
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
                            ? "bg-theme-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Sticky buttons */}
            <div className="flex gap-2 px-5 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={handleAddAccount}
                disabled={!newAccName.trim()}
                className="flex-1 px-3 py-2.5 bg-theme-600 text-white rounded-xl text-sm font-semibold hover:bg-theme-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-3 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <PremiumModal message={premiumMessage} onClose={() => setShowPremiumModal(false)} />
      )}

      {showCloudAuth && (
        <CloudAuthModal
          onClose={() => setShowCloudAuth(false)}
          onSuccess={(premium) => {
            setShowCloudAuth(false);
            if (premium) {
              setNewAccName(""); setNewAccType("savings account"); setNewAccBalance("0"); setNewAccIconId("other"); setNewAccKeywords([]); setNewAccKeyword(""); setNewAccKeywordError(""); setShowAddForm(true);
            } else {
              showPremium(`แพลนฟรีเพิ่มได้สูงสุด ${FREE_ACC_LIMIT} บัญชี\nอัปเกรด Premium เพื่อเพิ่มได้ไม่จำกัด`);
            }
          }}
        />
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
                className="flex-1 px-3 py-2 bg-theme-600 text-white rounded-lg text-sm font-semibold hover:bg-theme-700 transition-colors"
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
