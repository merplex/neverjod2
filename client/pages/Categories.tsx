import { useState } from "react";
import { ChevronLeft, Edit2, Plus, X, Lock, Trash2, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap, Wind, Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal, CreditCard, Wallet, Smartphone, Banknote } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: React.ComponentType<any>;
  keywords?: string[];
}

const defaultCategories: Category[] = [
  { id: "food", name: "Food", type: "expense", icon: Utensils, keywords: [] },
  { id: "transport", name: "Transport", type: "expense", icon: Bus, keywords: [] },
  { id: "entertainment", name: "Entertainment", type: "expense", icon: Music, keywords: [] },
  { id: "shopping", name: "Shopping", type: "expense", icon: ShoppingCart, keywords: [] },
  { id: "bills", name: "Bills", type: "expense", icon: FileText, keywords: [] },
  { id: "health", name: "Health", type: "expense", icon: Heart, keywords: [] },
  { id: "education", name: "Education", type: "expense", icon: BookOpen, keywords: [] },
  { id: "utilities", name: "Utilities", type: "expense", icon: Zap, keywords: [] },
  { id: "salary", name: "Salary", type: "income", icon: TrendingUp, keywords: [] },
  { id: "bonus", name: "Bonus", type: "income", icon: Gift, keywords: [] },
  { id: "freelance", name: "Freelance", type: "income", icon: Banknote, keywords: [] },
  { id: "other", name: "Other", type: "expense", icon: MoreHorizontal, keywords: [] },
  { id: "travel", name: "Travel", type: "expense", icon: Plane, keywords: [] },
  { id: "gifts", name: "Gifts", type: "expense", icon: Gift, keywords: [] },
  { id: "sports", name: "Sports", type: "expense", icon: Dumbbell, keywords: [] },
  { id: "clothing", name: "Clothing", type: "expense", icon: ShoppingBag, keywords: [] },
  { id: "investment", name: "Investment", type: "income", icon: TrendingUp, keywords: [] },
  { id: "rental", name: "Rental", type: "income", icon: CreditCard, keywords: [] },
  { id: "food_delivery", name: "Food Delivery", type: "expense", icon: Utensils, keywords: [] },
  { id: "subscription", name: "Subscription", type: "expense", icon: Zap, keywords: [] },
  { id: "insurance", name: "Insurance", type: "expense", icon: FileText, keywords: [] },
  { id: "car", name: "Car", type: "expense", icon: Bus, keywords: [] },
  { id: "phone", name: "Phone", type: "expense", icon: Smartphone, keywords: [] },
  { id: "internet", name: "Internet", type: "expense", icon: Zap, keywords: [] },
  { id: "hobby", name: "Hobby", type: "expense", icon: Music, keywords: [] },
  { id: "pets", name: "Pets", type: "expense", icon: Heart, keywords: [] },
  { id: "childcare", name: "Childcare", type: "expense", icon: Gift, keywords: [] },
  { id: "loan", name: "Loan", type: "expense", icon: FileText, keywords: [] },
  { id: "nocat", name: "No Category", type: "expense", icon: MoreHorizontal, keywords: [] },
];

const iconOptions = [
  { id: "food", icon: Utensils }, { id: "transport", icon: Bus }, { id: "entertainment", icon: Music },
  { id: "shopping", icon: ShoppingCart }, { id: "bills", icon: FileText }, { id: "health", icon: Heart },
  { id: "education", icon: BookOpen }, { id: "utilities", icon: Zap }, { id: "travel", icon: Plane },
  { id: "clothing", icon: ShoppingBag }, { id: "sports", icon: Dumbbell }, { id: "gifts", icon: Gift },
  { id: "salary", icon: TrendingUp }, { id: "card", icon: CreditCard }, { id: "wallet", icon: Wallet },
  { id: "phone", icon: Smartphone }, { id: "cash", icon: Banknote }, { id: "other", icon: MoreHorizontal },
];

export default function Categories() {
  const navigate = useNavigate();
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
              if (!cat.id.startsWith("custom_")) return null;
              const iconEntry = iconOptions.find((o) => o.id === cat.iconId) || iconOptions[iconOptions.length - 1];
              return { ...cat, icon: iconEntry.icon };
            }
            return { ...cat, icon: defaultCat.icon };
          })
          .filter((cat: any) => cat !== null);
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
  const [keywordError, setKeywordError] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [reorderSelectedId, setReorderSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIconId, setNewIconId] = useState("other");
  const [newKeywords, setNewKeywords] = useState("");
  const [newKeywordError, setNewKeywordError] = useState("");

  const handleAddCategory = () => {
    if (!newName.trim()) return;

    const keywords = newKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k);

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
    const newCat: Category & { iconId?: string } = { id: newId, name: newName.trim(), type: categoryType, icon: iconEntry.icon, iconId: newIconId, keywords };
    const updated = [...categories.filter((c) => c.id !== "nocat"), newCat, ...categories.filter((c) => c.id === "nocat")];
    setCategories(updated);
    localStorage.setItem("app_categories", JSON.stringify(updated));
    setNewName(""); setNewIconId("other"); setNewKeywords(""); setNewKeywordError(""); setShowAddForm(false);
  };

  const isProtected = (id: string) => id === "other" || id === "nocat";

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditKeywords((category.keywords || []).join(", "));
    setKeywordError("");
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    const keywords = editKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k);

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
    const updatedCategories = categories.map((cat) =>
      cat.id === editingId
        ? { ...cat, name: isProtected(editingId) ? cat.name : editName, keywords }
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
    const updatedCats = categories.filter((c) => c.id !== catId);
    setCategories(updatedCats);
    localStorage.setItem("app_categories", JSON.stringify(updatedCats));
    setDeleteConfirmId(null);
    setEditingId(null);
  };

  const handleGripClick = (catId: string) => {
    if (reorderSelectedId === null) {
      setReorderSelectedId(catId);
    } else if (reorderSelectedId === catId) {
      setReorderSelectedId(null);
    } else {
      // Swap within the same type, keep nocat always last
      const reorderable = categories.filter((c) => c.id !== "nocat");
      const nocatItem = categories.find((c) => c.id === "nocat");
      const firstIdx = reorderable.findIndex((c) => c.id === reorderSelectedId);
      const secondIdx = reorderable.findIndex((c) => c.id === catId);
      if (firstIdx !== -1 && secondIdx !== -1) {
        const newList = [...reorderable];
        [newList[firstIdx], newList[secondIdx]] = [newList[secondIdx], newList[firstIdx]];
        const finalList = nocatItem ? [...newList, nocatItem] : newList;
        setCategories(finalList);
        localStorage.setItem("app_categories", JSON.stringify(finalList));
      }
      setReorderSelectedId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Sticky header + tab controls wrapper */}
      <div className="sticky top-0 z-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-theme-600 to-theme-700 text-white px-4 py-4">
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
            onClick={() => { setNewName(""); setNewIconId("other"); setNewKeywords(""); setNewKeywordError(""); setShowAddForm(true); }}
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
                className="bg-white rounded-lg border border-slate-200 p-4"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        Category Name
                        {isProtected(category.id) && <Lock size={12} className="text-slate-400" />}
                      </label>
                      <input
                        type="text"
                        value={isProtected(category.id) ? category.name : editName}
                        onChange={(e) => !isProtected(category.id) && setEditName(e.target.value)}
                        readOnly={isProtected(category.id)}
                        className={`w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm ${isProtected(category.id) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Keywords (คั่นด้วยจุลภาค)
                      </label>
                      <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => { setEditKeywords(e.target.value); setKeywordError(""); }}
                        className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${keywordError ? "border-red-400" : "border-slate-300"}`}
                        placeholder="เช่น กิน, ข้าว, ร้านอาหาร"
                      />
                      {keywordError && (
                        <p className="text-xs text-red-500 mt-1">{keywordError}</p>
                      )}
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
                  <div className={`flex items-start gap-2 rounded-lg transition-colors ${reorderSelectedId === category.id ? "bg-theme-50 -mx-1 px-1" : ""}`}>
                    {category.id !== "nocat" ? (
                      <button
                        onClick={() => handleGripClick(category.id)}
                        className={`mt-1 p-1 rounded transition-colors flex-shrink-0 ${
                          reorderSelectedId === category.id
                            ? "text-theme-600 bg-theme-100"
                            : reorderSelectedId !== null
                            ? "text-theme-400 hover:text-theme-600"
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
                      <IconComponent size={24} className="text-theme-600 mt-1" />
                      <div>
                        <p className="font-semibold text-slate-900">{category.name}</p>
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
                      <button
                        onClick={() => startEditing(category)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-theme-600"
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

      {/* Add Category Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add {categoryType === "income" ? "Income" : "Expense"} Category</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={20} />
              </button>
            </div>
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
              <label className="text-xs font-semibold text-slate-600">Keywords (คั่นด้วยจุลภาค)</label>
              <input
                type="text"
                value={newKeywords}
                onChange={(e) => { setNewKeywords(e.target.value); setNewKeywordError(""); }}
                className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm ${newKeywordError ? "border-red-400" : "border-slate-300"}`}
                placeholder="เช่น กิน, ข้าว, ร้านอาหาร"
              />
              {newKeywordError && (
                <p className="text-xs text-red-500 mt-1">{newKeywordError}</p>
              )}
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
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddCategory}
                disabled={!newName.trim()}
                className="flex-1 px-3 py-2 bg-theme-600 text-white rounded-lg text-sm font-semibold hover:bg-theme-700 transition-colors disabled:opacity-50"
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
