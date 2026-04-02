import { lk } from "../utils/ledgerStorage";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Edit2, ArrowRightLeft, Trash2, GripVertical, Plus, X, Lock } from "lucide-react";
import CloudAuthModal from "../components/CloudAuthModal";
import PremiumModal from "../components/PremiumModal";
import { markDeleted, syncPush } from "../utils/syncService";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { useT } from "../hooks/useT";
import TransferModal from "../components/TransferModal";
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
  { id: "kbank", name: "K-Bank-sample", type: "savings account", icon: Smartphone, balance: 0, keywords: ["กสิกร"] },
  { id: "scb", name: "SCB-sample", type: "savings account", icon: CreditCard, balance: 0, keywords: ["ไทยพาณิชย์"] },
  { id: "bbl", name: "Bangkok Bank-sample", type: "savings account", icon: Building2, balance: 0, keywords: ["แบงค์กรุงเทพ"] },
  { id: "account_deleted", name: "Account Deleted", type: "deleted", icon: Trash2, balance: 0, keywords: [] },
];


export default function AccountsManagement() {
  const navigate = useNavigate();
  const T = useT();
  useSwipeBack();
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const stored = localStorage.getItem(lk("app_accounts"));
      let list: Account[] = defaultAccounts;
      if (stored) {
        const storedAccounts = JSON.parse(stored);
        list = storedAccounts
          .map((acc: any) => {
            if (!acc || !acc.id) return null;
            const defaultAcc = defaultAccounts.find((d) => d.id === acc.id);
            if (!defaultAcc) {
              // Legacy default IDs (before slim-down refactor) — preserve them
              const legacyAccIconMap: Record<string, React.ComponentType<any>> = {
                uob: CreditCard, banka: CreditCard, krungsri: Wallet, bangkok: CreditCard,
                kasikorn: CreditCard, tmb: Wallet, acme: CreditCard, cash: Banknote,
                crypto: TrendingUp, baht_pay: Smartphone, other_acc: MoreHorizontal,
                revolut: CreditCard, wise: Wallet, stripe: CreditCard, paypal: Banknote,
              };
              if (legacyAccIconMap[acc.id]) return { ...acc, icon: legacyAccIconMap[acc.id] };
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
  const [editKeywords, setEditKeywords] = useState("");
  const [editIconId, setEditIconId] = useState("other");
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [keywordError, setKeywordError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPointerY = useRef(0);
  const dragBoundsRef = useRef({ top: 80, bottom: window.innerHeight - 80 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("savings account");
  const [newAccBalance, setNewAccBalance] = useState("0");
  const [newAccIconId, setNewAccIconId] = useState("other");
  const [newAccKeywords, setNewAccKeywords] = useState("");
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

  // Notify home page (Index.tsx) whenever account list changes
  const isFirstRenderAcc = useRef(true);
  useEffect(() => {
    if (isFirstRenderAcc.current) { isFirstRenderAcc.current = false; return; }
    window.dispatchEvent(new CustomEvent("app-data-updated"));
  }, [accounts]);

  // Free-tier downgrade: strip keywords > 1 per account and push to server
  useEffect(() => {
    const premium = localStorage.getItem("app_premium") === "true";
    if (premium) return;
    const hasExtra = accounts.some((a) => (a.keywords || []).length > 1);
    if (!hasExtra) return;
    const now = new Date().toISOString();
    const stripped = accounts.map((a) => ({ ...a, keywords: (a.keywords || []).slice(0, 1), updated_at: now }));
    setAccounts(stripped);
    localStorage.setItem(lk("app_accounts"), JSON.stringify(stripped));
    const token = localStorage.getItem("cloud_token");
    if (token) syncPush(token).catch(() => {});
  }, []);

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

    const keywords = newAccKeywords.replace(/，/g, ",").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

    // Free-tier: max 1 keyword per account
    if (!isPremium && keywords.length > 1) {
      showPremium(T("acc.free_keyword_limit"));
      return;
    }

    // Validate: keywords must not already exist in other accounts or categories
    const storedCategories = JSON.parse(localStorage.getItem(lk("app_categories")) || "[]");
    for (const kw of keywords) {
      const dupAcc = accounts.find((a) => (a.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupAcc) {
        setNewAccKeywordError(T("acc.keyword_duplicate", { kw, name: dupAcc.name }));
        return;
      }
      const dupCat = storedCategories.find((c: any) => (c.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupCat) {
        setNewAccKeywordError(T("acc.keyword_duplicate", { kw, name: dupCat.name }));
        return;
      }
    }

    const iconEntry = accIconOptions.find((o) => o.id === newAccIconId) || accIconOptions[accIconOptions.length - 1];
    const newId = `custom_acc_${Date.now()}`;
    const isPreSync = !localStorage.getItem(lk("last_sync_at"));
    const newAcc: Account & { iconId?: string; source?: string } = {
      id: newId,
      name: newAccName.trim(),
      type: newAccType.trim(),
      icon: iconEntry.icon,
      iconId: newAccIconId,
      balance: parseFloat(newAccBalance) || 0,
      keywords,
      updated_at: new Date().toISOString(),
      ...(isPreSync ? { source: "local" } : {}),
    };
    const deletedAcc = accounts.find((a) => a.id === "account_deleted");
    const rest = accounts.filter((a) => a.id !== "account_deleted");
    const updated = deletedAcc ? [...rest, newAcc, deletedAcc] : [...rest, newAcc];
    setAccounts(updated);
    localStorage.setItem(lk("app_accounts"), JSON.stringify(updated));
    setNewAccName(""); setNewAccType("savings account"); setNewAccBalance("0"); setNewAccIconId("other");
    setNewAccKeywords(""); setNewAccKeywordError("");
    setShowAddForm(false);
  };

  const [showTransferModal, setShowTransferModal] = useState(false);

  const startEditing = (account: Account & { iconId?: string }) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditType(account.type);
    setEditBalance(account.balance?.toString() || "0");
    setEditKeywords((account.keywords || []).join(", "));
    const matchedOpt = accIconOptions.find((o) => o.icon === account.icon);
    setEditIconId(account.iconId || matchedOpt?.id || "other");
    setShowEditIconPicker(false);
    setKeywordError("");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    const keywords = editKeywords.replace(/，/g, ",").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

    // Free-tier: max 1 keyword per account
    if (!isPremium && keywords.length > 1) {
      showPremium(T("acc.free_keyword_limit"));
      return;
    }

    // Validate: keywords must not already exist in other accounts or any category
    const otherAccs = accounts.filter((a) => a.id !== editingId);
    const storedCategories = JSON.parse(localStorage.getItem(lk("app_categories")) || "[]");

    for (const kw of keywords) {
      const dupAcc = otherAccs.find((a) => (a.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupAcc) {
        setKeywordError(T("acc.keyword_duplicate", { kw, name: dupAcc.name }));
        return;
      }
      const dupCat = storedCategories.find((c: any) => (c.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupCat) {
        setKeywordError(T("acc.keyword_duplicate", { kw, name: dupCat.name }));
        return;
      }
    }

    setKeywordError("");
    const iconEntry = accIconOptions.find((o) => o.id === editIconId) || accIconOptions[accIconOptions.length - 1];
    const updatedAccounts = accounts.map((acc) =>
      acc.id === editingId
        ? { ...acc, name: editName, type: editType, balance: parseFloat(editBalance) || 0, keywords, icon: iconEntry.icon, iconId: editIconId, updated_at: new Date().toISOString() }
        : acc
    );

    setAccounts(updatedAccounts);
    localStorage.setItem(lk("app_accounts"), JSON.stringify(updatedAccounts));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditType("");
    setEditBalance("");
    setEditKeywords("");
    setEditIconId("other");
    setShowEditIconPicker(false);
    setKeywordError("");
  };

  const deleteTransactionCount = (accountId: string): number => {
    try {
      const txns = JSON.parse(localStorage.getItem(lk("app_transactions")) || "[]");
      return txns.filter((t: any) => t.accountId === accountId).length;
    } catch { return 0; }
  };

  const confirmDelete = (accountId: string) => {
    // Move all transactions to account_deleted
    try {
      const txns = JSON.parse(localStorage.getItem(lk("app_transactions")) || "[]");
      const updated = txns.map((t: any) =>
        t.accountId === accountId ? { ...t, accountId: "account_deleted" } : t
      );
      localStorage.setItem(lk("app_transactions"), JSON.stringify(updated));
    } catch {}
    // Remove account from list
    const deletedAcc = accounts.find((a) => a.id === accountId);
    if (deletedAcc) markDeleted("account", deletedAcc);
    const updatedAccounts = accounts.filter((a) => a.id !== accountId);
    setAccounts(updatedAccounts);
    localStorage.setItem(lk("app_accounts"), JSON.stringify(updatedAccounts));
    setDeleteConfirmId(null);
    setEditingId(null);
  };

  const findDragOver = (y: number) => {
    for (const id of Object.keys(itemRefs.current)) {
      const el = itemRefs.current[id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setDragOverId(id);
        return;
      }
    }
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!draggingId) return;
    const y = e.clientY;
    lastPointerY.current = y;
    findDragOver(y);

    const scrollSpeed = 8;
    stopAutoScroll();
    if (y < dragBoundsRef.current.top) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, -scrollSpeed);
        findDragOver(lastPointerY.current);
      }, 16);
    } else if (y > dragBoundsRef.current.bottom) {
      scrollIntervalRef.current = setInterval(() => {
        window.scrollBy(0, scrollSpeed);
        findDragOver(lastPointerY.current);
      }, 16);
    }
  };

  const handleDragEnd = (fromId: string) => {
    stopAutoScroll();
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
        localStorage.setItem(lk("app_accounts"), JSON.stringify(finalList));
      }
    }
    setDraggingId(null);
    setDragOverId(null);
  };


  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-theme-600 to-theme-700 text-white px-4 pb-4 pt-safe-header sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-theme-500 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">{T("nav.accounts")}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const atLimit = accounts.filter((a) => a.id !== "account_deleted").length >= FREE_ACC_LIMIT;
                if (atLimit) {
                  const token = localStorage.getItem("cloud_token");
                  if (!token) { setShowCloudAuth(true); return; }
                  if (!isPremium) { showPremium(T("acc.free_acc_limit", { limit: FREE_ACC_LIMIT })); return; }
                }
                setNewAccName(""); setNewAccType("savings account"); setNewAccBalance("0"); setNewAccIconId("other"); setNewAccKeywords(""); setNewAccKeywordError(""); setShowAddForm(true);
              }}
              className="p-2 hover:bg-theme-500 rounded-lg transition-colors"
              title="Add account"
            >
              <Plus size={24} />
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-theme-500 rounded-lg transition-colors text-sm font-semibold"
              title={T("acc.transfer")}
            >
              <span>{T("acc.transfer")}</span>
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
                className={`bg-white rounded-lg border p-4 transition-all select-none ${
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
                      <label className="text-xs font-semibold text-slate-600">{T("acc.name_label")}</label>
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
                      <label className="text-xs font-semibold text-slate-600">{T("acc.type_label")}</label>
                      <input
                        type="text"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder={T("acc.type_placeholder")}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">{T("acc.start_balance_label")}</label>
                      <input
                        type="number"
                        value={editBalance}
                        onChange={(e) => setEditBalance(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">{T("acc.keywords_label")}</label>
                      <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => { setEditKeywords(e.target.value); setKeywordError(""); }}
                        className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${keywordError ? "border-red-400" : "border-slate-300"}`}
                        placeholder={T("acc.keywords_placeholder")}
                      />
                      {keywordError && <p className="text-xs text-red-500 mt-1">{keywordError}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 px-3 py-2 bg-theme-600 text-white rounded-lg text-sm font-semibold hover:bg-theme-700 transition-colors"
                      >
                        {T("save")}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
                      >
                        {T("cancel")}
                      </button>
                    </div>
                    {account.id !== "account_deleted" && (
                      <button
                        onClick={() => setDeleteConfirmId(account.id)}
                        className="w-full px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 size={15} />
                        {T("acc.delete_btn")}
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
                          const headerEl = document.querySelector('.sticky.top-0') as HTMLElement | null;
                          const navEl = document.querySelector('.fixed.bottom-0') as HTMLElement | null;
                          dragBoundsRef.current = {
                            top: headerEl ? headerEl.getBoundingClientRect().bottom : 80,
                            bottom: navEl ? navEl.getBoundingClientRect().top : window.innerHeight - 80,
                          };
                          setDraggingId(account.id);
                          setDragOverId(account.id);
                        }}
                        onPointerMove={handleDragMove}
                        onPointerUp={() => handleDragEnd(account.id)}
                        onPointerCancel={() => { stopAutoScroll(); setDraggingId(null); setDragOverId(null); }}
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
                          onClick={() => showPremium(T("acc.free_unlock", { limit: FREE_ACC_LIMIT }))}
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
              <h2 className="text-base font-bold text-slate-900">{T("add")} {T("nav.accounts").replace(/s$/, "")}</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto px-5 pb-2 space-y-4 flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-600">{T("acc.name_label")}</label>
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
                <label className="text-xs font-semibold text-slate-600">{T("acc.type_label")}</label>
                <input
                  type="text"
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="เช่น credit card, savings account"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">{T("acc.start_balance_label")}</label>
                <input
                  type="number"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">{T("acc.keywords_label")}</label>
                <input
                  type="text"
                  value={newAccKeywords}
                  onChange={(e) => { setNewAccKeywords(e.target.value); setNewAccKeywordError(""); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${newAccKeywordError ? "border-red-400" : "border-slate-300"}`}
                  placeholder="กสิกร, kbank, เขียว"
                />
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
                {T("add")}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-3 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-colors"
              >
                {T("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <PremiumModal
          message={premiumMessage}
          onClose={() => setShowPremiumModal(false)}
          onSignUp={() => setShowCloudAuth(true)}
        />
      )}

      {showCloudAuth && (
        <CloudAuthModal
          onClose={() => setShowCloudAuth(false)}
          onSuccess={(premium) => {
            setShowCloudAuth(false);
            if (premium) {
              setNewAccName(""); setNewAccType("savings account"); setNewAccBalance("0"); setNewAccIconId("other"); setNewAccKeywords(""); setNewAccKeywordError(""); setShowAddForm(true);
            } else {
              showPremium(T("acc.free_acc_limit", { limit: FREE_ACC_LIMIT }));
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
                <h2 className="text-base font-bold text-slate-900">{T("acc.delete_title")}</h2>
              </div>
              <p className="text-sm text-slate-700">
                Account <span className="font-semibold">"{acc?.name}"</span> {T("has")}{" "}
                <span className="font-bold text-red-600">{count} {T("items")}</span> {T("items_in_use")}
              </p>
              <p className="text-sm text-slate-500">{T("acc.delete_warning")}</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => confirmDelete(deleteConfirmId)}
                  className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  {T("confirm_delete")}
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
                >
                  {T("cancel")}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          onClose={() => setShowTransferModal(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
