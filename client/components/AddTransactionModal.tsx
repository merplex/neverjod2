import { useState, useRef } from "react";
import { X, Calculator, Lock, LockOpen, Mic, ChevronRight, ChevronDown } from "lucide-react";
import {
  REPEAT_OPTIONS, RepeatOption,
  addRepeatTransaction, buildInitialNextDue,
} from "../utils/repeatTransactionService";
import {
  Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap,
  Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal,
  CreditCard, Wallet, Smartphone, Banknote,
  Home, Car, Coffee, Briefcase, Star, Clock, Camera, Headphones,
  Wrench, Scissors, Flame, Leaf, Baby, Package, Truck, Train, Bike, Building2,
} from "lucide-react";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import Recording from "./Recording";
import { calculateFromVoice } from "../utils/voiceCalculator";

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
  const [numpadSize, setNumpadSize] = useState(80);
  const [isLocked, setIsLocked] = useState(false);
  const [isRightMode, setIsRightMode] = useState(false);

  // repeat state (only used when isRepeatMode=true)
  const [repeatOption, setRepeatOption] = useState<RepeatOption>("monthly");
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);

  // voice calculator toggle state
  const [isVoiceCalcActive, setIsVoiceCalcActive] = useState(false);
  const [voiceCalcStartTrigger, setVoiceCalcStartTrigger] = useState(0);
  const [voiceCalcStopTrigger, setVoiceCalcStopTrigger] = useState(0);
  const voiceCalcTranscriptRef = useRef("");
  const voiceCalcActiveRef = useRef(false);

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
    if (display === "0") {
      setDisplay(num.toString());
      setValue(num);
    } else {
      const newDisplay = display + num.toString();
      setDisplay(newDisplay);
      setValue(parseFloat(newDisplay));
    }
  };

  const handleDecimal = () => {
    if (isLocked || display.includes(".")) return;
    setDisplay(display + ".");
  };

  const handleDelete = () => {
    if (isLocked) return;
    const newDisplay = display.slice(0, -1) || "0";
    setDisplay(newDisplay);
    setValue(parseFloat(newDisplay) || 0);
  };

  const handleAmountSave = () => {
    setValue(parseFloat(display) || 0);
    setShowAmountPad(false);
    setShowDatePicker(true);
  };

  // ---- voice calc handlers ----
  const handleVoiceCalcTranscript = (text: string) => {
    if (!voiceCalcActiveRef.current) return; // ignore late transcripts after stop
    const accumulated = (voiceCalcTranscriptRef.current + " " + text).trim();
    voiceCalcTranscriptRef.current = accumulated;
    const { expression } = calculateFromVoice(accumulated);
    if (expression.trim()) setDisplay(expression);
  };

  const handleVoiceCalcToggle = () => {
    if (isLocked) return;
    if (isVoiceCalcActive) {
      voiceCalcActiveRef.current = false;
      setVoiceCalcStopTrigger((n) => n + 1);
      setIsVoiceCalcActive(false);
      const snapshot = voiceCalcTranscriptRef.current;
      voiceCalcTranscriptRef.current = "";
      const { result, error } = calculateFromVoice(snapshot);
      if (!error && result !== 0) {
        setDisplay(result.toString());
        setValue(result);
      }
    } else {
      voiceCalcActiveRef.current = true;
      voiceCalcTranscriptRef.current = "";
      setIsVoiceCalcActive(true);
      setVoiceCalcStartTrigger((n) => n + 1);
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
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
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
                {categoryName || "Tap to select"}
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
                {accountName || (categoryId ? "Tap to select" : "—")}
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
                {value > 0 ? `${sign}฿${value.toLocaleString()}` : (categoryId && accountId ? "Tap to enter" : "—")}
              </span>
            </button>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-2">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เพิ่มหมายเหตุ..."
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
                  <span className="flex-1 text-sm font-medium text-slate-800 text-left">{selected.label}</span>
                  <span className="text-xs text-slate-400 mr-2">{selected.desc}</span>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </button>
                <div className="px-4 py-2">
                  <p className="text-xs text-slate-400">
                    {repeatOption === "weekly" || repeatOption === "biweekly"
                      ? `เริ่มวัน${["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"][currentDate.getDay()]} — ทุก ${repeatOption === "biweekly" ? "2 สัปดาห์" : "สัปดาห์"}`
                      : repeatOption === "daily"
                      ? "ทุกวัน เริ่มวันนี้"
                      : `วันที่ ${currentDate.getDate()} ของแต่ละรอบ`
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
            {isRepeatMode ? "Save Repeat Rule" : "Save Transaction"}
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
              <div className="grid grid-cols-3 divide-x divide-y divide-slate-100 pb-2">
                {categoriesList.filter((c: any) => c.id !== "nocat").map((cat: any) => {
                  const Icon = resolveIcon(cat, MoreHorizontal);
                  return (
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
                  return (
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
              <h3 className="text-sm font-semibold text-slate-800">ความถี่การทำซ้ำ</h3>
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
                    {opt.label}
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
          {/* hidden Recording for voice calculator */}
          <div className="hidden">
            <Recording
              onTranscript={handleVoiceCalcTranscript}
              startTrigger={voiceCalcStartTrigger}
              stopTrigger={voiceCalcStopTrigger}
              autoRestart={false}
            />
          </div>

          <div className="px-4 pt-3 pb-4 flex flex-col flex-1 min-h-0">
            {/* Section A: Size Controls */}
            <div className="flex gap-2 items-center mb-2 flex-shrink-0">
              {[70, 75, 80, 85].map((size) => (
                <button
                  key={size}
                  onClick={() => setNumpadSize(size)}
                  className={`flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                    numpadSize === size ? "bg-theme-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {size}%
                </button>
              ))}
              <button
                onClick={() => setIsRightMode(!isRightMode)}
                className={`flex-1 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                  isRightMode ? "bg-theme-600 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Right
              </button>
            </div>

            {/* Section B: Display */}
            <div className="bg-gradient-to-br from-theme-600 to-theme-700 px-3 py-2.5 rounded-lg flex justify-between items-center mb-2 flex-shrink-0">
              <div className={`text-2xl font-bold font-mono tracking-tight ${categoryType === "income" ? "text-green-300" : "text-red-300"}`}>
                {sign}฿{display}
              </div>
              <button
                onClick={() => setShowAmountPad(false)}
                className="p-1.5 hover:bg-theme-500 rounded-lg transition-colors text-white flex-shrink-0"
              >
                <X size={22} />
              </button>
            </div>

            {/* Section C+D — fills remaining height */}
            <div className={`flex gap-2 flex-1 min-h-0 ${isRightMode ? "flex-row-reverse" : ""}`}>
              {/* Section C: Numpad */}
              <div className="flex flex-col gap-1.5 min-h-0" style={{ width: `${numpadSize}%` }}>
                <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0" style={{ gridTemplateRows: "repeat(3, 1fr)" }}>
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
                <div className="grid grid-cols-4 gap-1.5 flex-shrink-0" style={{ height: 44 }}>
                  {isRightMode ? (
                    <>
                      <button onClick={handleDelete} className="h-full px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm">⌫</button>
                      <button onClick={handleDecimal} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">.</button>
                      <button onClick={() => handleNumberClick(0)} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">0</button>
                      <button onClick={handleAmountSave} className="h-full px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md">Save</button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleAmountSave} className="h-full px-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-md">Save</button>
                      <button onClick={() => handleNumberClick(0)} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">0</button>
                      <button onClick={handleDecimal} className="h-full px-2 bg-gradient-to-br from-theme-50 to-theme-100 hover:from-theme-100 hover:to-theme-200 text-theme-900 font-bold text-xl rounded-xl transition-all active:scale-95 shadow-sm">.</button>
                      <button onClick={handleDelete} className="h-full px-2 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-600 font-bold rounded-xl transition-all active:scale-95 shadow-sm">⌫</button>
                    </>
                  )}
                </div>
              </div>

              {/* Section D: Voice Calc + Lock */}
              <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                <button
                  onClick={handleVoiceCalcToggle}
                  disabled={isLocked}
                  className={`rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center flex-1 select-none ${
                    isLocked
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : isVoiceCalcActive
                      ? "bg-gradient-to-br from-green-400 to-green-500 text-white border-2 border-green-600"
                      : "bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 font-bold"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <Calculator size={24} />
                      <Mic size={24} />
                    </div>
                    <span className="text-xs">{isVoiceCalcActive ? "Listening…" : "Calc"}</span>
                  </div>
                </button>
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
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
