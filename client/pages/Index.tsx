import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../hooks/useT";
import { Calculator, Lock, LockOpen, Utensils, Bus, Music, ShoppingCart, FileText, Heart, BookOpen, Zap, Wind, Plane, ShoppingBag, Dumbbell, Gift, TrendingUp, MoreHorizontal, CreditCard, Wallet, Smartphone, Banknote, X, Home, Car, Coffee, Briefcase, Star, Clock, Camera, Headphones, Wrench, Scissors, Flame, Leaf, Baby, Package, Truck, Train, Bike, Building2 } from "lucide-react";
import Carousel from "../components/Carousel";
import Recording from "../components/Recording";
import VoiceResultConfirmation from "../components/VoiceResultConfirmation";
import { matchCategory, matchAccount, matchCategoryFromList, matchAccountFromList, extractNumberFromText } from "../utils/keywordMatch";

const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

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
  { id: "food",      name: "Food-sample",         type: "expense", icon: Utensils,     keywords: ["อาหาร"] },
  { id: "transport", name: "Transport-sample",     type: "expense", icon: Bus,          keywords: ["ค่ารถ"] },
  { id: "shopping",  name: "Shopping-sample",      type: "expense", icon: ShoppingCart, keywords: ["ผลาญเงิน"] },
  { id: "house",     name: "House-sample",         type: "expense", icon: Home,         keywords: ["ของใช้ในบ้าน"] },
  { id: "travel",    name: "Travel-sample",        type: "expense", icon: Plane,        keywords: ["เที่ยว"] },
  { id: "salary",    name: "Salary-sample",        type: "income",  icon: TrendingUp,   keywords: ["เงินเดือน"] },
];

const accounts = [
  { id: "kbank", name: "K-Bank-sample",        type: "savings account", icon: Smartphone, balance: 0, keywords: ["กสิกร"] },
  { id: "scb",   name: "SCB-sample",           type: "savings account", icon: CreditCard, balance: 0, keywords: ["ไทยพาณิชย์"] },
  { id: "bbl",   name: "Bangkok Bank-sample",  type: "savings account", icon: Building2,  balance: 0, keywords: ["แบงค์กรุงเทพ"] },
];

function loadCategoriesFromStorage() {
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
        home: Home, house: Home, car: Car, coffee: Coffee, briefcase: Briefcase, star: Star,
        clock: Clock, camera: Camera, headphones: Headphones, wrench: Wrench,
        scissors: Scissors, flame: Flame, leaf: Leaf, baby: Baby, package: Package,
        truck: Truck, train: Train, bike: Bike, building: Building2,
      };
      return storedCategories
        .map((cat: any) => {
          if (!cat || !cat.id) return null;
          const defaultCat = categories.find((d) => d.id === cat.id);
          if (!defaultCat) {
            if (!cat.id.startsWith("custom_")) {
              const fallback = catIconMap[cat.iconId] || catIconMap[cat.id];
              if (!fallback) return null;
              return { ...cat, icon: fallback, type: cat.type || "expense" };
            }
            const icon = catIconMap[cat.iconId] || MoreHorizontal;
            return { ...cat, icon, type: cat.type || "expense" };
          }
          // For known defaults, use defaultCat.type as fallback if localStorage lacks the field
          return { ...cat, icon: defaultCat.icon, type: cat.type || defaultCat.type };
        })
        .filter((cat: any) => cat !== null);
    }
    return categories;
  } catch (e) {
    console.error("Error loading categories from localStorage:", e);
    return categories;
  }
}

function loadAccountsFromStorage() {
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
      const legacyAccIconMap: Record<string, React.ComponentType<any>> = {
        uob: CreditCard, banka: CreditCard, krungsri: Wallet, bangkok: CreditCard,
        kasikorn: CreditCard, tmb: Wallet, acme: CreditCard, cash: Banknote,
        crypto: TrendingUp, baht_pay: Smartphone, other_acc: MoreHorizontal,
        revolut: CreditCard, wise: Wallet, stripe: CreditCard, paypal: Banknote,
      };
      return storedAccounts
        .map((acc: any) => {
          if (!acc || !acc.id) return null;
          const defaultAcc = accounts.find((d) => d.id === acc.id);
          if (!defaultAcc) {
            if (legacyAccIconMap[acc.id]) return { ...acc, icon: legacyAccIconMap[acc.id] };
            if (!acc.id.startsWith("custom_acc_")) return null;
            const icon = iconMap[acc.iconId] || MoreHorizontal;
            return { ...acc, icon };
          }
          return { ...acc, icon: defaultAcc.icon };
        })
        .filter((acc: any) => acc !== null);
    }
    return accounts;
  } catch (e) {
    console.error("Error loading accounts from localStorage:", e);
    return accounts;
  }
}

function readVoiceAutoStart(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
    return s.voiceAutoStart !== false; // default true
  } catch { return true; }
}

// ── Marquee text for voice status widget ─────────────────────────────────────
function VoiceMarqueeText({ text, className }: { text: string; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const outer = outerRef.current;
    const measure = measureRef.current;
    if (outer && measure) setAnimate(measure.scrollWidth > outer.clientWidth);
  }, [text]);

  const sep = "\u00A0\u00A0"; // 2 non-breaking spaces between loops
  const dur = `${Math.max(3, Math.round(text.length * 0.22))}s`;

  return (
    <div ref={outerRef} className={`overflow-hidden relative ${className ?? ""}`}>
      {/* Hidden span to measure actual text width */}
      <span ref={measureRef} className="absolute invisible whitespace-nowrap" aria-hidden="true"
        style={{ wordBreak: "normal", overflowWrap: "normal" }}>{text}</span>
      {/* Visible: animated loop or static */}
      <span className="whitespace-nowrap inline-block"
        style={{ wordBreak: "normal", overflowWrap: "normal",
          ...(animate ? { animation: `voice-marquee ${dur} linear infinite` } : {}) }}>
        {animate ? `${text}${sep}${text}${sep}` : text}
      </span>
    </div>
  );
}

// ── Voice operator + operand detection ───────────────────────────────────────
function extractOperatorAndOperand(text: string): { op: '+' | '-' | '*' | '/'; operand: number } | undefined {
  const operators: Array<{ words: string[]; op: '+' | '-' | '*' | '/' }> = [
    { words: ['บวก', 'plus'],    op: '+' },
    { words: ['ลบ', 'minus'],    op: '-' },
    { words: ['คูณ', 'times'],   op: '*' },
    { words: ['หาร', 'divide'],  op: '/' },
  ];
  const lc = text.toLowerCase();
  for (const { words, op } of operators) {
    for (const word of words) {
      const idx = lc.indexOf(word);
      if (idx !== -1) {
        const afterOp = text.slice(idx + word.length).trim();
        const operand = extractNumberFromText(afterOp);
        if (operand !== undefined && operand > 0) return { op, operand };
      }
    }
  }
  return undefined;
}

export default function Index() {
  const navigate = useNavigate();
  const T = useT();
  const [voiceAutoStart] = useState<boolean>(readVoiceAutoStart);
  const [currentPage, setCurrentPage] = useState<InputPage>("category");

  // Seed defaults to localStorage on first launch so other pages (e.g. AddTransactionModal
  // opened from RepeatTransactions) can read categories/accounts without visiting home first.
  // Skip if user has cloud token — their data comes from sync, not defaults.
  useEffect(() => {
    if (localStorage.getItem("cloud_token")) return;
    if (!localStorage.getItem("app_categories")) {
      localStorage.setItem("app_categories", JSON.stringify(
        categories.map(({ icon: _icon, ...rest }) => ({ ...rest, source: "local" }))
      ));
    }
    if (!localStorage.getItem("app_accounts")) {
      localStorage.setItem("app_accounts", JSON.stringify(
        accounts.map(({ icon: _icon, ...rest }) => ({ ...rest, source: "local" }))
      ));
    }
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState(loadCategoriesFromStorage);
  const [accountsList, setAccountsList] = useState(loadAccountsFromStorage);
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
    transcript?: string;
  }>({});
  const allDetectedRef = useRef(false);
  const displayScrollRef = useRef<HTMLDivElement>(null);

  const voiceTimeoutRef = useRef<NodeJS.Timeout>();
  const voiceAccumulatorRef = useRef<{
    categoryId?: string;
    accountId?: string;
    amount?: number;
    baseAmount?: number; // last "committed" amount — used as base for math ops
    transcript?: string;
  }>({});

  // Refs for auto-save when app goes background / screen off / killed
  const showVoiceResultRef = useRef(false);
  const pendingVoiceResultRef = useRef<{ categoryId?: string; accountId?: string; amount?: number; transcript?: string }>({});

  useEffect(() => { showVoiceResultRef.current = showVoiceResult; }, [showVoiceResult]);
  useEffect(() => { pendingVoiceResultRef.current = voiceResultData; }, [voiceResultData]);

  useEffect(() => {
    if (displayScrollRef.current) {
      displayScrollRef.current.scrollLeft = displayScrollRef.current.scrollWidth;
    }
  }, [display]);

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

  // Restart voice when app comes back to foreground while on home page
  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === "visible" && currentPage === "category" && voiceAutoStart) {
        setVoiceStartTrigger((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onResume);
    return () => document.removeEventListener("visibilitychange", onResume);
  }, [currentPage, voiceAutoStart]);

  // Refresh categories/accounts from localStorage when sync completes (no page reload needed)
  useEffect(() => {
    const handler = () => {
      setCategoriesList(loadCategoriesFromStorage());
      setAccountsList(loadAccountsFromStorage());
    };
    window.addEventListener("sync-data-refresh", handler);
    window.addEventListener("app-data-updated", handler);
    return () => {
      window.removeEventListener("sync-data-refresh", handler);
      window.removeEventListener("app-data-updated", handler);
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
    // Persist reordered categories to localStorage; keep nocat pinned at bottom
    const nocat = categoriesList.find((c) => c.id === "nocat");
    const rest = categoriesList.filter((c) => c.id !== "nocat");
    const toSave = nocat ? [...rest, nocat] : rest;
    localStorage.setItem("app_categories", JSON.stringify(toSave));
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
    // iOS: re-match against visible lists — screen is always source of truth
    if (isIOSDevice) {
      voiceData = {
        ...voiceData,
        categoryId: matchCategoryFromList(voiceData.description, categoriesList),
        accountId: matchAccountFromList(voiceData.description, accountsList),
      };
    }
    // Accumulate voice data
    if (voiceData.categoryId) voiceAccumulatorRef.current.categoryId = voiceData.categoryId;
    if (voiceData.accountId) voiceAccumulatorRef.current.accountId = voiceData.accountId;

    // Amount: during 500ms delay (allDetected) — freeze; otherwise apply math ops if any
    let effectiveAmount = voiceData.amount;
    if (voiceData.amount && !allDetectedRef.current) {
      const mathExpr = extractOperatorAndOperand(voiceData.description);
      const base = voiceAccumulatorRef.current.baseAmount ?? voiceAccumulatorRef.current.amount;
      if (mathExpr && base !== undefined) {
        let result: number;
        if (mathExpr.op === '+') result = base + mathExpr.operand;
        else if (mathExpr.op === '-') result = Math.max(0, base - mathExpr.operand);
        else if (mathExpr.op === '*') result = base * mathExpr.operand;
        else result = mathExpr.operand !== 0 ? base / mathExpr.operand : base;
        effectiveAmount = Math.round(result);
      } else {
        effectiveAmount = voiceData.amount;
      }
      voiceAccumulatorRef.current.amount = effectiveAmount;
      voiceAccumulatorRef.current.baseAmount = effectiveAmount;
    }

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
      if (effectiveAmount) next.amount = effectiveAmount;
      next.transcript = voiceData.description;
      return next;
    });

    // If all 3 detected — stop mic and trigger summary immediately
    const acc = voiceAccumulatorRef.current;
    if (acc.categoryId && acc.accountId && acc.amount && !allDetectedRef.current) {
      allDetectedRef.current = true;
      setVoiceStopTrigger((n) => n + 1);
      // Wait for React to flush state → browser to paint chips → then show popup.
      // Double rAF ensures at least one full frame is painted before popup appears.
      // iOS WKWebView batches paints aggressively so setTimeout alone is not enough.
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            handleVoiceEnd();
          });
        });
      }, 500);
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
    // Persist reordered accounts to localStorage; keep account_deleted pinned at bottom
    const deleted = accountsList.find((a) => a.id === "account_deleted");
    const rest = accountsList.filter((a) => a.id !== "account_deleted");
    const toSave = deleted ? [...rest, deleted] : rest;
    localStorage.setItem("app_accounts", JSON.stringify(toSave));
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

  const handleClear = () => {
    setDisplay("0");
    setValue(0);
    setIsCalcMode(false);
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

  // ── Monthly period helpers ────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    try {
      const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
      const resetDay: number = typeof s.monthResetDay === "number" ? s.monthResetDay : 1;
      const today = new Date();
      const d = today.getDate();
      const periodStart = d >= resetDay
        ? new Date(today.getFullYear(), today.getMonth(), resetDay)
        : new Date(today.getFullYear(), today.getMonth() - 1, resetDay);

      const dateLocale = s.language === "en" ? "en-GB" : "th-TH";
      const startStr = periodStart.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
      const endStr = today.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
      const periodLabel = `${startStr} – ${endStr}`;

      const raw: any[] = JSON.parse(localStorage.getItem("app_transactions") || "[]");
      const expTotals: Record<string, number> = {};
      const incTotals: Record<string, number> = {};

      for (const t of raw) {
        if (t.isTransfer || t.categoryId === "transfer_out" || t.categoryId === "transfer_in") continue;
        if (new Date(t.date) < periodStart) continue;
        const cat = categoriesList.find((c: any) => c.id === t.categoryId);
        if (!cat) continue;
        const totals = cat.type === "income" ? incTotals : expTotals;
        totals[t.categoryId] = (totals[t.categoryId] || 0) + (Number(t.amount) || 0);
      }

      const rank = (totals: Record<string, number>) =>
        Object.entries(totals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, amount]) => ({ id, amount, cat: categoriesList.find((c: any) => c.id === id) }));

      return { periodLabel, topExpenses: rank(expTotals), topIncomes: rank(incTotals) };
    } catch { return { periodLabel: "", topExpenses: [], topIncomes: [] }; }
  }, [categoriesList]);

  return (
    <div className="h-[100dvh] flex flex-col pb-safe-content bg-white overflow-hidden">
      <div className="w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Monthly Ranking Header */}
        <div className="pt-safe-header bg-theme-600 px-4 pb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-sm font-semibold opacity-80">{monthlyData.periodLabel}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {/* Expense ranking */}
            <div className="bg-white/15 rounded-xl px-2 py-1">
              <p className="text-white font-bold text-sm mb-1">{T("index.top_expenses")}</p>
              <div className="grid grid-cols-5 gap-0.5">
                {Array.from({ length: 5 }, (_, i) => {
                  const item = monthlyData.topExpenses[i];
                  if (item) {
                    const Icon = item.cat?.icon || MoreHorizontal;
                    return (
                      <div key={item.id} className="flex flex-col items-center gap-0.5">
                        <div className="w-4/5 mx-auto aspect-square bg-white/20 rounded-lg flex items-center justify-center">
                          <Icon className="text-white w-1/2 h-1/2" />
                        </div>
                        <span className="text-[9px] text-white/90 w-full text-center leading-tight truncate">{item.cat?.name || item.id}</span>
                        <span className="text-[12px] font-bold text-white">
                          {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={`exp-empty-${i}`} className="flex flex-col items-center gap-0.5 opacity-60">
                      <div className="w-4/5 mx-auto aspect-square border-2 border-dashed border-white/70 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{i + 1}</span>
                      </div>
                      <span className="text-[9px] text-white/0 w-full text-center leading-tight">-</span>
                      <span className="text-[12px] font-bold text-white/0">-</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Income ranking */}
            <div className="bg-white/15 rounded-xl px-2 py-1">
              <p className="text-white font-bold text-sm mb-1">{T("index.top_incomes")}</p>
              <div className="grid grid-cols-5 gap-0.5">
                {Array.from({ length: 5 }, (_, i) => {
                  const item = monthlyData.topIncomes[i];
                  if (item) {
                    const Icon = item.cat?.icon || MoreHorizontal;
                    return (
                      <div key={item.id} className="flex flex-col items-center gap-0.5">
                        <div className="w-4/5 mx-auto aspect-square bg-white/20 rounded-lg flex items-center justify-center">
                          <Icon className="text-white w-1/2 h-1/2" />
                        </div>
                        <span className="text-[9px] text-white/90 w-full text-center leading-tight truncate">{item.cat?.name || item.id}</span>
                        <span className="text-[12px] font-bold text-white">
                          {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount.toLocaleString()}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={`inc-empty-${i}`} className="flex flex-col items-center gap-0.5 opacity-60">
                      <div className="w-4/5 mx-auto aspect-square border-2 border-dashed border-white/70 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{i + 1}</span>
                      </div>
                      <span className="text-[9px] text-white/0 w-full text-center leading-tight">-</span>
                      <span className="text-[12px] font-bold text-white/0">-</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
                      const { categoryName, accountName, amount, transcript } = liveVoiceStatus;
                      return (
                        <div key="__voice_status__" className={`w-full h-full rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-center py-1 gap-0.5 overflow-hidden ${isIOSDevice ? "px-1" : "px-2"}`}>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`${isIOSDevice ? "text-[10px]" : "text-xs"} font-bold flex-shrink-0 ${categoryName ? "text-green-500" : "text-slate-300"}`}>{categoryName ? "✓" : "○"}</span>
                            <VoiceMarqueeText text={categoryName || "Category"} className={`${isIOSDevice ? "text-[10px]" : "text-xs"} text-slate-600 flex-1 min-w-0`} />
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`${isIOSDevice ? "text-[10px]" : "text-xs"} font-bold flex-shrink-0 ${accountName ? "text-green-500" : "text-slate-300"}`}>{accountName ? "✓" : "○"}</span>
                            <VoiceMarqueeText text={accountName || "Account"} className={`${isIOSDevice ? "text-[10px]" : "text-xs"} text-slate-600 flex-1 min-w-0`} />
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`${isIOSDevice ? "text-[10px]" : "text-xs"} font-bold flex-shrink-0 ${amount ? "text-green-500" : "text-slate-300"}`}>{amount ? "✓" : "○"}</span>
                            <VoiceMarqueeText text={amount ? `฿${amount.toLocaleString()}` : "Amount"} className={`${isIOSDevice ? "text-[10px]" : "text-xs"} text-slate-600 flex-1 min-w-0`} />
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
                              ? "bg-theme-500 text-white shadow-lg scale-105 border-2 border-theme-700 z-10 relative"
                              : selectedCategoryForSwap !== null
                                ? "bg-slate-100 hover:bg-theme-100 text-slate-800 border-2 border-theme-400"
                                : "bg-theme-100 hover:bg-theme-200 text-theme-900 border-2 border-theme-300"
                            : "bg-theme-50 hover:bg-theme-200 text-theme-900"
                        }`}
                      >
                        <IconComponent size={24} />
                        <span className="font-medium text-xs text-center truncate leading-tight w-full block">{category.name}</span>
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
                  <h2 className="text-lg font-semibold text-slate-900">Select Account</h2>
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
                              ? "bg-theme-500 text-white shadow-lg scale-105 border-2 border-theme-700 z-10 relative"
                              : selectedAccountForSwap !== null
                                ? "bg-slate-100 hover:bg-theme-100 text-slate-800 border-2 border-theme-400"
                                : "bg-theme-100 hover:bg-theme-200 text-theme-900 border-2 border-theme-300"
                            : "bg-theme-50 hover:bg-theme-200 text-theme-900"
                        }`}
                      >
                        <IconComponent size={24} />
                        <span className="font-medium text-xs text-center truncate leading-tight w-full">{account.name}</span>
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
                  <div className="bg-gradient-to-br from-theme-600 to-theme-700 px-3 py-3 rounded-lg flex items-center gap-2 flex-shrink-0">
                    <div
                      ref={displayScrollRef}
                      className="flex-1 overflow-x-auto"
                      style={{ scrollbarWidth: "none" }}
                    >
                      <div className="text-2xl font-bold font-mono tracking-tight whitespace-nowrap text-white">
                        {categoryType === "income" ? "+" : "-"}฿{display}
                      </div>
                    </div>
                    <button
                      onClick={handleClear}
                      className="w-10 h-10 flex-shrink-0 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-bold text-lg flex items-center justify-center"
                    >
                      C
                    </button>
                    <button
                      onClick={() => setCurrentPage("account")}
                      className="p-2 hover:bg-theme-500 rounded-lg transition-colors text-white flex-shrink-0"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Section C-D: Numpad and Controls */}
                  <div className={`flex gap-2 flex-1 min-h-0 ${isRightMode ? "flex-row-reverse" : ""}`}>
                    {/* Section C: Numpad 4x3 */}
                    <div className="flex-1 min-h-0" style={{ width: `${numpadSize}%`, flex: "none" }}>
                      <div className="grid grid-cols-3 gap-2 h-full" style={{ gridTemplateRows: "repeat(4, 1fr)" }}>
                        {(isRightMode
                          ? [7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0, 'save'] as const
                          : [7, 8, 9, 4, 5, 6, 1, 2, 3, 'save', 0, '.'] as const
                        ).map((btn) => {
                          if (btn === 'save') return (
                            <button key="save" onClick={handleConfirm} className="h-full aspect-square justify-self-center bg-gradient-to-br from-theme-500 to-theme-600 hover:from-theme-600 hover:to-theme-700 text-white font-bold rounded-full transition-all active:scale-95 flex items-center justify-center">Save</button>
                          );
                          if (btn === '.') return (
                            <button key="dot" onClick={handleDecimal} className="h-full aspect-square justify-self-center bg-white border-2 border-theme-700 text-slate-900 font-bold text-xl rounded-full transition-all active:scale-95 flex items-center justify-center">.</button>
                          );
                          return (
                            <button key={btn} onClick={() => handleNumberClick(btn as number)} className="h-full aspect-square justify-self-center bg-white border-2 border-theme-700 text-slate-900 font-bold text-xl rounded-full transition-all active:scale-95 flex items-center justify-center">{btn}</button>
                          );
                        })}
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
