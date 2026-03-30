import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Trash2, Lock, LockOpen, Calculator, X } from "lucide-react";
import { useState } from "react";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { getTransaction } from "../utils/transactionData";
import { markDeleted } from "../utils/syncService";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";
import {
  Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap,
  Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal,
  CreditCard, Wallet, Smartphone, Banknote, Trash2 as Trash2Icon,
  Home, Car, Coffee, Briefcase, Star, Clock, Camera, Headphones,
  Wrench, Scissors, Flame, Leaf, Baby, Package, Truck, Train, Bike, Building2,
} from "lucide-react";

// ---- helpers ----

function getRawTransaction(id: string): any {
  try {
    const txns = JSON.parse(localStorage.getItem("app_transactions") || "[]");
    return txns.find((t: any) => t.id === id) || null;
  } catch { return null; }
}

function updateLocalTransaction(id: string, updates: any) {
  try {
    const txns = JSON.parse(localStorage.getItem("app_transactions") || "[]");
    const idx = txns.findIndex((t: any) => t.id === id);
    if (idx !== -1) {
      txns[idx] = { ...txns[idx], ...updates };
      localStorage.setItem("app_transactions", JSON.stringify(txns));
    }
  } catch {}
}

function deleteLocalTransaction(id: string) {
  try {
    const txns = JSON.parse(localStorage.getItem("app_transactions") || "[]");
    const tx = txns.find((t: any) => t.id === id);
    if (tx) markDeleted("transaction", tx);
    localStorage.setItem("app_transactions", JSON.stringify(txns.filter((t: any) => t.id !== id)));
  } catch {}
}

// maps both category IDs and iconIds (for custom categories/accounts)
const categoryIconMap: Record<string, React.ComponentType<any>> = {
  food: Utensils, transport: Bus, entertainment: Music, shopping: ShoppingCart,
  bills: FileText, health: Heart, education: BookOpen, utilities: Zap,
  salary: TrendingUp, bonus: Gift, freelance: Banknote, other: MoreHorizontal,
  travel: Plane, gifts: Gift, sports: Dumbbell, clothing: ShoppingBag,
  investment: TrendingUp, rental: CreditCard, food_delivery: Utensils,
  subscription: Zap, insurance: FileText, car: Bus, phone: Smartphone,
  internet: Zap, hobby: Music, pets: Heart, childcare: Gift, loan: FileText,
  nocat: MoreHorizontal,
  // iconIds for custom categories
  home: Home, coffee: Coffee, briefcase: Briefcase, star: Star, clock: Clock,
  camera: Camera, headphones: Headphones, wrench: Wrench, scissors: Scissors,
  flame: Flame, leaf: Leaf, baby: Baby, package: Package, truck: Truck,
  train: Train, bike: Bike, building: Building2,
  card: CreditCard, wallet: Wallet, cash: Banknote, invest: TrendingUp,
};

const accountIconMap: Record<string, React.ComponentType<any>> = {
  uob: CreditCard, banka: CreditCard, krungsri: Wallet, bangkok: CreditCard,
  kasikorn: CreditCard, tmb: Wallet, scb: CreditCard, acme: CreditCard,
  cash: Banknote, crypto: TrendingUp, baht_pay: Smartphone, other_acc: MoreHorizontal,
  kbank: Smartphone, revolut: CreditCard, wise: Wallet, stripe: CreditCard,
  paypal: Banknote, account_deleted: Trash2Icon, travel_card: CreditCard,
  // iconIds for custom accounts
  creditcard: CreditCard, card: CreditCard, wallet: Wallet, invest: TrendingUp,
  salary: TrendingUp, phone: Smartphone, other: MoreHorizontal,
  food: Utensils, transport: Bus, entertainment: Music, shopping: ShoppingCart,
  bills: FileText, health: Heart, education: BookOpen, utilities: Zap,
  travel: Plane, clothing: ShoppingBag, sports: Dumbbell, gifts: Gift,
  home: Home, car: Car, coffee: Coffee, briefcase: Briefcase, star: Star,
  clock: Clock, camera: Camera, headphones: Headphones, wrench: Wrench,
  scissors: Scissors, flame: Flame, leaf: Leaf, baby: Baby, package: Package,
  truck: Truck, train: Train, bike: Bike, building: Building2,
};

// ---- component ----

export default function TransactionDetail() {
  const { accountId, transactionId } = useParams();
  const navigate = useNavigate();
  useSwipeBack();

  const transaction = transactionId ? getTransaction(transactionId) : null;
  const raw = transactionId ? getRawTransaction(transactionId) : null;

  const [categoryId, setCategoryId] = useState<string>(raw?.categoryId || "");
  const [categoryName, setCategoryName] = useState<string>(transaction?.category || "");
  const [currentAccountId, setCurrentAccountId] = useState<string>(transaction?.accountId || "");
  const [currentAccountName, setCurrentAccountName] = useState<string>(transaction?.accountName || "");
  const [amount, setAmount] = useState<string>(transaction?.amount.toString() || "0");
  const [showAmountPad, setShowAmountPad] = useState(false);
  const [numpadDisplay, setNumpadDisplay] = useState(transaction?.amount.toString() || "0");
  const [numpadSize, setNumpadSize] = useState(70);
  const [isRightMode, setIsRightMode] = useState(false);
  const [isNumpadLocked, setIsNumpadLocked] = useState(false);
  const [isCalcMode, setIsCalcMode] = useState(false);
  const [description, setDescription] = useState<string>(transaction?.description || "");
  const [currentDate, setCurrentDate] = useState<Date>(transaction?.date || new Date());
  const [currentTime, setCurrentTime] = useState<Date>(() => {
    const time = transaction?.time || "00:00";
    const [h, m] = time.split(":").map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0); return d;
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load from localStorage
  const [categoriesList] = useState<any[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("app_categories") || "[]");
      return stored.length ? stored : [];
    } catch { return []; }
  });

  const [accountsList] = useState<any[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("app_accounts") || "[]");
      return stored.filter((a: any) => a.id !== "account_deleted");
    } catch { return []; }
  });

  const isPremium = localStorage.getItem("app_premium") === "true";
  const overLimitCatIds = new Set<string>(
    !isPremium ? categoriesList.filter((c: any) => c.id !== "nocat").slice(5).map((c: any) => c.id) : []
  );
  const overLimitAccIds = new Set<string>(
    !isPremium ? accountsList.slice(3).map((a: any) => a.id) : []
  );

  if (!transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Transaction not found</p>
      </div>
    );
  }

  const type = transaction.type;
  const sign = type === "income" ? "+" : "-";
  const signColor = type === "income" ? "text-green-600" : "text-red-500";

  const handleCategorySelect = (catId: string, catName: string) => {
    setCategoryId(catId);
    setCategoryName(catName);
    updateLocalTransaction(transactionId!, { categoryId: catId });
    setShowCategoryPicker(false);
  };

  const handleAccountSelect = (accId: string, accName: string) => {
    setCurrentAccountId(accId);
    setCurrentAccountName(accName);
    updateLocalTransaction(transactionId!, { accountId: accId });
    setShowAccountPicker(false);
  };

  const handleDescriptionBlur = () => {
    updateLocalTransaction(transactionId!, { description });
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    updateLocalTransaction(transactionId!, { date: date.toISOString() });
  };

  const handleTimeSelect = (timeDate: Date) => {
    setCurrentTime(timeDate);
    const timeStr = `${timeDate.getHours().toString().padStart(2, "0")}:${timeDate.getMinutes().toString().padStart(2, "0")}`;
    updateLocalTransaction(transactionId!, { time: timeStr });
    setShowTimePicker(false);
  };

  const handleDelete = () => {
    deleteLocalTransaction(transactionId!);
    navigate(-1);
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) +
    " (" + d.toLocaleDateString("en-US", { weekday: "short" }) + ")";

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  // ---- numpad handlers ----
  const handleNumpadClick = (num: number) => {
    if (isNumpadLocked) return;
    if (isCalcMode) {
      setNumpadDisplay(prev => prev === "0" ? num.toString() : prev + num.toString());
    } else {
      setNumpadDisplay(prev => prev === "0" ? num.toString() : prev + num.toString());
    }
  };
  const handleNumpadClear = () => { if (!isNumpadLocked) setNumpadDisplay("0"); };
  const handleNumpadDecimal = () => {
    if (isNumpadLocked) return;
    if (isCalcMode) {
      const last = numpadDisplay.slice(-1);
      if (/\d/.test(last) && !numpadDisplay.split(/[+\-*/]/).pop()!.includes(".")) {
        setNumpadDisplay(numpadDisplay + ".");
      }
    } else {
      if (!numpadDisplay.includes(".")) setNumpadDisplay(numpadDisplay + ".");
    }
  };
  const handleNumpadDelete = () => {
    if (isNumpadLocked) return;
    setNumpadDisplay(prev => prev.slice(0, -1) || "0");
  };
  const handleNumpadOperator = (op: string) => {
    if (isNumpadLocked) return;
    const last = numpadDisplay.slice(-1);
    if (['+', '-', '*', '/'].includes(last)) {
      setNumpadDisplay(numpadDisplay.slice(0, -1) + op);
    } else if (numpadDisplay !== "0") {
      setNumpadDisplay(numpadDisplay + op);
    }
  };
  const handleNumpadEquals = () => {
    try {
      const clean = numpadDisplay.replace(/\s+/g, "");
      if (/^[\d+\-*/.]+$/.test(clean) && clean) {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${clean}`)() as number;
        if (typeof result === "number" && isFinite(result) && result > 0) {
          const val = parseFloat(result.toFixed(4));
          setNumpadDisplay(String(val));
        }
      }
    } catch {}
    setIsCalcMode(false);
  };
  const handleNumpadSave = () => {
    if (isCalcMode) {
      try {
        const clean = numpadDisplay.replace(/\s+/g, "");
        if (/^[\d+\-*/.]+$/.test(clean) && clean) {
          // eslint-disable-next-line no-new-func
          const result = new Function(`return ${clean}`)() as number;
          if (typeof result === "number" && isFinite(result) && result > 0) {
            const val = parseFloat(result.toFixed(4));
            setNumpadDisplay(String(val));
            setIsCalcMode(false);
            return;
          }
        }
      } catch {}
      setIsCalcMode(false);
      return;
    }
    const val = parseFloat(numpadDisplay) || 0;
    setAmount(val.toString());
    setNumpadDisplay(val.toString());
    updateLocalTransaction(transactionId!, { amount: val });
    setShowAmountPad(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pb-3 pt-safe-header flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate("/")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-base font-semibold text-slate-800">Transaction Detail</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-3">

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          {/* Category Row */}
          <button
            onClick={() => setShowCategoryPicker(true)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <span className="text-xs text-slate-400 w-20 text-left">Category</span>
            <span className="flex-1 text-sm font-medium text-slate-800 text-left">{categoryName || "—"}</span>
            <ChevronRight size={16} className="text-slate-300" />
          </button>

          {/* Account Row */}
          <button
            onClick={() => setShowAccountPicker(true)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <span className="text-xs text-slate-400 w-20 text-left">Account</span>
            <span className="flex-1 text-sm font-medium text-slate-800 text-left">{currentAccountName || "—"}</span>
            <ChevronRight size={16} className="text-slate-300" />
          </button>

          {/* Date + Time Row */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setShowDatePicker(true)}
              className="flex-1 flex items-center px-4 py-3 hover:bg-slate-50 transition-colors min-w-0"
            >
              <span className="text-xs text-slate-400 w-20 shrink-0 text-left">Date</span>
              <span className="text-sm font-medium text-slate-800 truncate">{formatDate(currentDate)}</span>
            </button>
            <div className="w-px bg-slate-100" />
            <button
              onClick={() => setShowTimePicker(true)}
              className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs text-slate-400">Time</span>
              <span className="text-sm font-medium text-slate-800">{formatTime(currentTime)}</span>
            </button>
          </div>

          {/* Amount Row */}
          <div className="flex items-center px-4 py-3">
            <span className="text-xs text-slate-400 w-20">Amount</span>
            <button
              onClick={() => { setNumpadDisplay(amount); setShowAmountPad(true); }}
              className="flex-1 text-left"
            >
              <span className={`text-sm font-semibold ${signColor}`}>
                {sign}฿{parseFloat(amount).toLocaleString()}
              </span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-2">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="เพิ่มหมายเหตุ..."
            rows={4}
            className="w-full text-sm text-slate-700 outline-none resize-none placeholder:text-slate-300"
          />
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
          Delete Transaction
        </button>

      </div>

      {/* Category Bottom Sheet */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setShowCategoryPicker(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col" style={{ height: "50vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-slate-800">Category</h3>
              <button onClick={() => setShowCategoryPicker(false)}>
                <span className="text-slate-400 text-lg">✕</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-3 divide-x divide-y divide-slate-100 pb-2">
                {categoriesList.filter((c: any) => c.id !== "nocat").map((cat: any) => {
                  const Icon = categoryIconMap[cat.id] || (cat.iconId ? categoryIconMap[cat.iconId] : null) || MoreHorizontal;
                  const locked = overLimitCatIds.has(cat.id);
                  return locked ? (
                    <button
                      key={cat.id}
                      disabled
                      className="py-4 flex flex-col items-center gap-1 opacity-40 cursor-not-allowed relative"
                    >
                      <Icon size={18} className="text-slate-400" />
                      <span className="text-xs text-center leading-tight text-slate-400">{cat.name}</span>
                      <Lock size={10} className="text-amber-500 absolute top-2 right-2" />
                    </button>
                  ) : (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id, cat.name)}
                      className={`py-4 flex flex-col items-center gap-1 hover:bg-slate-50 transition-colors ${cat.id === categoryId ? "bg-theme-50" : ""}`}
                    >
                      <Icon size={18} className={cat.id === categoryId ? "text-theme-600" : "text-slate-500"} />
                      <span className={`text-xs text-center leading-tight ${cat.id === categoryId ? "text-theme-600 font-semibold" : "text-slate-700"}`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Bottom Sheet */}
      {showAccountPicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setShowAccountPicker(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col" style={{ height: "50vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-slate-800">Account</h3>
              <button onClick={() => setShowAccountPicker(false)}>
                <span className="text-slate-400 text-lg">✕</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-3 divide-x divide-y divide-slate-100 pb-2">
                {accountsList.map((acc: any) => {
                  const Icon = accountIconMap[acc.id] || (acc.iconId ? accountIconMap[acc.iconId] : null) || CreditCard;
                  const locked = overLimitAccIds.has(acc.id);
                  return locked ? (
                    <button
                      key={acc.id}
                      disabled
                      className="py-4 flex flex-col items-center gap-1 opacity-40 cursor-not-allowed relative"
                    >
                      <Icon size={18} className="text-slate-400" />
                      <span className="text-xs text-center leading-tight text-slate-400">{acc.name}</span>
                      <Lock size={10} className="text-amber-500 absolute top-2 right-2" />
                    </button>
                  ) : (
                    <button
                      key={acc.id}
                      onClick={() => handleAccountSelect(acc.id, acc.name)}
                      className={`py-4 flex flex-col items-center gap-1 hover:bg-slate-50 transition-colors ${acc.id === currentAccountId ? "bg-theme-50" : ""}`}
                    >
                      <Icon size={18} className={acc.id === currentAccountId ? "text-theme-600" : "text-slate-500"} />
                      <span className={`text-xs text-center leading-tight ${acc.id === currentAccountId ? "text-theme-600 font-semibold" : "text-slate-700"}`}>
                        {acc.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amount Numpad Bottom Sheet */}
      {showAmountPad && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAmountPad(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col" style={{ height: "50vh" }}>
            <div className="px-4 pt-3 pb-4 flex flex-col flex-1 min-h-0">
              {/* Size Controls */}
              <div className="flex gap-2 mb-2 flex-shrink-0">
                {[70, 75, 80, 85].map((size) => (
                  <button
                    key={size}
                    onClick={() => setNumpadSize(size)}
                    disabled={isNumpadLocked}
                    className={`flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all ${numpadSize === size ? "bg-theme-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {size}%
                  </button>
                ))}
                <button
                  onClick={() => setIsRightMode(!isRightMode)}
                  disabled={isNumpadLocked}
                  className={`flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all ${isRightMode ? "bg-theme-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Right
                </button>
              </div>
              {/* Display */}
              <div className="bg-gradient-to-br from-theme-600 to-theme-700 px-3 py-2.5 rounded-lg flex items-center gap-2 mb-2 flex-shrink-0">
                <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  <div className="text-2xl font-bold font-mono tracking-tight whitespace-nowrap text-white">
                    {sign}฿{numpadDisplay}
                  </div>
                </div>
                <button onClick={handleNumpadClear} className="w-10 h-10 flex-shrink-0 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-bold text-lg flex items-center justify-center">C</button>
                <button onClick={() => setShowAmountPad(false)} className="p-1.5 hover:bg-theme-500 rounded-lg transition-colors text-white flex-shrink-0">
                  <X size={22} />
                </button>
              </div>
              {/* Numpad C+D */}
              <div className={`flex gap-2 flex-1 min-h-0 ${isRightMode ? "flex-row-reverse" : ""}`}>
                <div className="flex-1 min-h-0" style={{ width: `${numpadSize}%`, flex: "none" }}>
                  <div className="grid grid-cols-3 gap-1.5 h-full" style={{ gridTemplateRows: "repeat(4, 1fr)" }}>
                    {(isRightMode
                      ? [7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0, 'save'] as const
                      : [7, 8, 9, 4, 5, 6, 1, 2, 3, 'save', 0, '.'] as const
                    ).map((btn) => {
                      if (btn === 'save') return (
                        <button key="save" onClick={handleNumpadSave} className="h-full aspect-square justify-self-center bg-gradient-to-br from-theme-500 to-theme-600 hover:from-theme-600 hover:to-theme-700 text-white font-bold rounded-full transition-all active:scale-95 flex items-center justify-center">Save</button>
                      );
                      if (btn === '.') return (
                        <button key="dot" onClick={handleNumpadDecimal} className="h-full aspect-square justify-self-center bg-white border-2 border-theme-700 text-slate-900 font-bold text-xl rounded-full transition-all active:scale-95 flex items-center justify-center">.</button>
                      );
                      return (
                        <button key={btn} onClick={() => handleNumpadClick(btn as number)} className="h-full aspect-square justify-self-center bg-white border-2 border-theme-700 text-slate-900 font-bold text-xl rounded-full transition-all active:scale-95 flex items-center justify-center">{btn}</button>
                      );
                    })}
                  </div>
                </div>
                {/* Section D: Calc toggle + Lock/= */}
                <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                  {isCalcMode ? (
                    <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
                      {(['+', '-', '*', '/'] as const).map((op) => (
                        <button
                          key={op}
                          onClick={() => handleNumpadOperator(op)}
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
                      onClick={handleNumpadEquals}
                      className="rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center font-bold text-2xl flex-1 bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white"
                    >
                      =
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsNumpadLocked(!isNumpadLocked)}
                      className={`rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center font-bold flex-1 ${isNumpadLocked ? "bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white" : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700"}`}
                    >
                      {isNumpadLocked ? <Lock size={24} /> : <LockOpen size={24} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DatePicker value={currentDate} onChange={handleDateSelect} onClose={() => setShowDatePicker(false)} />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <TimePicker value={currentTime} onChange={handleTimeSelect} onClose={() => setShowTimePicker(false)} />
      )}
    </div>
  );
}
