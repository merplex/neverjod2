import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Lock, LockOpen, Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap, Wind, Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal, CreditCard, Wallet, Smartphone, Banknote, X, Home, Car, Coffee, Briefcase, Star, Clock, Camera, Headphones, Wrench, Scissors, Flame, Leaf, Baby, Package, Truck, Train, Bike, Building2 } from "lucide-react";
import Carousel from "../components/Carousel";
import Recording from "../components/Recording";
import VoiceResultConfirmation from "../components/VoiceResultConfirmation";
import { matchCategory, matchAccount } from "../utils/keywordMatch";

type InputPage = "category" | "account" | "amount";

function saveTransaction(categoryId: string, accountId: string, amount: number, description = "") {
  const transaction = {
    id: Date.now().toString(),
    categoryId,
    accountId,
    amount,
    description: description.trim(),
    date: new Date().toISOString(),
  };
  const existing = JSON.parse(localStorage.getItem("app_transactions") || "[]");
  existing.unshift(transaction);
  localStorage.setItem("app_transactions", JSON.stringify(existing));
}

const categories = [
  { id: "food", name: "Food", type: "expense", icon: Utensils },
  { id: "transport", name: "Transport", type: "expense", icon: Bus },
  { id: "entertainment", name: "Entertainment", type: "expense", icon: Music },
  { id: "shopping", name: "Shopping", type: "expense", icon: ShoppingCart },
  { id: "bills", name: "Bills", type: "expense", icon: FileText },
  { id: "health", name: "Health", type: "expense", icon: Heart },
  { id: "education", name: "Education", type: "expense", icon: BookOpen },
  { id: "utilities", name: "Utilities", type: "expense", icon: Zap },
  { id: "salary", name: "Salary", type: "income", icon: TrendingUp },
  { id: "bonus", name: "Bonus", type: "income", icon: Gift },
  { id: "freelance", name: "Freelance", type: "income", icon: Banknote },
  { id: "other", name: "Other", type: "expense", icon: MoreHorizontal },
  { id: "travel", name: "Travel", type: "expense", icon: Plane },
  { id: "gifts", name: "Gifts", type: "expense", icon: Gift },
  { id: "sports", name: "Sports", type: "expense", icon: Dumbbell },
  { id: "clothing", name: "Clothing", type: "expense", icon: ShoppingBag },
  { id: "investment", name: "Investment", type: "income", icon: TrendingUp },
  { id: "rental", name: "Rental", type: "income", icon: CreditCard },
  { id: "food_delivery", name: "Food Delivery", type: "expense", icon: Utensils },
  { id: "subscription", name: "Subscription", type: "expense", icon: Zap },
  { id: "insurance", name: "Insurance", type: "expense", icon: FileText },
  { id: "car", name: "Car", type: "expense", icon: Bus },
  { id: "phone", name: "Phone", type: "expense", icon: Smartphone },
  { id: "internet", name: "Internet", type: "expense", icon: Zap },
  { id: "hobby", name: "Hobby", type: "expense", icon: Music },
  { id: "pets", name: "Pets", type: "expense", icon: Heart },
  { id: "childcare", name: "Childcare", type: "expense", icon: Gift },
  { id: "loan", name: "Loan", type: "expense", icon: FileText },
];

const accounts = [
  { id: "uob", name: "UOB", type: "credit card", icon: CreditCard },
  { id: "banka", name: "BankA", type: "debit card", icon: CreditCard },
  { id: "krungsri", name: "Krungsri", type: "savings account", icon: Wallet },
  { id: "bangkok", name: "Bangkok Bank", type: "credit card", icon: CreditCard },
  { id: "kasikorn", name: "Kasikornbank", type: "debit card", icon: CreditCard },
  { id: "tmb", name: "TMB", type: "savings account", icon: Wallet },
  { id: "scb", name: "SCB", type: "credit card", icon: CreditCard },
  { id: "acme", name: "ACME", type: "debit card", icon: CreditCard },
  { id: "cash", name: "Cash", type: "cash", icon: Banknote },
  { id: "crypto", name: "Crypto", type: "cryptocurrency", icon: TrendingUp },
  { id: "baht_pay", name: "Baht Pay", type: "digital wallet", icon: Smartphone },
  { id: "other_acc", name: "Other", type: "other", icon: MoreHorizontal },
  { id: "kbank", name: "K-Bank", type: "digital bank", icon: Smartphone },
  { id: "revolut", name: "Revolut", type: "digital wallet", icon: CreditCard },
  { id: "wise", name: "Wise", type: "digital bank", icon: Wallet },
  { id: "stripe", name: "Stripe", type: "payment gateway", icon: CreditCard },
  { id: "paypal", name: "PayPal", type: "digital wallet", icon: Banknote },
];

function readVoiceAutoStart(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
    return s.voiceAutoStart !== false; // default true
  } catch { return true; }
}

export default function Index() {
  const navigate = useNavigate();
  const [voiceAutoStart] = useState<boolean>(readVoiceAutoStart);
  const [currentPage, setCurrentPage] = useState<InputPage>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState(() => {
    // Load from localStorage if available, otherwise use defaults
    try {
      const stored = localStorage.getItem("app_categories");
      if (stored) {
        const storedCategories = JSON.parse(stored);
        const catIconMap: Record<string, React.ComponentType<any>> = {
          food: Utensils, transport: Bus, entertainment: Music, shopping: ShoppingCart,
          bills: FileText, health: Heart, education: BookOpen, utilities: Zap,
          travel: Plane, clothing: ShoppingBag, sports: Dumbbell, gifts: Gift,
          salary: TrendingUp, card: CreditCard, wallet: Wallet, phone: Smartphone,
          cash: Banknote, other: MoreHorizontal,
          home: Home, car: Car, coffee: Coffee, briefcase: Briefcase, star: Star,
          clock: Clock, camera: Camera, headphones: Headphones, wrench: Wrench,
          scissors: Scissors, flame: Flame, leaf: Leaf, baby: Baby, package: Package,
          truck: Truck, train: Train, bike: Bike, building: Building2,
        };
        // Restore icons from default categories since they can't be serialized
        return storedCategories
          .map((cat: any) => {
            if (!cat || !cat.id) return null;
            const defaultCat = categories.find((d) => d.id === cat.id);
            if (!defaultCat) {
              // Custom category — resolve icon by iconId
              if (!cat.id.startsWith("custom_")) {
                // Still try catIconMap for legacy IDs (old hardcoded defaults no longer in list)
                const fallback = catIconMap[cat.iconId] || catIconMap[cat.id];
                if (!fallback) return null;
                return { ...cat, icon: fallback };
              }
              const icon = catIconMap[cat.iconId] || MoreHorizontal;
              return { ...cat, icon };
            }
            return {
              ...cat,
              icon: defaultCat.icon,
            };
          })
          .filter((cat: any) => cat !== null);
      }
      return categories;
    } catch (e) {
      console.error("Error loading categories from localStorage:", e);
      return categories;
    }
  });
  const [accountsList, setAccountsList] = useState(() => {
    // Load from localStorage if available, otherwise use defaults
    try {
      const stored = localStorage.getItem("app_accounts");
      if (stored) {
        const storedAccounts = JSON.parse(stored);
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
        // Restore icons from default accounts since they can't be serialized
        return storedAccounts
          .map((acc: any) => {
            if (!acc || !acc.id) return null;
            const defaultAcc = accounts.find((d) => d.id === acc.id);
            if (!defaultAcc) {
              // Custom account — resolve icon by iconId
              if (!acc.id.startsWith("custom_acc_")) return null;
              const icon = iconMap[acc.iconId] || MoreHorizontal;
              return { ...acc, icon };
            }
            return {
              ...acc,
              icon: defaultAcc.icon,
            };
          })
          .filter((acc: any) => acc !== null);
      }
      return accounts;
    } catch (e) {
      console.error("Error loading accounts from localStorage:", e);
      return accounts;
    }
  });
  const [isCategoryReorderMode, setIsCategoryReorderMode] = useState(false);
  const [isAccountPageReorderMode, setIsAccountPageReorderMode] = useState(false);
  const [selectedCategoryForSwap, setSelectedCategoryForSwap] = useState<string | null>(null);
  const [selectedAccountForSwap, setSelectedAccountForSwap] = useState<string | null>(null);

  // Amount input state
  const [display, setDisplay] = useState("0");
  const [value, setValue] = useState(0);
  const [numpadSize, setNumpadSize] = useState(70);
  const [isLocked, setIsLocked] = useState(false);
  const [isRightMode, setIsRightMode] = useState(false);
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");

  // Calculator mode
  const [isCalcMode, setIsCalcMode] = useState(false);

  // Auto-start voice when category page is shown (only if voiceAutoStart is on)
  const [voiceStartTrigger, setVoiceStartTrigger] = useState(0);
  const [voiceStopTrigger, setVoiceStopTrigger] = useState(0);
  useEffect(() => {
    if (currentPage === "category" && voiceAutoStart) {
      setVoiceStartTrigger((n) => n + 1);
    }
  }, [currentPage]);

  // Voice result confirmation state
  const [showVoiceResult, setShowVoiceResult] = useState(false);
  const [voiceResultData, setVoiceResultData] = useState<{
    categoryId?: string;
    accountId?: string;
    amount?: number;
    categoryName?: string;
    accountName?: string;
    transcript?: string;
    isSuccess: boolean;
    isCategoryFallback?: boolean;
  }>({ isSuccess: false });
  const [liveVoiceStatus, setLiveVoiceStatus] = useState<{
    categoryId?: string; categoryName?: string;
    accountId?: string; accountName?: string;
    amount?: number;
  }>({});
  const allDetectedRef = useRef(false);

  const voiceTimeoutRef = useRef<NodeJS.Timeout>();
  const voiceAccumulatorRef = useRef<{
    categoryId?: string;
    accountId?: string;
    amount?: number;
    transcript?: string;
  }>({});

  // Refs for auto-save when app goes background / screen off / killed
  const showVoiceResultRef = useRef(false);
  const pendingVoiceResultRef = useRef<{ categoryId?: string; accountId?: string; amount?: number; transcript?: string }>({});

  useEffect(() => { showVoiceResultRef.current = showVoiceResult; }, [showVoiceResult]);
  useEffect(() => { pendingVoiceResultRef.current = voiceResultData; }, [voiceResultData]);

  useEffect(() => {
    const autoSave = () => {
      if (!showVoiceResultRef.current) return;
      const { categoryId, accountId, amount } = pendingVoiceResultRef.current;
      if (categoryId && accountId && amount) {
        saveTransaction(categoryId, accountId, amount, pendingVoiceResultRef.current.transcript);
        showVoiceResultRef.current = false; // prevent double-save
      }
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") autoSave(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", autoSave);
    window.addEventListener("beforeunload", autoSave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", autoSave);
      window.removeEventListener("beforeunload", autoSave);
    };
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    if (!isCategoryReorderMode) {
      setSelectedCategory(categoryId);
      setCurrentPage("account");
      setLiveVoiceStatus({});
      voiceAccumulatorRef.current = {};
      allDetectedRef.current = false;
    }
  };

  const exitCategoryReorderMode = () => {
    setIsCategoryReorderMode(false);
    setSelectedCategoryForSwap(null);
    // Persist reordered categories to localStorage so Categories page reflects it
    localStorage.setItem("app_categories", JSON.stringify(categoriesList));
  };

  // Calculator mode operator
  const handleOperator = (op: string) => {
    const last = display.slice(-1);
    if (['+', '-', '*', '/'].includes(last)) {
      setDisplay(display.slice(0, -1) + op);
    } else if (display !== "0") {
      setDisplay(display + op);
    }
  };

  const handleVoiceInput = (voiceData: {
    categoryId?: string;
    accountId?: string;
    amount?: number;
    description: string;
  }) => {
    // Accumulate voice data
    if (voiceData.categoryId) voiceAccumulatorRef.current.categoryId = voiceData.categoryId;
    if (voiceData.accountId) voiceAccumulatorRef.current.accountId = voiceData.accountId;
    if (voiceData.amount) voiceAccumulatorRef.current.amount = voiceData.amount;

    // Update live status for the status widget
    setLiveVoiceStatus(prev => {
      const next = { ...prev };
      if (voiceData.categoryId) {
        next.categoryId = voiceData.categoryId;
        next.categoryName = categoriesList.find((c) => c.id === voiceData.categoryId)?.name;
      }
      if (voiceData.accountId) {
        next.accountId = voiceData.accountId;
        next.accountName = accountsList.find((a) => a.id === voiceData.accountId)?.name;
      }
      if (voiceData.amount) next.amount = voiceData.amount;
      return next;
    });

    // If all 3 detected — stop mic and trigger summary immediately
    const acc = voiceAccumulatorRef.current;
    if (acc.categoryId && acc.accountId && acc.amount && !allDetectedRef.current) {
      allDetectedRef.current = true;
      setVoiceStopTrigger((n) => n + 1);
      setTimeout(() => handleVoiceEnd(), 200);
    }
    // Smart transcript accumulation — avoids duplicates from Chrome Android's
    // progressive refinements and session restarts
    const newText = voiceData.description.trim();
    const existing = (voiceAccumulatorRef.current.transcript || "").trim();
    if (!existing) {
      voiceAccumulatorRef.current.transcript = newText;
    } else if (existing.includes(newText)) {
      // newText already covered by existing — skip
    } else if (newText.includes(existing)) {
      // newText is a superset (progressive refinement) — replace
      voiceAccumulatorRef.current.transcript = newText;
    } else {
      // Genuinely new segment — append
      voiceAccumulatorRef.current.transcript = existing + " " + newText;
    }

    // If speech has started (has any data), always clear the initial 4-second wait timer
    // This allows users to speak for as long as needed once they start
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = undefined;
    }
  };

  // Handle voice recognition end - show result only when all 3 detected
  const handleVoiceEnd = () => {
    const { categoryId, accountId, amount, transcript } = voiceAccumulatorRef.current;

    // If no data at all — ignore
    if (!categoryId && !accountId && !amount) return;

    // If not all 3 detected — keep listening (voice will auto-restart), don't show popup
    if (!categoryId || !accountId || !amount) {
      allDetectedRef.current = false;
      return;
    }

    // All 3 detected — show summary
    allDetectedRef.current = false;

    // Get category and account names for display
    const categoryName = categoriesList.find((c) => c.id === categoryId)?.name;
    const accountName = accountsList.find((a) => a.id === accountId)?.name;

    // If no category detected but account + amount found, fallback to "Other"
    const effectiveCategoryId = categoryId || (accountId && amount ? "other" : undefined);
    const effectiveCategoryName = effectiveCategoryId === "other" && !categoryId
      ? "Other"
      : categoryName;

    // Success = category (or fallback) + amount
    const allMatched = effectiveCategoryId && amount;

    setVoiceResultData({
      categoryId: effectiveCategoryId,
      accountId,
      amount,
      categoryName: effectiveCategoryName,
      accountName,
      transcript,
      isSuccess: !!allMatched,
      isCategoryFallback: !categoryId && effectiveCategoryId === "other",
    });

    setShowVoiceResult(true);
    setLiveVoiceStatus({});

    // Reset accumulator
    voiceAccumulatorRef.current = {};
  };

  const handleVoiceResultConfirm = () => {
    const { categoryId, accountId, amount, transcript } = voiceResultData;

    setShowVoiceResult(false);

    // If all 3 detected — save directly, no need to go to amount page
    if (categoryId && accountId && amount) {
      saveTransaction(categoryId, accountId, amount, transcript);
      setDisplay("0");
      setValue(0);
      setSelectedCategory(null);
      setSelectedAccount(null);
      setCurrentPage("category");
      // currentPage may already be "category" so useEffect won't fire — force trigger
      if (voiceAutoStart) setVoiceStartTrigger((n) => n + 1);
      return;
    }

    // Partial match — prefill and navigate to complete manually
    if (categoryId) setSelectedCategory(categoryId);
    if (accountId) setSelectedAccount(accountId);
    if (amount) {
      setDisplay(amount.toString());
      setValue(amount);
    }

    if (categoryId && accountId) {
      setCurrentPage("amount");
    } else if (categoryId) {
      setCurrentPage("account");
    }
  };

  const handleVoiceResultEdit = () => {
    setShowVoiceResult(false);
    setCurrentPage("category");
    voiceAccumulatorRef.current = {};
    setLiveVoiceStatus({});
    allDetectedRef.current = false;
    if (voiceAutoStart) setVoiceStartTrigger((n) => n + 1);
  };

  const handleAccountSelect = (accountId: string) => {
    if (!isAccountPageReorderMode) {
      setSelectedAccount(accountId);
      setCurrentPage("amount");
    }
  };

  const exitAccountReorderMode = () => {
    setIsAccountPageReorderMode(false);
    setSelectedAccountForSwap(null);
  };

  const handleNumberClick = (num: number) => {
    if (isCalcMode) {
      setDisplay(prev => prev === "0" ? num.toString() : prev + num.toString());
    } else {
      if (display === "0") {
        setDisplay(num.toString());
        setValue(num);
      } else {
        const newValue = display + num.toString();
        setDisplay(newValue);
        setValue(parseFloat(newValue));
      }
    }
  };

  const handleDecimal = () => {
    if (isCalcMode) {
      const last = display.slice(-1);
      if (/\d/.test(last) && !display.split(/[+\-*/]/).pop()!.includes(".")) {
        setDisplay(display + ".");
      }
    } else {
      if (!display.includes(".")) setDisplay(display + ".");
    }
  };

  const handleDelete = () => {
    const newDisplay = display.slice(0, -1) || "0";
    setDisplay(newDisplay);
    if (!isCalcMode) setValue(parseFloat(newDisplay) || 0);
  };

  const handleEquals = () => {
    try {
      const clean = display.replace(/\s+/g, "");
      if (/^[\d+\-*/.]+$/.test(clean) && clean) {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${clean}`)() as number;
        if (typeof result === "number" && isFinite(result) && result > 0) {
          const val = parseFloat(result.toFixed(4));
          setDisplay(String(val));
          setValue(val);
        }
      }
    } catch {}
    setIsCalcMode(false);
  };

  const handleConfirm = () => {
    if (isCalcMode) { handleEquals(); return; }
    if (selectedCategory && selectedAccount && value > 0) {
      saveTransaction(selectedCategory, selectedAccount, value);
    }
    setDisplay("0");
    setValue(0);
    setSelectedCategory(null);
    setSelectedAccount(null);
    setCurrentPage("category");
  };

  const handleToggleLock = () => {
    setIsLocked(!isLocked);
  };

  // ── Top expense categories for current month ─────────────────────────────
  const topExpenses = useMemo(() => {
    try {
      const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
      const resetDay: number = typeof s.monthResetDay === "number" ? s.monthResetDay : 1;

      const today = new Date();
      const d = today.getDate();
      const periodStart = d >= resetDay
        ? new Date(today.getFullYear(), today.getMonth(), resetDay)
        : new Date(today.getFullYear(), today.getMonth() - 1, resetDay);

      const raw: any[] = JSON.parse(localStorage.getItem("app_transactions") || "[]");
      const totals: Record<string, number> = {};
      for (const t of raw) {
        if (t.isTransfer || t.categoryId === "transfer_out" || t.categoryId === "transfer_in") continue;
        const cat = categoriesList.find((c: any) => c.id === t.categoryId);
        if (!cat || cat.type !== "expense") continue;
        if (new Date(t.date) < periodStart) continue;
        totals[t.categoryId] = (totals[t.categoryId] || 0) + (Number(t.amount) || 0);
      }

      return Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, amount]) => ({ id, amount, cat: categoriesList.find((c: any) => c.id === id) }));
    } catch { return []; }
  }, [categoriesList]);

  const periodLabel = useMemo(() => {
    try {
      const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
      const resetDay: number = typeof s.monthResetDay === "number" ? s.monthResetDay : 1;
      const today = new Date();
      const d = today.getDate();
      const start = d >= resetDay
        ? new Date(today.getFullYear(), today.getMonth(), resetDay)
        : new Date(today.getFullYear(), today.getMonth() - 1, resetDay);
      const startStr = start.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
      const endStr = today.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
      return `${startStr} – ${endStr}`;
    } catch { return ""; }
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col pb-safe-content bg-white overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Top Expense Summary Header */}
        <div className="px-4 pt-safe-header pb-2 bg-white border-b border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">รายจ่ายเดือนนี้</span>
            <span className="text-xs text-slate-400">{periodLabel}</span>
          </div>
          {topExpenses.length === 0 ? (
            <p className="text-xs text-slate-400 py-1">ยังไม่มีรายจ่ายในรอบนี้</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {topExpenses.map(({ id, amount, cat }) => {
                const Icon = cat?.icon || MoreHorizontal;
                return (
                  <div key={id} className="flex flex-col items-center gap-0.5 min-w-[52px]">
                    <div className="w-9 h-9 bg-theme-50 rounded-xl flex items-center justify-center">
                      <Icon size={16} className="text-theme-600" />
                    </div>
                    <span className="text-[10px] text-slate-500 truncate w-full text-center leading-tight">{cat?.name || id}</span>
                    <span className="text-[10px] font-bold text-slate-800">฿{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Input Area - Full Screen */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Dynamic Main Input Area */}
          <div className="px-4 pt-3 pb-5 bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Category Input Page (4 rows × 4 columns) - Bottom Aligned */}
            {currentPage === "category" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCategoryType("expense")}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        categoryType === "expense"
                          ? "bg-theme-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      onClick={() => setCategoryType("income")}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        categoryType === "income"
                          ? "bg-theme-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Income
                    </button>
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    {!isCategoryReorderMode && (
                      <button
                        onClick={() => setIsCategoryReorderMode(true)}
                        className="px-3 py-1 text-xs bg-theme-100 text-theme-700 rounded font-semibold hover:bg-theme-200 transition-colors"
                      >
                        Reorder
                      </button>
                    )}
                    <Recording onVoiceInput={handleVoiceInput} onVoiceEnd={handleVoiceEnd} startTrigger={voiceStartTrigger} stopTrigger={voiceStopTrigger} autoRestart={voiceAutoStart} />
                  </div>
                </div>
                <Carousel
                  items={(() => {
                    const filtered = categoriesList.filter((c) => c.type === categoryType);
                    return [
                      ...filtered.slice(0, 3),
                      { id: "__voice_status__", name: "", type: categoryType, icon: null } as any,
                      ...filtered.slice(3),
                    ];
                  })()}
                  itemsPerPage={16}
                  cols={4}
                  rows={4}
                  renderItem={(category) => {
                    // Voice status widget at position 3
                    if (category.id === "__voice_status__") {
                      const { categoryName, accountName, amount } = liveVoiceStatus;
                      return (
                        <div key="__voice_status__" className="w-full h-full rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-center px-2 py-1 gap-0.5 overflow-hidden">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold flex-shrink-0 ${categoryName ? "text-green-500" : "text-slate-300"}`}>{categoryName ? "✓" : "○"}</span>
                            <span className="text-xs text-slate-600 truncate">{categoryName || "Category"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold flex-shrink-0 ${accountName ? "text-green-500" : "text-slate-300"}`}>{accountName ? "✓" : "○"}</span>
                            <span className="text-xs text-slate-600 truncate">{accountName || "Account"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold flex-shrink-0 ${amount ? "text-green-500" : "text-slate-300"}`}>{amount ? "✓" : "○"}</span>
                            <span className="text-xs text-slate-600 truncate">{amount ? `฿${amount.toLocaleString()}` : "Amount"}</span>
                          </div>
                        </div>
                      );
                    }

                    const IconComponent = category.icon;
                    const categoryIndex = categoriesList.findIndex((c) => c.id === category.id);
                    const isSelected = selectedCategoryForSwap === category.id;

                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          if (isCategoryReorderMode) {
                            if (selectedCategoryForSwap === null) {
                              setSelectedCategoryForSwap(category.id);
                            } else if (selectedCategoryForSwap === category.id) {
                              setSelectedCategoryForSwap(null);
                            } else {
                              const firstIndex = categoriesList.findIndex((c) => c.id === selectedCategoryForSwap);
                              const newList = [...categoriesList];
                              [newList[firstIndex], newList[categoryIndex]] = [newList[categoryIndex], newList[firstIndex]];
                              setCategoriesList(newList);
                              setSelectedCategoryForSwap(null);
                            }
                          } else {
                            handleCategorySelect(category.id);
                          }
                        }}
                        className={`w-full h-full px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs font-semibold overflow-hidden ${
                          isCategoryReorderMode
                            ? isSelected
                              ? "bg-theme-500 text-white shadow-lg scale-105 border-2 border-theme-700"
                              : "bg-theme-50 hover:bg-theme-100 text-theme-900 border-2 border-theme-300"
                            : "bg-theme-50 hover:bg-theme-200 text-theme-900"
                        }`}
                      >
                        <IconComponent size={24} />
                        <span className="font-bold text-xs text-center truncate leading-tight w-full block">{category.name}</span>
                      </button>
                    );
                  }}
                />
                {isCategoryReorderMode && (
                  <button
                    onClick={exitCategoryReorderMode}
                    className="mt-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors text-sm"
                  >
                    Done Reordering
                  </button>
                )}
              </div>
            )}

            {/* Account Input Page (4 rows × 4 columns) - Bottom Aligned */}
            {currentPage === "account" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-slate-900">Select Account</h2>
                  <div className="flex items-center gap-2">
                    {!isAccountPageReorderMode && (
                      <button
                        onClick={() => setIsAccountPageReorderMode(true)}
                        className="px-3 py-1 text-xs bg-theme-100 text-theme-700 rounded font-semibold hover:bg-theme-200 transition-colors"
                      >
                        Reorder
                      </button>
                    )}
                    <button
                      onClick={() => setCurrentPage("category")}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
                <Carousel
                  items={accountsList}
                  itemsPerPage={16}
                  cols={4}
                  rows={4}
                  renderItem={(account) => {
                    const IconComponent = account.icon;
                    const accountIndex = accountsList.findIndex((a) => a.id === account.id);
                    const isSelected = selectedAccountForSwap === account.id;

                    return (
                      <button
                        key={account.id}
                        onClick={() => {
                          if (isAccountPageReorderMode) {
                            if (selectedAccountForSwap === null) {
                              setSelectedAccountForSwap(account.id);
                            } else if (selectedAccountForSwap === account.id) {
                              setSelectedAccountForSwap(null);
                            } else {
                              const firstIndex = accountsList.findIndex((a) => a.id === selectedAccountForSwap);
                              const newList = [...accountsList];
                              [newList[firstIndex], newList[accountIndex]] = [newList[accountIndex], newList[firstIndex]];
                              setAccountsList(newList);
                              setSelectedAccountForSwap(null);
                            }
                          } else {
                            handleAccountSelect(account.id);
                          }
                        }}
                        className={`w-full h-full px-1 rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-xs font-semibold ${
                          isAccountPageReorderMode
                            ? isSelected
                              ? "bg-theme-500 text-white shadow-lg scale-105 border-2 border-theme-700"
                              : "bg-theme-50 hover:bg-theme-100 text-theme-900 border-2 border-theme-300"
                            : "bg-theme-50 hover:bg-theme-200 text-theme-900"
                        }`}
                      >
                        <IconComponent size={24} />
                        <span className="font-bold text-xs text-center truncate leading-tight">{account.name}</span>
                      </button>
                    );
                  }}
                />
                {isAccountPageReorderMode && (
                  <button
                    onClick={exitAccountReorderMode}
                    className="mt-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors text-sm"
                  >
                    Done Reordering
                  </button>
                )}
              </div>
            )}

            {/* Amount Input Page (Numpad A-B-C-D) */}
            {currentPage === "amount" && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Section A: Size Controls */}
                <div className="flex gap-4 items-center mb-3">
                  {[70, 75, 80, 85].map((size) => (
                    <button
                      key={size}
                      onClick={() => setNumpadSize(size)}
                      disabled={isLocked}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                        numpadSize === size
                          ? "bg-theme-600 text-white shadow-md"
                          : isLocked ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {size}%
                    </button>
                  ))}
                  <button
                    onClick={() => setIsRightMode(!isRightMode)}
                    disabled={isLocked}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                      isRightMode
                        ? isLocked ? "bg-theme-300 text-white cursor-not-allowed" : "bg-theme-600 text-white shadow-md"
                        : isLocked ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Right
                  </button>
                </div>

                {/* Group B+C+D: Display + Numpad + Controls */}
                <div className="flex flex-col flex-1 min-h-0 gap-2">
                  {/* Section B: Display */}
                  <div className="bg-gradient-to-br from-theme-600 to-theme-700 px-3 py-3 rounded-lg flex justify-between items-center flex-shrink-0">
                    <div className={`text-2xl font-bold font-mono tracking-tight ${categoryType === "income" ? "text-green-300" : "text-red-300"}`}>
                      {categoryType === "income" ? "+" : "-"}฿{display}
                    </div>
                    <button
                      onClick={() => setCurrentPage("account")}
                      className="p-2 hover:bg-theme-500 rounded-lg transition-colors text-white flex-shrink-0"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Section C-D: Numpad and Controls */}
                  <div className={`flex gap-2 flex-1 min-h-0 ${isRightMode ? "flex-row-reverse" : ""}`}>
                    {/* Section C: Numpad */}
                    <div className="flex flex-col flex-1 min-h-0 gap-2" style={{ width: `${numpadSize}%`, flex: "none" }}>
                      {/* 3-column grid - fills remaining */}
                      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0" style={{ gridTemplateRows: "repeat(3, 1fr)" }}>
                        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            {num}
                          </button>
                        ))}
                      </div>

                      {/* 4-column grid - fixed height */}
                      <div className="grid grid-cols-4 gap-2 flex-shrink-0" style={{ height: "15%" }}>
                        {isRightMode ? (
                          <>
                            <button onClick={handleDelete} className="h-full px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm">⌫</button>
                            <button onClick={handleDecimal} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">.</button>
                            <button onClick={() => handleNumberClick(0)} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">0</button>
                            <button onClick={handleConfirm} className="h-full px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md">Save</button>
                          </>
                        ) : (
                          <>
                            <button onClick={handleConfirm} className="h-full px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md">Save</button>
                            <button onClick={() => handleNumberClick(0)} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">0</button>
                            <button onClick={handleDecimal} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">.</button>
                            <button onClick={handleDelete} className="h-full px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm">⌫</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Section D: Calc toggle & Lock/= */}
                    <div className="flex flex-col gap-2 flex-1 min-h-0">
                      {isCalcMode ? (
                        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                          {(['+', '-', '*', '/'] as const).map((op) => (
                            <button
                              key={op}
                              onClick={() => handleOperator(op)}
                              className="h-full bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                            >
                              {op === '*' ? '×' : op === '/' ? '÷' : op}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsCalcMode(true)}
                          className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 font-bold rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center flex-1 select-none"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Calculator size={24} />
                            <span className="text-xs">Calc</span>
                          </div>
                        </button>
                      )}
                      {isCalcMode ? (
                        <button
                          onClick={handleEquals}
                          className="rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center font-bold text-2xl flex-1 bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white"
                        >
                          =
                        </button>
                      ) : (
                        <button
                          onClick={handleToggleLock}
                          className={`rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center font-bold flex-1 ${
                            isLocked
                              ? "bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white"
                              : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700"
                          }`}
                        >
                          {isLocked ? <Lock size={24} /> : <LockOpen size={24} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Result Confirmation Modal */}
      {showVoiceResult && (
        <VoiceResultConfirmation
          categoryName={voiceResultData.categoryName}
          accountName={voiceResultData.accountName}
          amount={voiceResultData.amount}
          transcript={voiceResultData.transcript}
          isSuccess={voiceResultData.isSuccess}
          isCategoryFallback={voiceResultData.isCategoryFallback}
          onConfirm={handleVoiceResultConfirm}
          onEdit={handleVoiceResultEdit}
          onClose={() => { setShowVoiceResult(false); setVoiceStartTrigger((n) => n + 1); }}
        />
      )}
    </div>
  );
}
