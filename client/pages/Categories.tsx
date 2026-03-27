import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Edit2, Plus, X, Lock, Trash2, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap, Wind, Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal, CreditCard, Wallet, Smartphone, Banknote, Home, Car, Coffee, Briefcase, Star, Clock, Camera, Headphones, Wrench, Scissors, Flame, Leaf, Baby, Package, Truck, Train, Bike, Building2 } from "lucide-react";
import PremiumModal from "../components/PremiumModal";
import CloudAuthModal from "../components/CloudAuthModal";
import { markDeleted, syncPush } from "../utils/syncService";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: React.ComponentType<any>;
  keywords?: string[];
}

const FREE_CAT_LIMIT = 6;

const defaultCategories: Category[] = [
  { id: "food", name: "Food-sample", type: "expense", icon: Utensils, keywords: ["อาหาร"] },
  { id: "transport", name: "Transport-sample", type: "expense", icon: Bus, keywords: ["ค่ารถ"] },
  { id: "shopping", name: "Shopping-sample", type: "expense", icon: ShoppingCart, keywords: ["ผลาญเงิน"] },
  { id: "house", name: "House-sample", type: "expense", icon: Home, keywords: ["ของใช้ในบ้าน"] },
  { id: "travel", name: "Travel-sample", type: "expense", icon: Plane, keywords: ["เที่ยว"] },
  { id: "salary", name: "Salary-sample", type: "income", icon: TrendingUp, keywords: ["เงินเดือน"] },
  { id: "nocat", name: "No Category", type: "expense", icon: MoreHorizontal, keywords: [] },
];

const iconOptions = [
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

export default function Categories() {
  const navigate = useNavigate();
  useSwipeBack();
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const stored = localStorage.getItem("app_categories");
      let list: Category[] = defaultCategories;
      if (stored) {
        const storedCategories = JSON.parse(stored);
        list = storedCategories
          .map((cat: any) => {
            if (!cat || !cat.id) return null;
            const defaultCat = defaultCategories.find((d) => d.id === cat.id);
            if (!defaultCat) {
              // Legacy default IDs (before slim-down refactor) — preserve them
              const legacyCatIconMap: Record<string, React.ComponentType<any>> = {
                entertainment: Music, bills: FileText, health: Heart, education: BookOpen,
                utilities: Zap, salary: TrendingUp, bonus: Gift, freelance: Banknote,
                other: MoreHorizontal, gifts: Gift, sports: Dumbbell, clothing: ShoppingBag,
                investment: TrendingUp, rental: CreditCard, food_delivery: Utensils,
                subscription: Zap, insurance: FileText, car: Car, phone: Smartphone,
                internet: Zap, hobby: Music, pets: Heart, childcare: Gift, loan: FileText,
              };
              if (legacyCatIconMap[cat.id]) return { ...cat, icon: legacyCatIconMap[cat.id] };
              if (!cat.id.startsWith("custom_")) return null;
              const iconEntry = iconOptions.find((o) => o.id === cat.iconId) || iconOptions[iconOptions.length - 1];
              return { ...cat, icon: iconEntry.icon };
            }
            return { ...cat, icon: defaultCat.icon };
          })
          .filter((cat: any) => cat !== null);
      }
      // Ensure salary (default income) always exists
      if (!list.find((c) => c.id === "salary")) {
        const salaryDefault = defaultCategories.find((c) => c.id === "salary")!;
        const nocatIdx = list.findIndex((c) => c.id === "nocat");
        if (nocatIdx >= 0) {
          list = [...list.slice(0, nocatIdx), salaryDefault, ...list.slice(nocatIdx)];
        } else {
          list = [...list, salaryDefault];
        }
      }
      // Ensure nocat always exists
      if (!list.find((c) => c.id === "nocat")) {
        const nocatDefault = defaultCategories.find((c) => c.id === "nocat")!;
        list = [...list, nocatDefault];
      }
      return list;
    } catch (e) {
      return defaultCategories;
    }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editIconId, setEditIconId] = useState("other");
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [keywordError, setKeywordError] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIconId, setNewIconId] = useState("other");
  const [newKeywords, setNewKeywords] = useState("");
  const [newKeywordError, setNewKeywordError] = useState("");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState("");
  const [showCloudAuth, setShowCloudAuth] = useState(false);

  const isPremium = localStorage.getItem("app_premium") === "true";

  // Free-tier downgrade: strip keywords > 1 per category and push to server
  useEffect(() => {
    const premium = localStorage.getItem("app_premium") === "true";
    if (premium) return;
    const hasExtra = categories.some((c) => (c.keywords || []).length > 1);
    if (!hasExtra) return;
    const now = new Date().toISOString();
    const stripped = categories.map((c) => ({ ...c, keywords: (c.keywords || []).slice(0, 1), updated_at: now }));
    setCategories(stripped);
    localStorage.setItem("app_categories", JSON.stringify(stripped));
    const token = localStorage.getItem("cloud_token");
    if (token) syncPush(token).catch(() => {});
  }, []);

  // Categories over free limit (by position in list, excluding nocat) — locked when not premium
  const reorderableCats = categories.filter((c) => c.id !== "nocat");
  const isOverLimitCat = (catId: string) =>
    !isPremium && reorderableCats.findIndex((c) => c.id === catId) >= FREE_CAT_LIMIT;

  const showPremium = (msg: string) => {
    setPremiumMessage(msg);
    setShowPremiumModal(true);
  };

  const handleAddCategory = () => {
    if (!newName.trim()) return;

    const keywords = newKeywords.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

    // Validate: keywords must not already exist in other categories or accounts
    const storedAccounts = JSON.parse(localStorage.getItem("app_accounts") || "[]");
    for (const kw of keywords) {
      const dupCat = categories.find((c) => (c.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupCat) {
        setNewKeywordError(`Keyword "${kw}" ซ้ำกับที่มีอยู่ใน ${dupCat.name}`);
        return;
      }
      const dupAcc = storedAccounts.find((a: any) => (a.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupAcc) {
        setNewKeywordError(`Keyword "${kw}" ซ้ำกับที่มีอยู่ใน ${dupAcc.name}`);
        return;
      }
    }

    const iconEntry = iconOptions.find((o) => o.id === newIconId) || iconOptions[iconOptions.length - 1];
    const newId = `custom_${Date.now()}`;
    const newCat: Category & { iconId?: string } = { id: newId, name: newName.trim(), type: categoryType, icon: iconEntry.icon, iconId: newIconId, keywords, updated_at: new Date().toISOString() };
    const updated = [...categories.filter((c) => c.id !== "nocat"), newCat, ...categories.filter((c) => c.id === "nocat")];
    setCategories(updated);
    localStorage.setItem("app_categories", JSON.stringify(updated));
    setNewName(""); setNewIconId("other"); setNewKeywords(""); setNewKeywordError(""); setShowAddForm(false);
  };

  const isProtected = (id: string) => id === "nocat";

  const startEditing = (category: Category & { iconId?: string }) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditKeywords((category.keywords || []).join(", "));
    const matchedOpt = iconOptions.find((o) => o.icon === category.icon);
    setEditIconId(category.iconId || matchedOpt?.id || "other");
    setShowEditIconPicker(false);
    setKeywordError("");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    const keywords = editKeywords.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

    // Validate: keywords must not already exist in other categories or any account
    const otherCats = categories.filter((c) => c.id !== editingId);
    const storedAccounts = JSON.parse(localStorage.getItem("app_accounts") || "[]");

    for (const kw of keywords) {
      const dupCat = otherCats.find((c) => (c.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupCat) {
        setKeywordError(`Keyword "${kw}" ซ้ำกับที่มีอยู่ใน ${dupCat.name}`);
        return;
      }
      const dupAcc = storedAccounts.find((a: any) => (a.keywords || []).map((k: string) => k.toLowerCase()).includes(kw));
      if (dupAcc) {
        setKeywordError(`Keyword "${kw}" ซ้ำกับที่มีอยู่ใน ${dupAcc.name}`);
        return;
      }
    }

    setKeywordError("");
    const iconEntry = iconOptions.find((o) => o.id === editIconId) || iconOptions[iconOptions.length - 1];
    const updatedCategories = categories.map((cat) =>
      cat.id === editingId
        ? { ...cat, name: isProtected(editingId) ? cat.name : editName, keywords, icon: iconEntry.icon, iconId: editIconId, updated_at: new Date().toISOString() }
        : cat
    );

    setCategories(updatedCategories);
    localStorage.setItem("app_categories", JSON.stringify(updatedCategories));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditKeywords("");
    setEditIconId("other");
    setShowEditIconPicker(false);
    setKeywordError("");
  };

  const deleteTransactionCount = (catId: string): number => {
    try {
      const txns = JSON.parse(localStorage.getItem("app_transactions") || "[]");
      return txns.filter((t: any) => t.categoryId === catId).length;
    } catch { return 0; }
  };

  const confirmDelete = (catId: string) => {
    try {
      const txns = JSON.parse(localStorage.getItem("app_transactions") || "[]");
      const updated = txns.map((t: any) =>
        t.categoryId === catId ? { ...t, categoryId: "nocat" } : t
      );
      localStorage.setItem("app_transactions", JSON.stringify(updated));
    } catch {}
    const deletedCat = categories.find((c) => c.id === catId);
    if (deletedCat) markDeleted("category", deletedCat);
    const updatedCats = categories.filter((c) => c.id !== catId);
    setCategories(updatedCats);
    localStorage.setItem("app_categories", JSON.stringify(updatedCats));
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
      const reorderable = categories.filter((c) => c.id !== "nocat");
      const nocatItem = categories.find((c) => c.id === "nocat");
      const fromIdx = reorderable.findIndex((c) => c.id === fromId);
      const toIdx = reorderable.findIndex((c) => c.id === dragOverId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const newList = [...reorderable];
        const [removed] = newList.splice(fromIdx, 1);
        newList.splice(toIdx, 0, removed);
        const finalList = nocatItem ? [...newList, nocatItem] : newList;
        setCategories(finalList);
        localStorage.setItem("app_categories", JSON.stringify(finalList));
      }
    }
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-safe-content">
      {/* Sticky header + tab controls wrapper */}
      <div className="sticky top-0 z-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-theme-600 to-theme-700 text-white px-4 pb-4 pt-safe-header">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-theme-500 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">Categories</h1>
          </div>
          <button
            onClick={() => {
              const atLimit = categories.filter((c) => c.id !== "nocat").length >= FREE_CAT_LIMIT;
              if (atLimit) {
                // Over free limit — need premium
                const token = localStorage.getItem("cloud_token");
                if (!token) { setShowCloudAuth(true); return; }
                if (!isPremium) { showPremium(`แพลนฟรีเพิ่มได้สูงสุด ${FREE_CAT_LIMIT} หมวดหมู่\nอัปเกรด Premium เพื่อเพิ่มได้ไม่จำกัด`); return; }
              }
              setNewName(""); setNewIconId("other"); setNewKeywords(""); setNewKeywordError(""); setShowAddForm(true);
            }}
            className="p-2 hover:bg-theme-500 rounded-lg transition-colors"
            title="Add category"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="max-w-md mx-auto bg-white border-b border-slate-200">
        <div className="flex gap-2 px-4 py-4">
          <button
            onClick={() => setCategoryType("expense")}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
              categoryType === "expense"
                ? "bg-theme-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => setCategoryType("income")}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
              categoryType === "income"
                ? "bg-theme-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Income
          </button>
        </div>
      </div>
      </div>{/* end sticky wrapper */}

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="space-y-2">
          {categories.filter((c) => c.type === categoryType).map((category) => {
            const IconComponent = category.icon;
            const isEditing = editingId === category.id;

            return (
              <div
                key={category.id}
                ref={(el) => { itemRefs.current[category.id] = el; }}
                className={`bg-white rounded-lg border p-4 transition-all select-none ${
                  isOverLimitCat(category.id)
                    ? "border-amber-200 bg-amber-50/30"
                    : draggingId === category.id
                    ? "opacity-40 border-slate-200"
                    : dragOverId === category.id && draggingId !== null
                    ? "border-theme-400 ring-2 ring-theme-300"
                    : "border-slate-200"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        Category Name
                        {isProtected(category.id) && <Lock size={12} className="text-slate-400" />}
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={isProtected(category.id) ? category.name : editName}
                          onChange={(e) => !isProtected(category.id) && setEditName(e.target.value)}
                          readOnly={isProtected(category.id)}
                          className={`flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm ${isProtected(category.id) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                        />
                        {!isProtected(category.id) && (
                          <button
                            onClick={() => setShowEditIconPicker((v) => !v)}
                            className="flex-shrink-0 p-2 border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                            title="Change icon"
                          >
                            {(() => { const opt = iconOptions.find((o) => o.id === editIconId) || iconOptions[iconOptions.length - 1]; const Icon = opt.icon; return <Icon size={18} className="text-theme-600" />; })()}
                          </button>
                        )}
                      </div>
                      {showEditIconPicker && !isProtected(category.id) && (
                        <div className="mt-2 grid grid-cols-6 gap-2">
                          {iconOptions.map((opt) => {
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
                      <label className="text-xs font-semibold text-slate-600">Keywords <span className="font-normal text-slate-400">(คั่นด้วย ,)</span></label>
                      <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => { setEditKeywords(e.target.value); setKeywordError(""); }}
                        className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${keywordError ? "border-red-400" : "border-slate-300"}`}
                        placeholder="ค่าเดินทาง, ค่ารถ, รถไฟฟ้า"
                      />
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
                    {!isProtected(category.id) && (
                      <button
                        onClick={() => setDeleteConfirmId(category.id)}
                        className="w-full px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 size={15} />
                        Delete Category
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg transition-colors">
                    {category.id !== "nocat" && !isOverLimitCat(category.id) ? (
                      <button
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDraggingId(category.id);
                          setDragOverId(category.id);
                        }}
                        onPointerMove={handleDragMove}
                        onPointerUp={() => handleDragEnd(category.id)}
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
                      <div className="w-9 h-9 rounded-xl bg-theme-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconComponent size={20} className="text-theme-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-1">
                          {category.name}
                          {isOverLimitCat(category.id) && <Lock size={11} className="text-amber-500" />}
                        </p>
                        <p className="text-xs text-slate-500">
                          {category.type === "income" ? "Income" : "Expense"}
                        </p>
                        {category.keywords && category.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {category.keywords.map((keyword) => (
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
                    {category.id !== "nocat" && (
                      isOverLimitCat(category.id) ? (
                        <button
                          onClick={() => showPremium(`แพลนฟรีใช้งานได้ ${FREE_CAT_LIMIT} หมวดหมู่\nอัปเกรด Premium เพื่อปลดล็อคทุก category`)}
                          className="p-2 rounded-lg text-amber-400 hover:bg-amber-50 transition-colors"
                        >
                          <Lock size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditing(category)}
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

      {/* Add Category Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-[60]">
          <div className="bg-white rounded-t-2xl shadow-xl w-full max-w-sm flex flex-col" style={{ maxHeight: "60vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-base font-bold text-slate-900">Add {categoryType === "income" ? "Income" : "Expense"} Category</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto px-5 pb-2 space-y-4 flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-600">Category Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="e.g. Gaming"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Keywords <span className="font-normal text-slate-400">(คั่นด้วย ,)</span></label>
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => { setNewKeywords(e.target.value); setNewKeywordError(""); }}
                  className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${newKeywordError ? "border-red-400" : "border-slate-300"}`}
                  placeholder="ค่าเดินทาง, ค่ารถ, รถไฟฟ้า"
                />
                {newKeywordError && <p className="text-xs text-red-500 mt-1">{newKeywordError}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {iconOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setNewIconId(opt.id)}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                          newIconId === opt.id
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
                onClick={handleAddCategory}
                disabled={!newName.trim()}
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
              setNewName(""); setNewIconId("other"); setNewKeywords(""); setNewKeywordError(""); setShowAddForm(true);
            } else {
              showPremium(`แพลนฟรีเพิ่มได้สูงสุด ${FREE_CAT_LIMIT} หมวดหมู่\nอัปเกรด Premium เพื่อเพิ่มได้ไม่จำกัด`);
            }
          }}
        />
      )}

      {deleteConfirmId && (() => {
        const cat = categories.find((c) => c.id === deleteConfirmId);
        const count = deleteTransactionCount(deleteConfirmId);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 size={20} className="text-red-500" />
                </div>
                <h2 className="text-base font-bold text-slate-900">ลบ Category</h2>
              </div>
              <p className="text-sm text-slate-700">
                Category <span className="font-semibold">"{cat?.name}"</span> มี{" "}
                <span className="font-bold text-red-600">{count} รายการ</span> ที่ใช้งานอยู่
              </p>
              <p className="text-sm text-slate-500">
                ถ้ายืนยัน รายการทั้งหมดจะย้ายไปอยู่ใน{" "}
                <span className="font-semibold text-slate-700">No Category</span> และลบ category นี้ออก
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
    </div>
  );
}
