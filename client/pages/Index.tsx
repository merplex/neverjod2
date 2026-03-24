import { useState } from "react";
import { ChevronUp, ChevronDown, Lock, LockOpen } from "lucide-react";

type InputPage = "category" | "account" | "amount";

const categories = [
  { id: "food", name: "Food", type: "expense" },
  { id: "transport", name: "Transport", type: "expense" },
  { id: "entertainment", name: "Entertainment", type: "expense" },
  { id: "shopping", name: "Shopping", type: "expense" },
  { id: "bills", name: "Bills", type: "expense" },
  { id: "health", name: "Health", type: "expense" },
  { id: "education", name: "Education", type: "expense" },
  { id: "utilities", name: "Utilities", type: "expense" },
  { id: "dining", name: "Dining", type: "expense" },
  { id: "travel", name: "Travel", type: "expense" },
  { id: "groceries", name: "Groceries", type: "expense" },
  { id: "fitness", name: "Fitness", type: "expense" },
  { id: "gifts", name: "Gifts", type: "expense" },
  { id: "insurance", name: "Insurance", type: "expense" },
  { id: "subscriptions", name: "Subscriptions", type: "expense" },
  { id: "other", name: "Other", type: "expense" },
  { id: "salary", name: "Salary", type: "income" },
  { id: "bonus", name: "Bonus", type: "income" },
  { id: "freelance", name: "Freelance", type: "income" },
  { id: "investment", name: "Investment", type: "income" },
  { id: "refund", name: "Refund", type: "income" },
  { id: "dividend", name: "Dividend", type: "income" },
  { id: "interest", name: "Interest", type: "income" },
  { id: "rental", name: "Rental", type: "income" },
  { id: "gift_received", name: "Gift Received", type: "income" },
  { id: "lottery", name: "Lottery", type: "income" },
  { id: "business", name: "Business", type: "income" },
  { id: "other_income", name: "Other Income", type: "income" },
  { id: "savings", name: "Savings", type: "transfer" },
  { id: "transfer", name: "Transfer", type: "transfer" },
];

const accounts = [
  { id: "uob", name: "UOB", type: "credit card" },
  { id: "banka", name: "BankA", type: "debit card" },
  { id: "krungsri", name: "Krungsri", type: "savings account" },
  { id: "bangkok", name: "Bangkok Bank", type: "credit card" },
  { id: "kasikorn", name: "Kasikornbank", type: "debit card" },
  { id: "tmb", name: "TMB", type: "savings account" },
  { id: "scb", name: "SCB", type: "credit card" },
  { id: "acme", name: "ACME", type: "debit card" },
  { id: "kkp", name: "KKP", type: "savings account" },
  { id: "ghb", name: "GHB", type: "credit card" },
  { id: "kbank_cc", name: "K-Bank CC", type: "credit card" },
  { id: "aeon", name: "AEON", type: "credit card" },
  { id: "citibank", name: "Citibank", type: "credit card" },
  { id: "hsbc", name: "HSBC", type: "debit card" },
  { id: "gbank", name: "GSBank", type: "savings account" },
  { id: "icbc", name: "ICBC", type: "debit card" },
  { id: "botn", name: "BoTN", type: "savings account" },
  { id: "mufg", name: "MUFG", type: "debit card" },
  { id: "baht_pay", name: "Baht Pay", type: "digital wallet" },
  { id: "promptpay", name: "PromptPay", type: "digital wallet" },
  { id: "truemoney", name: "TrueMoney", type: "digital wallet" },
  { id: "linepay", name: "LINE Pay", type: "digital wallet" },
  { id: "rabbit", name: "Rabbit Card", type: "prepaid card" },
  { id: "bt_purse", name: "BTS Purse", type: "prepaid card" },
  { id: "beep", name: "BEEP Card", type: "prepaid card" },
  { id: "octopus", name: "Octopus", type: "prepaid card" },
  { id: "cash", name: "Cash", type: "cash" },
  { id: "crypto", name: "Crypto", type: "cryptocurrency" },
  { id: "investment_acc", name: "Investment", type: "investment" },
  { id: "other_acc", name: "Other", type: "other" },
];

export default function Index() {
  const [currentPage, setCurrentPage] = useState<InputPage>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Persistent Account Section - Always Visible */}
          <div className="px-6 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Accounts</h3>
            <div className="grid grid-cols-2 gap-2">
              {accounts.slice(0, 6).map((account) => (
                <button
                  key={account.id}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex flex-col items-center gap-0.5 cursor-pointer text-xs"
                >
                  <span className="font-bold text-xs">{account.name}</span>
                  <span className="text-xs text-slate-600 font-normal">{account.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Main Input Area */}
          <div className="px-6 py-6 bg-white">
            {/* Category Input Page (5 rows × 6 columns) */}
            {currentPage === "category" && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4">Select Category</h2>
                <div className="grid grid-cols-6 gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="py-2 px-1 bg-indigo-50 hover:bg-indigo-200 text-indigo-900 font-semibold rounded-lg transition-colors flex flex-col items-center gap-0.5 cursor-pointer text-xs"
                    >
                      <span className="font-bold text-xs">{category.name.slice(0, 4)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account Input Page (5 rows × 6 columns) */}
            {currentPage === "account" && (
              <div>
                <button
                  onClick={() => setCurrentPage("category")}
                  className="mb-4 text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                >
                  ← Back
                </button>
                <h2 className="text-lg font-bold text-slate-900 mb-4">Select Account</h2>
                <div className="grid grid-cols-6 gap-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account.id)}
                      className="py-2 px-1 bg-indigo-50 hover:bg-indigo-200 text-indigo-900 font-semibold rounded-lg transition-colors flex flex-col items-center gap-0.5 cursor-pointer text-xs"
                    >
                      <span className="font-bold text-xs">{account.name.slice(0, 4)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount Input Page (Numpad A-B-C-D) */}
            {currentPage === "amount" && (
              <div>
                <button
                  onClick={() => setCurrentPage("account")}
                  className="mb-4 text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                >
                  ← Back
                </button>

                {/* Section A: Size Controls */}
                <div
                  style={{
                    transform: `translateY(${numpadOffset}px)`,
                    transition: "transform 0.1s ease-out",
                  }}
                  className="flex gap-4 items-center mb-4"
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
                  className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-3 py-4 rounded-lg mb-4"
                >
                  <div className="text-2xl font-bold text-white font-mono tracking-tight">
                    ฿{display}
                  </div>
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
