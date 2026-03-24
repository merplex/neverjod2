import { useState } from "react";
import { ChevronLeft, Edit2, Plus, X } from "lucide-react";
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
];

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditKeywords((category.keywords || []).join(", "));
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    const keywords = editKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    setCategories(
      categories.map((cat) =>
        cat.id === editingId
          ? { ...cat, name: editName, keywords }
          : cat
      )
    );
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditKeywords("");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Categories</h1>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="max-w-md mx-auto px-4 py-4 bg-white border-b border-slate-200 sticky top-16 z-10">
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryType("expense")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              categoryType === "expense"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => setCategoryType("income")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              categoryType === "income"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Income
          </button>
        </div>
      </div>

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
                      <label className="text-xs font-semibold text-slate-600">
                        Category Name
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
                        Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={editKeywords}
                        onChange={(e) => setEditKeywords(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="e.g., food, dining, restaurant"
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
                    <button
                      onClick={() => startEditing(category)}
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
    </div>
  );
}
