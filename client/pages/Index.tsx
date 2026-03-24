import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Lock, LockOpen, Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap, Wind, Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal, CreditCard, Wallet, Smartphone, Banknote, X, Mic } from "lucide-react";
import Carousel from "../components/Carousel";
import Recording from "../components/Recording";
import { calculateFromVoice } from "../utils/voiceCalculator";
import VoiceResultConfirmation from "../components/VoiceResultConfirmation";
import { matchCategory, matchAccount } from "../utils/keywordMatch";

type InputPage = "category" | "account" | "amount";

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

export default function Index() {
  const navigate = useNavigate();
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

  // Voice result confirmation state
  const [showVoiceResult, setShowVoiceResult] = useState(false);
  const [voiceResultData, setVoiceResultData] = useState<{
    categoryId?: string;
    accountId?: string;
    amount?: number;
    categoryName?: string;
    accountName?: string;
    isSuccess: boolean;
  }>({ isSuccess: false });
  const voiceTimeoutRef = useRef<NodeJS.Timeout>();
  const voiceAccumulatorRef = useRef<{
    categoryId?: string;
    accountId?: string;
    amount?: number;
  }>({});

  const handleCategorySelect = (categoryId: string) => {
    if (!isCategoryReorderMode) {
      setSelectedCategory(categoryId);
      setCurrentPage("account");
    }
  };

  const exitCategoryReorderMode = () => {
    setIsCategoryReorderMode(false);
    setSelectedCategoryForSwap(null);
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

    // If speech has started (has any data), always clear the initial 4-second wait timer
    // This allows users to speak for as long as needed once they start
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = undefined;
    }
  };

  // Handle voice recognition end - show result when speech ends
  const handleVoiceEnd = () => {
    const { categoryId, accountId, amount } = voiceAccumulatorRef.current;

    // Only show result if any data was detected
    if (categoryId || accountId || amount) {
      // Get category and account names for display
      const categoryName = categoryId
        ? categoriesList.find((c) => c.id === categoryId)?.name
        : undefined;
      const accountName = accountId
        ? accountsList.find((a) => a.id === accountId)?.name
        : undefined;

      // Check if all 3 parts are detected
      const allMatched = categoryId && accountId && amount;

      setVoiceResultData({
        categoryId,
        accountId,
        amount,
        categoryName,
        accountName,
        isSuccess: !!allMatched,
      });

      setShowVoiceResult(true);
    }

    // Reset accumulator
    voiceAccumulatorRef.current = {};
  };

  const handleVoiceResultConfirm = () => {
    const { categoryId, accountId, amount } = voiceResultData;

    if (categoryId) setSelectedCategory(categoryId);
    if (accountId) setSelectedAccount(accountId);
    if (amount) {
      setDisplay(amount.toString());
      setValue(amount);
    }

    setShowVoiceResult(false);

    if (categoryId && accountId && amount) {
      setCurrentPage("amount");
    } else if (categoryId && accountId) {
      setCurrentPage("amount");
    } else if (categoryId) {
      setCurrentPage("account");
    }
  };

  const handleVoiceResultEdit = () => {
    setShowVoiceResult(false);
    // Return to first page to speak again
    setCurrentPage("category");
    voiceAccumulatorRef.current = {};
  };

  const handleNoSpeechDetected = () => {
    // Show the "No Match" popup when no speech was detected
    setVoiceResultData({
      isSuccess: false,
      categoryName: undefined,
      accountName: undefined,
      amount: undefined,
    });
    setShowVoiceResult(true);
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
    console.log("Transaction saved:", {
      category: selectedCategory,
      account: selectedAccount,
      amount: value,
    });
    // Reset and exit
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col p-4">
      <div className="w-full max-w-md mx-auto relative">
        {/* Persistent Account Section - Top */}
        <div className="bg-white rounded-t-3xl shadow-2xl px-6 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-600">Accounts</h3>
            {!isReorderMode && (
              <button
                onClick={() => setIsReorderMode(true)}
                className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded font-semibold hover:bg-indigo-200 transition-colors"
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
                      // Normal mode - navigate to transactions
                      navigate(`/account/${account.id}/transactions`);
                    }
                  }}
                  className={`w-full py-2 px-3 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer text-xs font-semibold ${
                    isReorderMode
                      ? isSelected
                        ? "bg-indigo-500 text-white shadow-lg scale-105 border-2 border-indigo-700"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-indigo-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <IconComponent size={20} />
                  <span className="font-bold text-xs truncate">{account.name}</span>
                  <span className="text-xs font-normal opacity-75">{account.type}</span>
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
        <div className="bg-white rounded-b-3xl shadow-2xl overflow-hidden flex flex-col flex-1">
          {/* Dynamic Main Input Area */}
          <div className="px-6 py-6 bg-white flex flex-col flex-1">
            {/* Category Input Page (4 rows × 4 columns) - Bottom Aligned */}
            {currentPage === "category" && (
              <div className="flex flex-col flex-1 justify-end">
                <div className="flex justify-between items-center mb-4">
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
                  <div className="flex items-center gap-2">
                    {!isCategoryReorderMode && (
                      <button
                        onClick={() => setIsCategoryReorderMode(true)}
                        className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded font-semibold hover:bg-indigo-200 transition-colors"
                      >
                        Reorder
                      </button>
                    )}
                    <Recording onVoiceInput={handleVoiceInput} onVoiceEnd={handleVoiceEnd} onNoSpeechDetected={handleNoSpeechDetected} />
                  </div>
                </div>
                <Carousel
                  items={categoriesList.filter((c) => c.type === categoryType)}
                  itemsPerPage={12}
                  cols={4}
                  renderItem={(category) => {
                    const IconComponent = category.icon;
                    const categoryIndex = categoriesList.findIndex((c) => c.id === category.id);
                    const isSelected = selectedCategoryForSwap === category.id;

                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          if (isCategoryReorderMode) {
                            if (selectedCategoryForSwap === null) {
                              // First selection - select this category
                              setSelectedCategoryForSwap(category.id);
                            } else if (selectedCategoryForSwap === category.id) {
                              // Deselect if clicking the same category
                              setSelectedCategoryForSwap(null);
                            } else {
                              // Second selection - swap the two categories
                              const firstIndex = categoriesList.findIndex((c) => c.id === selectedCategoryForSwap);
                              const newList = [...categoriesList];
                              [newList[firstIndex], newList[categoryIndex]] = [newList[categoryIndex], newList[firstIndex]];
                              setCategoriesList(newList);
                              setSelectedCategoryForSwap(null);
                            }
                          } else {
                            // Normal mode - select category
                            handleCategorySelect(category.id);
                          }
                        }}
                        className={`py-4 px-2 rounded-lg transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-xs h-22 font-semibold ${
                          isCategoryReorderMode
                            ? isSelected
                              ? "bg-indigo-500 text-white shadow-lg scale-105 border-2 border-indigo-700"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-indigo-300"
                            : "bg-indigo-50 hover:bg-indigo-200 text-indigo-900"
                        }`}
                      >
                        <IconComponent size={32} />
                        <span className="font-bold text-xs text-center truncate">{category.name}</span>
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
              <div className="flex flex-col flex-1 justify-end">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Select Account</h2>
                  <div className="flex items-center gap-2">
                    {!isAccountPageReorderMode && (
                      <button
                        onClick={() => setIsAccountPageReorderMode(true)}
                        className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded font-semibold hover:bg-indigo-200 transition-colors"
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
                  itemsPerPage={12}
                  cols={4}
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
                              // First selection - select this account
                              setSelectedAccountForSwap(account.id);
                            } else if (selectedAccountForSwap === account.id) {
                              // Deselect if clicking the same account
                              setSelectedAccountForSwap(null);
                            } else {
                              // Second selection - swap the two accounts
                              const firstIndex = accountsList.findIndex((a) => a.id === selectedAccountForSwap);
                              const newList = [...accountsList];
                              [newList[firstIndex], newList[accountIndex]] = [newList[accountIndex], newList[firstIndex]];
                              setAccountsList(newList);
                              setSelectedAccountForSwap(null);
                            }
                          } else {
                            // Normal mode - select account
                            handleAccountSelect(account.id);
                          }
                        }}
                        className={`py-4 px-2 rounded-lg transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-xs h-22 font-semibold ${
                          isAccountPageReorderMode
                            ? isSelected
                              ? "bg-indigo-500 text-white shadow-lg scale-105 border-2 border-indigo-700"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-indigo-300"
                            : "bg-indigo-50 hover:bg-indigo-200 text-indigo-900"
                        }`}
                      >
                        <IconComponent size={32} />
                        <span className="font-bold text-xs text-center truncate">{account.name}</span>
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
              <div className="flex flex-col flex-1">
                {/* Section A: Size Controls */}
                <div className="flex gap-4 items-center mb-3">
                  {[70, 75, 80, 85].map((size) => (
                    <button
                      key={size}
                      onClick={() => setNumpadSize(size)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                        numpadSize === size
                          ? "bg-indigo-600 text-white shadow-md"
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
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Right
                  </button>
                </div>

                {/* Section B: Display */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-3 py-4 rounded-lg mb-4 flex justify-between items-center">
                  <div className="text-2xl font-bold text-white font-mono tracking-tight">
                    ฿{display}
                  </div>
                  <button
                    onClick={() => setCurrentPage("account")}
                    className="p-2 hover:bg-indigo-500 rounded-lg transition-colors text-white flex-shrink-0"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Section C-D: Numpad and Controls */}
                <div className={`flex gap-4 ${isRightMode ? "flex-row-reverse" : ""}`}>
                  {/* Section C: Numpad */}
                  <div style={{ width: `${numpadSize}%` }}>
                    {/* 3-column grid */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleNumberClick(num)}
                          style={{ height: "51.2px" }}
                          className="px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    {/* 4-column grid */}
                    <div className="grid grid-cols-4 gap-3">
                      {isRightMode ? (
                        <>
                          <button
                            onClick={handleDelete}
                            style={{ height: "51.2px" }}
                            className="px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            ⌫
                          </button>
                          <button
                            onClick={handleDecimal}
                            style={{ height: "51.2px" }}
                            className="px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            .
                          </button>
                          <button
                            onClick={() => handleNumberClick(0)}
                            style={{ height: "51.2px" }}
                            className="px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            0
                          </button>
                          <button
                            onClick={handleConfirm}
                            style={{ height: "51.2px" }}
                            className="px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md"
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleConfirm}
                            style={{ height: "51.2px" }}
                            className="px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleNumberClick(0)}
                            style={{ height: "51.2px" }}
                            className="px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            0
                          </button>
                          <button
                            onClick={handleDecimal}
                            style={{ height: "51.2px" }}
                            className="px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            .
                          </button>
                          <button
                            onClick={handleDelete}
                            style={{ height: "51.2px" }}
                            className="px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            ⌫
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section D: Voice Calculator & Lock */}
                  <div className="flex flex-col gap-3 flex-1">
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
                        <Recording onVoiceInput={handleVoiceInput} onVoiceEnd={handleVoiceEnd} onNoSpeechDetected={handleNoSpeechDetected} />
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
          isSuccess={voiceResultData.isSuccess}
          onConfirm={handleVoiceResultConfirm}
          onEdit={handleVoiceResultEdit}
          onClose={() => setShowVoiceResult(false)}
        />
      )}
    </div>
  );
}
