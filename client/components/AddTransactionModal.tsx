import { useState } from "react";
import { X, Calculator, Lock, LockOpen, ChevronRight, ChevronDown } from "lucide-react";
import {
  REPEAT_OPTIONS, RepeatOption,
  addRepeatTransaction, buildInitialNextDue,
} from "../utils/repeatTransactionService";
import { getLang } from "../utils/i18n";
import {
  Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap,
  Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal,
  CreditCard, Wallet, Smartphone, Banknote,
  Home, Car, Coffee, Briefcase, Star, Clock, Camera, Headphones,
  Wrench, Scissors, Flame, Leaf, Baby, Package, Truck, Train, Bike, Building2,
} from "lucide-react";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import { useT } from "../hooks/useT";

// ---- icon maps ----
const allIconsMap: Record<string, React.ComponentType<any>> = {
  food: Utensils, transport: Bus, entertainment: Music, shopping: ShoppingCart,
  bills: FileText, health: Heart, education: BookOpen, utilities: Zap,
  salary: TrendingUp, bonus: Gift, freelance: Banknote, other: MoreHorizontal,
  travel: Plane, gifts: Gift, sports: Dumbbell, clothing: ShoppingBag,
  investment: TrendingUp, rental: CreditCard, food_delivery: Utensils,
  subscription: Zap, insurance: FileText, car: Bus, phone: Smartphone,
  internet: Zap, hobby: Music, pets: Heart, childcare: Gift, loan: FileText,
  nocat: MoreHorizontal,
  home: Home, coffee: Coffee, briefcase: Briefcase, star: Star, clock: Clock,
  camera: Camera, headphones: Headphones, wrench: Wrench, scissors: Scissors,
  flame: Flame, leaf: Leaf, baby: Baby, package: Package, truck: Truck,
  train: Train, bike: Bike, building: Building2,
  // account ids
  uob: CreditCard, banka: CreditCard, krungsri: Wallet, bangkok: CreditCard,
  kasikorn: CreditCard, tmb: Wallet, scb: CreditCard, acme: CreditCard,
  cash: Banknote, crypto: TrendingUp, baht_pay: Smartphone, other_acc: MoreHorizontal,
  kbank: Smartphone, revolut: CreditCard, wise: Wallet, stripe: CreditCard,
  paypal: Banknote, travel_card: CreditCard,
  // iconIds
  creditcard: CreditCard, card: CreditCard, wallet: Wallet, invest: TrendingUp,
};

function resolveIcon(item: any, fallback: React.ComponentType<any>): React.ComponentType<any> {
  return allIconsMap[item.id] || (item.iconId && allIconsMap[item.iconId]) || fallback;
}

// ---- save helper ----
function saveNewTransaction(
  categoryId: string, accountId: string, amount: number,
  description: string, date: Date, timeStr: string,
) {
  const txn = {
    id: Date.now().toString(),
    categoryId,
    accountId,
    amount,
    description: description.trim(),
    date: date.toISOString(),
    time: timeStr,
  };
  const existing = JSON.parse(localStorage.getItem("app_transactions") || "[]");
  existing.unshift(txn);
  localStorage.setItem("app_transactions", JSON.stringify(existing));
}

// ---- format helpers ----
function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) +
    " (" + d.toLocaleDateString("en-US", { weekday: "short" }) + ")";
}
function formatTime(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ---- props ----
interface Props {
  onClose: () => void;
  onSaved: () => void;
  isRepeatMode?: boolean;   // when true: saves a repeat rule, not a single transaction
}

export default function AddTransactionModal({ onClose, onSaved, isRepeatMode = false }: Props) {
  const T = useT();
  // form state
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [description, setDescription] = useState("");

  // pickers visibility — category opens first
  const [showCategoryPicker, setShowCategoryPicker] = useState(true);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showAmountPad, setShowAmountPad] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // numpad state
  const [display, setDisplay] = useState("0");
  const [value, setValue] = useState(0);
  const [numpadSize, setNumpadSize] = useState(70);
  const [isLocked, setIsLocked] = useState(false);
  const [isRightMode, setIsRightMode] = useState(false);

  // repeat state (only used when isRepeatMode=true)
  const [repeatOption, setRepeatOption] = useState<RepeatOption>("monthly");
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);

  // Calculator mode
  const [isCalcMode, setIsCalcMode] = useState(false);

  // data from localStorage
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
    !isPremium ? [
      ...categoriesList.filter((c: any) => c.id !== "nocat" && c.type !== "income").slice(5).map((c: any) => c.id),
      ...categoriesList.filter((c: any) => c.id !== "nocat" && c.type === "income").slice(1).map((c: any) => c.id),
    ] : []
  );
  const overLimitAccIds = new Set<string>(
    !isPremium ? accountsList.slice(3).map((a: any) => a.id) : []
  );

  // ---- category handlers ----
  const handleCategorySelect = (catId: string, catName: string, catType: string) => {
    setCategoryId(catId);
    setCategoryName(catName);
    setCategoryType(catType === "income" ? "income" : "expense");
    setShowCategoryPicker(false);
    setShowAccountPicker(true);
  };

  // ---- account handlers ----
  const handleAccountSelect = (accId: string, accName: string) => {
    setAccountId(accId);
    setAccountName(accName);
    setShowAccountPicker(false);
    setShowAmountPad(true);
  };

  // ---- numpad handlers ----
  const handleNumberClick = (num: number) => {
    if (isLocked) return;
    if (isCalcMode) {
      setDisplay(prev => prev === "0" ? num.toString() : prev + num.toString());
    } else {
      if (display === "0") {
        setDisplay(num.toString());
        setValue(num);
      } else {
        const newDisplay = display + num.toString();
        setDisplay(newDisplay);
        setValue(parseFloat(newDisplay));
      }
    }
  };

  const handleDecimal = () => {
    if (isLocked) return;
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
    if (isLocked) return;
    const newDisplay = display.slice(0, -1) || "0";
    setDisplay(newDisplay);
    if (!isCalcMode) setValue(parseFloat(newDisplay) || 0);
  };

  const handleAmountSave = () => {
    if (isCalcMode) {
      try {
        const clean = display.replace(/\s+/g, "");
        if (/^[\d+\-*/.]+$/.test(clean) && clean) {
          // eslint-disable-next-line no-new-func
          const result = new Function(`return ${clean}`)() as number;
          if (typeof result === "number" && isFinite(result) && result > 0) {
            const val = parseFloat(result.toFixed(4));
            setDisplay(String(val));
            setValue(val);
            setIsCalcMode(false);
            return; // show result, user can press Save again
          }
        }
      } catch {}
      setIsCalcMode(false);
      return;
    }
    setValue(parseFloat(display) || 0);
    setShowAmountPad(false);
    setShowDatePicker(true);
  };

  // ---- calculator mode operator ----
  const handleEquals = () => {
    try {
      const clean = display.replace(/\s+/g, "");
      if (/^[\d+\-*/.]+$/.test(clean) && clean) {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${clean}`)() as number;
        if (typeof result === "number" && isFinite(result) && result > 0) {
          const val = parseFloat(result.toFixed(4));
          setDisplay(String(val)); setValue(val);
        }
      }
    } catch {}
    setIsCalcMode(false);
  };

  const handleOperator = (op: string) => {
    const last = display.slice(-1);
    if (['+', '-', '*', '/'].includes(last)) {
      setDisplay(display.slice(0, -1) + op);
    } else if (display !== "0") {
      setDisplay(display + op);
    }
  };

  // ---- save ----
  const canSave = categoryId && accountId && value > 0;
  const handleSave = () => {
    if (!canSave) return;
    const timeStr = formatTime(currentTime);

    if (isRepeatMode) {
      const partial = {
        id: Date.now().toString(),
        categoryId,
        categoryName,
        accountId,
        accountName,
        amount: value,
        description,
        categoryType,
        repeatOption,
        dayOfMonth: currentDate.getDate(),
        weekday: currentDate.getDay(),
        monthOfYear: currentDate.getMonth(),
        time: timeStr,
        startDate: currentDate.toISOString(),
      };
      const nextDue = buildInitialNextDue(partial as any);
      addRepeatTransaction({ ...partial, nextDue });
    } else {
      saveNewTransaction(categoryId, accountId, value, description, currentDate, timeStr);
    }

    onSaved();
    onClose();
  };

  const sign = categoryType === "income" ? "+" : "-";
  const signColor = categoryType === "income" ? "text-green-600" : "text-red-500";

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pb-3 pt-safe-header flex items-center gap-3 flex-shrink-0">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={20} className="text-slate-600" />
        </button>
        <h1 className="text-base font-semibold text-slate-800">New Transaction</h1>
      </div>

      {/* Form Card */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-4 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Category Row */}
            <button
              onClick={() => setShowCategoryPicker(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <span className="text-xs text-slate-400 w-20 text-left">Category</span>
              <span className={`flex-1 text-sm font-medium text-left ${categoryName ? "text-slate-800" : "text-slate-300"}`}>
                {categoryName || T("tap_to_select")}
              </span>
              <ChevronRight size={16} className="text-slate-300" />
            </button>

            {/* Account Row */}
            <button
              onClick={() => { if (categoryId) setShowAccountPicker(true); }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <span className="text-xs text-slate-400 w-20 text-left">Account</span>
              <span className={`flex-1 text-sm font-medium text-left ${accountName ? "text-slate-800" : "text-slate-300"}`}>
                {accountName || (categoryId ? T("tap_to_select") : "—")}
              </span>
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
            <button
              onClick={() => { if (categoryId && accountId) setShowAmountPad(true); }}
              className="w-full flex items-center px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs text-slate-400 w-20">Amount</span>
              <span className={`text-sm font-semibold ${value > 0 ? signColor : "text-slate-300"}`}>
                {value > 0 ? `${sign}฿${value.toLocaleString()}` : (categoryId && accountId ? T("tap_to_enter") : "—")}
              </span>
            </button>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-2">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={T("note_placeholder")}
              rows={3}
              className="w-full text-sm text-slate-700 outline-none resize-none placeholder:text-slate-300"
            />
          </div>

          {/* Repeat Section — repeat mode only */}
          {isRepeatMode && (() => {
            const selected = REPEAT_OPTIONS.find((o) => o.value === repeatOption)!;
            return (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowRepeatPicker(true)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                  <span className="text-xs text-slate-400 w-20 text-left">Repeat</span>
                  <span className="flex-1 text-sm font-medium text-slate-800 text-left">{getLang() === "en" ? selected.labelEn : selected.label}</span>
                  <span className="text-xs text-slate-400 mr-2">{selected.desc}</span>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </button>
                <div className="px-4 py-2">
                  <p className="text-xs text-slate-400">
                    {repeatOption === "weekly" || repeatOption === "biweekly"
                      ? `${T("modal.start_day")}${[T("day.sun"),T("day.mon"),T("day.tue"),T("day.wed"),T("day.thu"),T("day.fri"),T("day.sat")][currentDate.getDay()]} — ${repeatOption === "biweekly" ? T("modal.every_2weeks") : T("modal.week")}`
                      : repeatOption === "daily"
                      ? T("modal.every_day")
                      : `${T("acc.date")} ${currentDate.getDate()} ${T("modal.day_of_cycle")}`
                    }
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
              canSave
                ? "bg-theme-600 text-white hover:bg-theme-700"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isRepeatMode ? T("modal.save_repeat") : T("modal.save_transaction")}
          </button>
        </div>
      </div>

      {/* ---- Category Bottom Sheet ---- */}
      {showCategoryPicker && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCategoryPicker(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col" style={{ height: "50vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-slate-800">Category</h3>
              <button onClick={() => setShowCategoryPicker(false)}>
                <span className="text-slate-400 text-lg">✕</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {(["expense", "income"] as const).map((sectionType) => {
                const sectionCats = categoriesList.filter((c: any) => c.id !== "nocat" && c.type === sectionType);
                if (sectionCats.length === 0) return null;
                return (
                  <div key={sectionType}>
                    <div className="px-4 py-1.5 bg-slate-50 border-y border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {sectionType === "expense" ? "Expense" : "Income"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-y divide-slate-100">
                      {sectionCats.map((cat: any) => {
                        const Icon = resolveIcon(cat, MoreHorizontal);
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
                            onClick={() => handleCategorySelect(cat.id, cat.name, cat.type)}
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
                );
              })}
              <div className="pb-2" />
            </div>
          </div>
        </div>
      )}

      {/* ---- Account Bottom Sheet ---- */}
      {showAccountPicker && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAccountPicker(false)} />
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
                  const Icon = resolveIcon(acc, CreditCard);
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
                      className={`py-4 flex flex-col items-center gap-1 hover:bg-slate-50 transition-colors ${acc.id === accountId ? "bg-theme-50" : ""}`}
                    >
                      <Icon size={18} className={acc.id === accountId ? "text-theme-600" : "text-slate-500"} />
                      <span className={`text-xs text-center leading-tight ${acc.id === accountId ? "text-theme-600 font-semibold" : "text-slate-700"}`}>
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

      {/* ---- Date Picker ---- */}
      {showDatePicker && (
        <DatePicker
          value={currentDate}
          onChange={(d) => { setCurrentDate(d); setShowDatePicker(false); setShowTimePicker(true); }}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* ---- Time Picker ---- */}
      {showTimePicker && (
        <TimePicker
          value={currentTime}
          onChange={(t) => { setCurrentTime(t); setShowTimePicker(false); }}
          onClose={() => setShowTimePicker(false)}
        />
      )}

      {/* ---- Repeat Picker Bottom Sheet ---- */}
      {showRepeatPicker && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRepeatPicker(false)} />
          <div className="relative bg-white rounded-t-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">{T("modal.repeat_frequency")}</h3>
              <button onClick={() => setShowRepeatPicker(false)}>
                <span className="text-slate-400 text-lg">✕</span>
              </button>
            </div>
            <div className="py-2 pb-8">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setRepeatOption(opt.value); setShowRepeatPicker(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors ${opt.value === repeatOption ? "bg-theme-50" : ""}`}
                >
                  <span className={`text-sm font-semibold w-28 text-left ${opt.value === repeatOption ? "text-theme-700" : "text-slate-800"}`}>
                    {getLang() === "en" ? opt.labelEn : opt.label}
                  </span>
                  <span className="text-xs text-slate-400 flex-1 text-left">{opt.desc}</span>
                  {opt.value === repeatOption && (
                    <span className="text-theme-600 text-base">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Amount Numpad Overlay (bottom sheet) ---- */}
      {showAmountPad && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAmountPad(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col" style={{ height: "50vh" }}>
          <div className="px-4 pt-3 pb-4 flex flex-col flex-1 min-h-0">
            {/* Section A: Size Controls */}
            <div className="flex gap-2 items-center mb-2 flex-shrink-0">
              {[70, 75, 80, 85].map((size) => (
                <button
                  key={size}
                  onClick={() => setNumpadSize(size)}
                  disabled={isLocked}
                  className={`flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                    numpadSize === size ? "bg-theme-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {size}%
                </button>
              ))}
              <button
                onClick={() => setIsRightMode(!isRightMode)}
                disabled={isLocked}
                className={`flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                  isRightMode ? "bg-theme-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Right
              </button>
            </div>

            {/* Section B: Display */}
            <div className="bg-gradient-to-br from-theme-600 to-theme-700 px-3 py-2.5 rounded-lg flex items-center gap-2 mb-2 flex-shrink-0">
              <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <div className="text-2xl font-bold font-mono tracking-tight text-white whitespace-nowrap">
                  {sign}฿{display}
                </div>
              </div>
              <button
                onClick={() => { setDisplay("0"); setValue(0); setIsCalcMode(false); }}
                className="w-10 h-10 flex-shrink-0 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-bold text-lg flex items-center justify-center"
              >
                C
              </button>
              <button
                onClick={() => setShowAmountPad(false)}
                className="p-1.5 hover:bg-theme-500 rounded-lg transition-colors text-white flex-shrink-0"
              >
                <X size={22} />
              </button>
            </div>

            {/* Section C+D — fills remaining height */}
            <div className={`flex gap-2 flex-1 min-h-0 ${isRightMode ? "flex-row-reverse" : ""}`}>
              {/* Section C: Numpad 4x3 */}
              <div className="grid grid-cols-3 gap-1.5 min-h-0 h-full" style={{ width: `${numpadSize}%`, gridTemplateRows: 'repeat(4, 1fr)', flex: 'none' }}>
                {(isRightMode
                  ? [7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0, 'save'] as const
                  : [7, 8, 9, 4, 5, 6, 1, 2, 3, 'save', 0, '.'] as const
                ).map((btn) => {
                  if (btn === 'save') return (
                    <button key="save" onClick={handleAmountSave} className="h-full px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md">Save</button>
                  );
                  if (btn === '.') return (
                    <button key="dot" onClick={handleDecimal} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">.</button>
                  );
                  return (
                    <button key={btn} onClick={() => handleNumberClick(btn as number)} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">{btn}</button>
                  );
                })}
              </div>

              {/* Section D: Calc toggle + Lock/= */}
              <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                {isCalcMode ? (
                  <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
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
                    onClick={() => setIsLocked(!isLocked)}
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
        </div>
      )}
    </div>
  );
}
