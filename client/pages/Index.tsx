import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown, Lock, LockOpen, Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap, Wind, Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal, CreditCard, Wallet, Smartphone, Banknote, X } from "lucide-react";
import Carousel from "../components/Carousel";
import Recording from "../components/Recording";

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
  const [accountsList, setAccountsList] = useState(accounts);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedAccount, setDraggedAccount] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Amount input state
  const [display, setDisplay] = useState("0");
  const [value, setValue] = useState(0);
  const [numpadSize, setNumpadSize] = useState(80);
  const [numpadOffset, setNumpadOffset] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isRightMode, setIsRightMode] = useState(false);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage("account");
  };

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
    setCurrentPage("amount");
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

  const handleMoveUp = () => {
    if (!isLocked) {
      setNumpadOffset(0);
    }
  };

  const handleMoveDown = () => {
    if (!isLocked) {
      setNumpadOffset((prev) => prev + 5);
    }
  };

  const handleToggleLock = () => {
    setIsLocked(!isLocked);
  };

  // Long-press handlers for account reordering
  const handleAccountMouseDown = (e: React.MouseEvent, accountId: string) => {
    e.preventDefault();
    longPressTimerRef.current = setTimeout(() => {
      setIsReorderMode(true);
      setDraggedAccount(accountId);
    }, 500); // 500ms long press
  };

  const handleAccountMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleAccountDragStart = (e: React.DragEvent, accountId: string) => {
    if (isReorderMode) {
      e.dataTransfer.effectAllowed = "move";
      setDraggedAccount(accountId);
    }
  };

  const handleAccountDragOver = (e: React.DragEvent) => {
    if (isReorderMode) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleAccountDrop = (e: React.DragEvent, targetAccountId: string) => {
    e.preventDefault();
    if (!draggedAccount || draggedAccount === targetAccountId || !isReorderMode) return;

    const draggedIndex = accountsList.findIndex((a) => a.id === draggedAccount);
    const targetIndex = accountsList.findIndex((a) => a.id === targetAccountId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newList = [...accountsList];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);

    setAccountsList(newList);
  };

  const exitReorderMode = () => {
    setIsReorderMode(false);
    setDraggedAccount(null);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Persistent Account Section - Top */}
        <div className="bg-white rounded-t-3xl shadow-2xl px-6 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Accounts</h3>
          <Carousel
            items={accountsList}
            itemsPerPage={6}
            cols={2}
            renderItem={(account) => {
              const IconComponent = account.icon;
              return (
                <div
                  key={account.id}
                  draggable={isReorderMode}
                  onDragStart={(e) => {
                    if (isReorderMode) {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", account.id);
                      setDraggedAccount(account.id);
                    }
                  }}
                  onDragOver={(e) => {
                    if (isReorderMode) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(e) => {
                    if (isReorderMode) {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData("text/plain");
                      if (draggedId && draggedId !== account.id) {
                        const draggedIndex = accountsList.findIndex((a) => a.id === draggedId);
                        const targetIndex = accountsList.findIndex((a) => a.id === account.id);

                        if (draggedIndex !== -1 && targetIndex !== -1) {
                          const newList = [...accountsList];
                          const [draggedItem] = newList.splice(draggedIndex, 1);
                          newList.splice(targetIndex, 0, draggedItem);
                          setAccountsList(newList);
                        }
                      }
                    }
                  }}
                  className={isReorderMode ? "cursor-move" : ""}
                >
                  <button
                    onMouseDown={(e) => handleAccountMouseDown(e, account.id)}
                    onMouseUp={handleAccountMouseUp}
                    onMouseLeave={handleAccountMouseUp}
                    onClick={() => {
                      if (isReorderMode) {
                        exitReorderMode();
                      } else {
                        navigate(`/account/${account.id}/transactions`);
                      }
                    }}
                    className={`w-full py-2 px-3 rounded-lg transition-colors flex flex-col items-center gap-1 cursor-pointer text-xs font-semibold ${
                      isReorderMode
                        ? draggedAccount === account.id
                          ? "bg-indigo-400 text-white shadow-lg opacity-70"
                          : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-2 border-indigo-300"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <IconComponent size={20} />
                    <span className="font-bold text-xs">{account.name}</span>
                    <span className="text-xs font-normal opacity-75">{account.type}</span>
                  </button>
                </div>
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
                  <h2 className="text-lg font-bold text-slate-900">Select Category</h2>
                  <Recording />
                </div>
                <Carousel
                  items={categories}
                  itemsPerPage={12}
                  cols={4}
                  renderItem={(category) => {
                    const IconComponent = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className="py-4 px-2 bg-indigo-50 hover:bg-indigo-200 text-indigo-900 font-semibold rounded-lg transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-xs h-28"
                      >
                        <IconComponent size={32} />
                        <span className="font-bold text-xs text-center">{category.name}</span>
                      </button>
                    );
                  }}
                />
              </div>
            )}

            {/* Account Input Page (4 rows × 4 columns) - Bottom Aligned */}
            {currentPage === "account" && (
              <div className="flex flex-col flex-1 justify-end">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Select Account</h2>
                  <button
                    onClick={() => setCurrentPage("category")}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                  >
                    <X size={24} />
                  </button>
                </div>
                <Carousel
                  items={accountsList}
                  itemsPerPage={12}
                  cols={4}
                  renderItem={(account) => {
                    const IconComponent = account.icon;
                    return (
                      <button
                        key={account.id}
                        onClick={() => handleAccountSelect(account.id)}
                        className="py-4 px-2 bg-indigo-50 hover:bg-indigo-200 text-indigo-900 font-semibold rounded-lg transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-xs h-28"
                      >
                        <IconComponent size={32} />
                        <span className="font-bold text-xs text-center">{account.name}</span>
                      </button>
                    );
                  }}
                />
              </div>
            )}

            {/* Amount Input Page (Numpad A-B-C-D) */}
            {currentPage === "amount" && (
              <div className="flex flex-col flex-1">
                {/* Section A: Size Controls */}
                <div
                  style={{
                    transform: `translateY(${numpadOffset}px)`,
                    transition: "transform 0.1s ease-out",
                  }}
                  className="flex gap-4 items-center mb-3"
                >
                  {[75, 80, 85].map((size) => (
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
                    onClick={() => setNumpadSize(100)}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                      numpadSize === 100
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Full
                  </button>
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
                <div
                  style={{
                    transform: `translateY(${numpadOffset}px)`,
                    transition: "transform 0.1s ease-out",
                  }}
                  className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-3 py-4 rounded-lg mb-4 flex justify-between items-center"
                >
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
                  <div
                    style={{
                      width: `${numpadSize}%`,
                      transform: `translateY(${numpadOffset}px)`,
                      transition: "transform 0.1s ease-out",
                    }}
                  >
                    {/* 3-column grid */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleNumberClick(num)}
                          className="h-16 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
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
                            className="h-16 px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            ⌫
                          </button>
                          <button
                            onClick={handleDecimal}
                            className="h-16 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            .
                          </button>
                          <button
                            onClick={() => handleNumberClick(0)}
                            className="h-16 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            0
                          </button>
                          <button
                            onClick={handleConfirm}
                            className="h-16 px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md"
                          >
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleConfirm}
                            className="h-16 px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => handleNumberClick(0)}
                            className="h-16 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            0
                          </button>
                          <button
                            onClick={handleDecimal}
                            className="h-16 px-2 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            .
                          </button>
                          <button
                            onClick={handleDelete}
                            className="h-16 px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                          >
                            ⌫
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section D: Up/Down/Lock */}
                  <div
                    className="flex flex-col gap-3 flex-1"
                    style={{
                      height: "calc(4 * 4rem + 3 * 12px)",
                      transform: `translateY(${numpadOffset}px)`,
                      transition: "transform 0.1s ease-out",
                    }}
                  >
                    <button
                      onClick={handleMoveUp}
                      disabled={isLocked}
                      className={`rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center ${
                        isLocked
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 font-bold"
                      }`}
                      style={{ height: "37.5%" }}
                    >
                      <ChevronUp size={32} />
                    </button>
                    <button
                      onClick={handleMoveDown}
                      disabled={isLocked}
                      className={`rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center ${
                        isLocked
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 font-bold"
                      }`}
                      style={{ height: "37.5%" }}
                    >
                      <ChevronDown size={32} />
                    </button>
                    <button
                      onClick={handleToggleLock}
                      className={`rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center font-bold ${
                        isLocked
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white"
                          : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700"
                      }`}
                      style={{ height: "25%" }}
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
    </div>
  );
}
