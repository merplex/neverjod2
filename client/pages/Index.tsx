import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Lock, LockOpen, Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap, Wind, Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal, CreditCard, Wallet, Smartphone, Banknote, X, Mic } from "lucide-react";
import Carousel from "../components/Carousel";
import Recording from "../components/Recording";
import { calculateFromVoice } from "../utils/voiceCalculator";
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
        // Restore icons from default categories since they can't be serialized
        return storedCategories
          .map((cat: any) => {
            if (!cat || !cat.id) return null;
            const defaultCat = categories.find((d) => d.id === cat.id);
            if (!defaultCat) return null;
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
        // Restore icons from default accounts since they can't be serialized
        return storedAccounts
          .map((acc: any) => {
            if (!acc || !acc.id) return null;
            const defaultAcc = accounts.find((d) => d.id === acc.id);
            if (!defaultAcc) return null;
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
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isAccountPageReorderMode, setIsAccountPageReorderMode] = useState(false);
  const [selectedCategoryForSwap, setSelectedCategoryForSwap] = useState<string | null>(null);
  const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null);
  const [selectedAccountForSwap, setSelectedAccountForSwap] = useState<string | null>(null);

  // Amount input state
  const [display, setDisplay] = useState("0");
  const [value, setValue] = useState(0);
  const [numpadSize, setNumpadSize] = useState(80);
  const [isLocked, setIsLocked] = useState(false);
  const [isRightMode, setIsRightMode] = useState(false);
  const [isVoiceCalculatorMode, setIsVoiceCalculatorMode] = useState(false);
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");

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

  const handleVoiceInput = (voiceData: {
    categoryId?: string;
    accountId?: string;
    amount?: number;
    description: string;
  }) => {
    // If in voice calculator mode, parse the transcript as a mathematical expression
    if (isVoiceCalculatorMode) {
      const result = calculateFromVoice(voiceData.description);
      if (!result.error) {
        setDisplay(result.result.toString());
        setValue(result.result);
      }
      setIsVoiceCalculatorMode(false);
      return;
    }

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
    if (display === "0") {
      setDisplay(num.toString());
      setValue(num);
    } else {
      const newValue = display + num.toString();
      setDisplay(newValue);
      setValue(parseFloat(newValue));
    }
  };

  const handleDecimal = () => {
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleDelete = () => {
    const newDisplay = display.slice(0, -1) || "0";
    setDisplay(newDisplay);
    setValue(parseFloat(newDisplay) || 0);
  };

  const handleConfirm = () => {
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

  const exitReorderMode = () => {
    setIsReorderMode(false);
    setSelectedForSwap(null);
    // Persist reordered accounts to localStorage so AccountsManagement reflects it
    localStorage.setItem("app_accounts", JSON.stringify(accountsList));
  };

  return (
    <div className="h-[100dvh] flex flex-col pb-[72px] bg-white overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Persistent Account Section - Top */}
        <div className="px-4 pt-3 pb-2 bg-white border-b border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Accounts</h3>
            {!isReorderMode && (
              <button
                onClick={() => setIsReorderMode(true)}
                className="px-3 py-1 text-xs bg-slate-100 text-slate-500 rounded font-semibold hover:bg-slate-200 transition-colors"
              >
                Reorder
              </button>
            )}
          </div>
          <Carousel
            items={accountsList}
            itemsPerPage={4}
            cols={2}
            renderItem={(account) => {
              const IconComponent = account.icon;
              const accountIndex = accountsList.findIndex((a) => a.id === account.id);
              const isSelected = selectedForSwap === account.id;

              return (
                <button
                  key={account.id}
                  onClick={() => {
                    if (isReorderMode) {
                      if (selectedForSwap === null) {
                        // First selection - select this account
                        setSelectedForSwap(account.id);
                      } else if (selectedForSwap === account.id) {
                        // Deselect if clicking the same account
                        setSelectedForSwap(null);
                      } else {
                        // Second selection - swap the two accounts
                        const firstIndex = accountsList.findIndex((a) => a.id === selectedForSwap);
                        const newList = [...accountsList];
                        [newList[firstIndex], newList[accountIndex]] = [newList[accountIndex], newList[firstIndex]];
                        setAccountsList(newList);
                        setSelectedForSwap(null);
                      }
                    } else {
                      // Normal mode - navigate to transactions filtered by account
                      navigate(`/transactions?accountId=${account.id}`);
                    }
                  }}
                  className={`w-full py-2 px-3 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer text-xs font-semibold overflow-hidden ${
                    isReorderMode
                      ? isSelected
                        ? "bg-theme-500 text-white shadow-lg scale-105 border-2 border-theme-700"
                        : "bg-theme-50 hover:bg-theme-100 text-theme-900 border-2 border-theme-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <IconComponent size={20} />
                  <span className="font-bold text-xs truncate w-full text-center block">{account.name}</span>
                  <span className="text-xs font-normal opacity-75 truncate w-full text-center block">{account.type}</span>
                </button>
              );
            }}
          />
          {isReorderMode && (
            <button
              onClick={exitReorderMode}
              className="mt-3 w-full py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors text-sm"
            >
              Done Reordering
            </button>
          )}
        </div>

        {/* Main Input Area - Full Screen */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Dynamic Main Input Area */}
          <div className="px-4 pt-2 pb-5 bg-white flex flex-col flex-1 min-h-0 overflow-hidden">
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
                  <div className="flex items-center gap-2">
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
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                        numpadSize === size
                          ? "bg-theme-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {size}%
                    </button>
                  ))}
                  <button
                    onClick={() => setIsRightMode(!isRightMode)}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                      isRightMode
                        ? "bg-theme-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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

                    {/* Section D: Voice Calculator & Lock */}
                    <div className="flex flex-col gap-2 flex-1 min-h-0">
                      {!isVoiceCalculatorMode ? (
                        <button
                          onClick={() => setIsVoiceCalculatorMode(true)}
                          disabled={isLocked}
                          className={`rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center flex-1 ${
                            isLocked
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 font-bold"
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <Calculator size={24} />
                              <Mic size={24} />
                            </div>
                            <span className="text-xs">Voice</span>
                          </div>
                        </button>
                      ) : (
                        <div className="rounded-lg bg-green-100 border-2 border-green-500 flex items-center justify-center flex-1 p-2">
                          <Recording onVoiceInput={handleVoiceInput} onVoiceEnd={handleVoiceEnd} />
                        </div>
                      )}
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
