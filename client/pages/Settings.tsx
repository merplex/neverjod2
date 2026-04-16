import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Mic, Cloud, Globe, Palette, Check, BookOpen, Hand, LogOut, RefreshCw, Repeat, Lock, FileText, Shield, ChevronDown, BookText, Plus, Pencil, X, Trash2, Star, Loader2 } from "lucide-react";
import { CURRENCY_OPTIONS } from "../utils/currency";
import { useNavigate, useLocation } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { Capacitor } from "@capacitor/core";
import { syncAll, apiListLedgers, apiCreateLedger, apiRenameLedger, apiDeleteLedger, apiDeleteAccount, apiVerifyPurchase } from "../utils/syncService";
import { lk, getActiveLedgerId, setActiveLedgerId } from "../utils/ledgerStorage";
import PremiumModal from "../components/PremiumModal";
import CloudAuthModal from "../components/CloudAuthModal";
import { purchaseProduct, restorePurchases } from "../utils/iap";
import { useT } from "../hooks/useT";
import { getLang, LANG_LOCALE } from "../utils/i18n";

const SETTINGS_KEY = () => lk("app_settings");

type ColorTheme = "teal" | "blue" | "purple" | "rose" | "amber" | "sky";

interface AppSettings {
  voiceInputDelay: number;
  voiceAutoStart: boolean;
  voiceLang: string;
  currencySymbol: string;
  cloudBackupEnabled: boolean;
  language: "en" | "th" | "zh";
  colorTheme: ColorTheme;
  swipeBackDirection: "right" | "left";
  monthResetDay: number;
}

const defaultSettings: AppSettings = {
  voiceInputDelay: 3,
  voiceAutoStart: true,
  voiceLang: "th-TH",
  currencySymbol: "฿",
  cloudBackupEnabled: false,
  language: "th",
  colorTheme: "teal",
  swipeBackDirection: "right",
  monthResetDay: 1,
};

const colorThemes: { id: ColorTheme; name: string; swatches: string[] }[] = [
  { id: "teal",   name: "Teal",   swatches: ["#ccfbf1", "#2dd4bf", "#0d9488", "#0f766e"] },
  { id: "blue",   name: "Blue",   swatches: ["#e0e7ff", "#818cf8", "#4f46e5", "#4338ca"] },
  { id: "purple", name: "Purple", swatches: ["#ede9fe", "#a78bfa", "#7c3aed", "#6d28d9"] },
  { id: "rose",   name: "Rose",   swatches: ["#ffe4e6", "#fb7185", "#e11d48", "#be123c"] },
  { id: "amber",  name: "Amber",  swatches: ["#fef3c7", "#fbbf24", "#d97706", "#b45309"] },
  { id: "sky",    name: "Sky",    swatches: ["#e0f2fe", "#38bdf8", "#0284c7", "#0369a1"] },
];

const VOICE_LANG_OPTIONS = [
  { value: "th-TH", label: "🇹🇭 ภาษาไทย", desc: "th-TH" },
  { value: "en-US", label: "🇺🇸 English", desc: "en-US" },
  { value: "zh-CN", label: "🇨🇳 中文", desc: "zh-CN" },
  { value: "ja-JP", label: "🇯🇵 日本語", desc: "ja-JP" },
  { value: "ko-KR", label: "🇰🇷 한국어", desc: "ko-KR" },
  { value: "fr-FR", label: "🇫🇷 Français", desc: "fr-FR" },
  { value: "de-DE", label: "🇩🇪 Deutsch", desc: "de-DE" },
  { value: "es-ES", label: "🇪🇸 Español", desc: "es-ES" },
  { value: "pt-BR", label: "🇧🇷 Português", desc: "pt-BR" },
  { value: "vi-VN", label: "🇻🇳 Tiếng Việt", desc: "vi-VN" },
  { value: "ms-MY", label: "🇲🇾 Bahasa Melayu", desc: "ms-MY" },
  { value: "auto", label: "Auto", desc: "" },
];

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY());
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old data that stored voiceInputDelay in milliseconds
      if (typeof parsed.voiceInputDelay === "number" && parsed.voiceInputDelay > 10) {
        // Round to nearest 0.5s step, clamp 1–5
        parsed.voiceInputDelay = Math.min(5, Math.max(1, Math.round((parsed.voiceInputDelay / 1000) * 2) / 2));
      } else if (typeof parsed.voiceInputDelay === "number" && parsed.voiceInputDelay > 5) {
        parsed.voiceInputDelay = 5;
      }
      return { ...defaultSettings, ...parsed };
    }
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY(), JSON.stringify(settings));
}

export default function Settings() {
  const navigate = useNavigate();
  useSwipeBack();
  const T = useT();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [initialLang] = useState(() => loadSettings().language);
  const [showVoiceLangPicker, setShowVoiceLangPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const location = useLocation();
  const premiumRef = useRef<HTMLDivElement>(null);
  const isIOS = Capacitor.getPlatform() === "ios";
  const isPremium = localStorage.getItem("app_premium") === "true";
  const planType = localStorage.getItem("app_plan_type") as "monthly" | "yearly" | null;
  const premiumExpiresAt = localStorage.getItem("app_premium_expires_at");
  const [purchaseLoading, setPurchaseLoading] = useState<"monthly" | "yearly" | "restore" | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"monthly" | "yearly" | null>(null);

  // Ledger management state
  type LedgerItem = { id: string; name: string };
  const [ledgers, setLedgers] = useState<LedgerItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("app_ledgers") || "null") || [{ id: "main", name: T("ledger.main_name") }]; }
    catch { return [{ id: "main", name: T("ledger.main_name") }]; }
  });
  const [activeLedger, setActiveLedger] = useState<string>(getActiveLedgerId);
  const [showLedgerCreate, setShowLedgerCreate] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState("");
  const [renamingLedger, setRenamingLedger] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [confirmDeleteLedger, setConfirmDeleteLedger] = useState<string | null>(null);

  // Cloud Backup state
  const [cloudToken, setCloudToken] = useState<string>(() => localStorage.getItem("cloud_token") || "");
  const [cloudEmail, setCloudEmail] = useState<string>(() => localStorage.getItem("cloud_email") || "");
  const [syncAuto, setSyncAuto] = useState<boolean>(() => localStorage.getItem("sync_auto_enabled") === "true");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "ok" | "error">("idle");
  const [syncDirection, setSyncDirection] = useState<"server" | "client" | null>(() => {
    const d = localStorage.getItem("sync_direction");
    return d === "server" || d === "client" ? d : null;
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    const direction = localStorage.getItem("sync_direction");
    const t = direction === "client"
      ? localStorage.getItem("last_client_sync_at")
      : localStorage.getItem(lk("last_push_at"));
    if (!t) return "";
    try { return new Date(t).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  });
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.setAttribute("data-theme", settings.colorTheme);
    if (settings.language !== initialLang) {
      window.location.reload();
    }
  }, [settings]);

  // Re-read sync direction when auto-sync completes in the background
  useEffect(() => {
    const onSyncUpdated = () => {
      const d = localStorage.getItem("sync_direction");
      setSyncDirection(d === "server" || d === "client" ? d : null);
      const t = localStorage.getItem("last_client_sync_at") || localStorage.getItem(lk("last_push_at"));
      if (t) setLastSyncTime(formatTime(t));
    };
    window.addEventListener("sync-updated", onSyncUpdated);
    return () => window.removeEventListener("sync-updated", onSyncUpdated);
  }, []);

  // Sync ledger list from server when logged in
  useEffect(() => {
    if (!cloudToken) return;
    apiListLedgers(cloudToken).then((list) => {
      const serverItems = list.map((l) => ({ id: l.id, name: l.name }));
      // Always keep "main" ledger — it's local-only and never stored on server
      const hasMain = serverItems.some((l) => l.id === "main");
      const merged = hasMain
        ? serverItems
        : [{ id: "main", name: T("ledger.main_name") }, ...serverItems];
      saveLedgerList(merged);
    }).catch(() => {});
  }, [cloudToken]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleAuthSuccess = async (isPremium: boolean) => {
    const token = localStorage.getItem("cloud_token") || "";
    const email = localStorage.getItem("cloud_email") || "";
    setCloudToken(token);
    setCloudEmail(email);
    setShowAuthForm(false);

    // ถ้ามาจากกดสมัคร → ซื้อต่อเลย
    if (pendingPlan) {
      const plan = pendingPlan;
      setPendingPlan(null);
      executePurchase(plan);
      return;
    }

    if (!isPremium) {
      scrollToPremium();
      return;
    }
    setSyncStatus("syncing");
    try {
      await syncAll(token, false);
      localStorage.setItem("sync_direction", "server");
      setSyncDirection("server");
      setSyncStatus("ok");
      refreshLastSyncTime(false);
    } catch {
      setSyncStatus("error");
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const refreshLastSyncTime = (useLocalTime = false) => {
    const t = useLocalTime
      ? localStorage.getItem("last_client_sync_at")
      : (localStorage.getItem(lk("last_push_at")) || localStorage.getItem(lk("last_sync_at")));
    if (!t) return;
    setLastSyncTime(formatTime(t));
  };

  const handleSync = async () => {
    if (!cloudToken) return;
    if (!isPremium) { scrollToPremium(); return; }
    setSyncStatus("syncing");
    try {
      await syncAll(cloudToken, true);
      const now = new Date().toISOString();
      localStorage.setItem("last_client_sync_at", now);
      localStorage.setItem("sync_direction", "client");
      setSyncDirection("client");
      setSyncStatus("ok");
      refreshLastSyncTime(true);
    } catch {
      setSyncStatus("error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cloud_token");
    localStorage.removeItem("cloud_email");
    localStorage.removeItem(lk("last_sync_at"));
    localStorage.removeItem("sync_direction");
    localStorage.removeItem("last_client_sync_at");
    localStorage.removeItem("app_plan_type");
    localStorage.removeItem("app_premium_expires_at");
    setCloudToken("");
    setCloudEmail("");
    setSyncStatus("idle");
    setSyncDirection(null);
    setLastSyncTime("");
  };

  const scrollToPremium = () => {
    setTimeout(() => premiumRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  useEffect(() => {
    if ((location.state as any)?.scrollToPremium) {
      scrollToPremium();
    }
  }, []);

  const executePurchase = async (plan: "monthly" | "yearly") => {
    setPurchaseError(null);
    setPurchaseLoading(plan);
    try {
      const { receipt } = await purchaseProduct(plan);
      await apiVerifyPurchase(receipt);
      localStorage.setItem("app_premium", "true");
      window.location.reload();
    } catch (e: any) {
      if (e.message !== "cancelled") setPurchaseError(e.message || T("premium.error"));
    } finally {
      setPurchaseLoading(null);
    }
  };

  const handlePurchase = (plan: "monthly" | "yearly") => {
    if (!cloudToken) {
      setPendingPlan(plan);
      setShowAuthForm(true);
      return;
    }
    executePurchase(plan);
  };

  const handleRestorePurchase = async () => {
    setPurchaseError(null);
    setPurchaseLoading("restore");
    try {
      const { receipt } = await restorePurchases();
      if (!receipt) { setPurchaseError("ไม่พบการซื้อเดิม"); return; }
      await apiVerifyPurchase(receipt);
      localStorage.setItem("app_premium", "true");
      window.location.reload();
    } catch (e: any) {
      setPurchaseError(e.message || T("premium.error"));
    } finally {
      setPurchaseLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!cloudToken) return;
    setDeleteLoading(true);
    try {
      await apiDeleteAccount(cloudToken);
      handleLogout();
      setShowDeleteConfirm(false);
    } catch {
      // silent — user can retry
    } finally {
      setDeleteLoading(false);
    }
  };

  const saveLedgerList = (list: LedgerItem[]) => {
    localStorage.setItem("app_ledgers", JSON.stringify(list));
    setLedgers(list);
  };

  const handleSwitchLedger = (id: string) => {
    if (id === activeLedger) return;
    setActiveLedgerId(id);
    window.location.reload();
  };

  const handleCreateLedger = async () => {
    const name = newLedgerName.trim();
    if (!name || !cloudToken) return;
    setLedgerLoading(true);
    try {
      const created = await apiCreateLedger(cloudToken, name);
      // Copy current settings (theme/language/voice/resetDay) to new ledger
      const currentSettings = localStorage.getItem(lk("app_settings"));
      if (currentSettings) {
        localStorage.setItem(lk("app_settings", created.id), currentSettings);
      }
      const updated = [...ledgers, { id: created.id, name: created.name }];
      saveLedgerList(updated);
      setNewLedgerName("");
      setShowLedgerCreate(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleRenameLedger = async (id: string) => {
    const name = renameValue.trim();
    if (!name || !cloudToken) return;
    setLedgerLoading(true);
    try {
      await apiRenameLedger(cloudToken, id, name);
      const updated = ledgers.map((l) => l.id === id ? { ...l, name } : l);
      saveLedgerList(updated);
      setRenamingLedger(null);
      setRenameValue("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleDeleteLedger = async (id: string) => {
    if (!cloudToken) return;
    setLedgerLoading(true);
    try {
      await apiDeleteLedger(cloudToken, id);
      // If deleted ledger was active, switch to main first
      if (activeLedger === id) {
        setActiveLedgerId("main");
        setActiveLedger("main");
      }
      saveLedgerList(ledgers.filter((l) => l.id !== id));
      setConfirmDeleteLedger(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pb-4 pt-safe-header flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{T("nav.settings")}</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Ledger Books */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookText size={18} className="text-theme-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-800">{T("ledger.title")}</h2>
              <p className="text-xs text-slate-500">{T("ledger.subtitle")}</p>
            </div>
          </div>

          <div className="space-y-2">
            {ledgers.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                {renamingLedger === l.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenameLedger(l.id); if (e.key === "Escape") { setRenamingLedger(null); } }}
                    />
                    <button onClick={() => handleRenameLedger(l.id)} disabled={ledgerLoading} className="px-3 py-1.5 bg-theme-600 text-white text-xs rounded-lg disabled:opacity-50">{T("btn.save")}</button>
                    <button onClick={() => setRenamingLedger(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg">{T("btn.cancel")}</button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleSwitchLedger(l.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeLedger === l.id ? "bg-theme-100 text-theme-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                    >
                      {activeLedger === l.id && <Check size={14} className="text-theme-600 flex-shrink-0" />}
                      <span className="truncate">{l.name}</span>
                    </button>
                    {cloudToken && l.id !== "main" && (
                      <>
                        <button onClick={() => { setRenamingLedger(l.id); setRenameValue(l.name); }} className="p-2 text-slate-400 hover:text-slate-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDeleteLedger(l.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Create new ledger */}
          {cloudToken ? (
            isPremium ? (
              showLedgerCreate ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={newLedgerName}
                    onChange={(e) => setNewLedgerName(e.target.value)}
                    placeholder={T("ledger.name_placeholder")}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateLedger(); if (e.key === "Escape") setShowLedgerCreate(false); }}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreateLedger} disabled={ledgerLoading || !newLedgerName.trim()} className="flex-1 py-2 bg-theme-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 whitespace-nowrap">{T("btn.save")}</button>
                    <button onClick={() => setShowLedgerCreate(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg whitespace-nowrap">{T("btn.cancel")}</button>
                  </div>
                </div>
              ) : ledgers.length < 2 ? (
                <button onClick={() => setShowLedgerCreate(true)} className="mt-3 w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-theme-300 hover:text-theme-600 transition-colors">
                  <Plus size={16} />
                  {T("ledger.add")}
                </button>
              ) : null
            ) : (
              <button onClick={scrollToPremium} className="mt-3 w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:bg-slate-50 transition-colors">
                <Lock size={14} />
                {T("ledger.add")}
              </button>
            )
          ) : null}
        </div>

        {/* Repeat Transactions — first item */}
        <button
          onClick={() => navigate("/repeat-transactions")}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Repeat size={18} className="text-theme-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-800">{T("settings.repeat_title")}</h2>
            <p className="text-xs text-slate-500">{T("settings.repeat_hint")}</p>
          </div>
          <ChevronLeft size={16} className="text-slate-300 rotate-180 flex-shrink-0" />
        </button>

        {/* Color Theme */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center">
              <Palette size={18} className="text-theme-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{T("settings.color_theme_title")}</h2>
              <p className="text-xs text-slate-500">{T("settings.app_theme")}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {colorThemes.map((theme) => {
              const isSelected = settings.colorTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => update("colorTheme", theme.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected ? "border-slate-700 shadow-md" : "border-transparent hover:border-slate-300"
                  }`}
                >
                  {/* Swatch strip */}
                  <div className="flex h-10">
                    {theme.swatches.map((color) => (
                      <div key={color} className="flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  {/* Label */}
                  <div className="py-1.5 px-2 bg-white flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">{theme.name}</span>
                    {isSelected && <Check size={12} className="text-slate-700" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center">
              <Mic size={18} className="text-theme-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{T("settings.voice_title")}</h2>
              <p className="text-xs text-slate-500">{T("settings.autosave_hint")}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-700 font-medium">{T("settings.auto_start")}</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  {settings.voiceAutoStart ? T("settings.auto_start_on") : T("settings.auto_start_off")}
                </p>
              </div>
              <button
                onClick={() => update("voiceAutoStart", !settings.voiceAutoStart)}
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
                  settings.voiceAutoStart ? "bg-theme-500" : "bg-slate-300"
                }`}
              >
                <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${settings.voiceAutoStart ? "ml-auto" : ""}`} />
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{T("settings.autosave_delay")}</span>
                <span className="text-sm font-semibold text-theme-600">
                  {settings.voiceInputDelay} {T("seconds")}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={settings.voiceInputDelay}
                onChange={(e) => update("voiceInputDelay", Number(e.target.value))}
                onTouchEnd={(e) => update("voiceInputDelay", Number((e.target as HTMLInputElement).value))}
                className="w-full accent-theme-600"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>1 {T("sec")}</span>
                <span>3 {T("sec")}</span>
                <span>5 {T("sec")}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-600 block mb-2">{T("settings.voice_language")}</span>
              <button
                onClick={() => setShowVoiceLangPicker((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <span className="font-semibold text-slate-800">
                  {VOICE_LANG_OPTIONS.find((o) => o.value === settings.voiceLang)?.label ?? settings.voiceLang}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {VOICE_LANG_OPTIONS.find((o) => o.value === settings.voiceLang)?.desc}
                  </span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${showVoiceLangPicker ? "rotate-180" : ""}`} />
                </div>
              </button>
              {showVoiceLangPicker && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden">
                  {VOICE_LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { update("voiceLang", opt.value); setShowVoiceLangPicker(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${opt.value === settings.voiceLang ? "bg-theme-50" : ""}`}
                    >
                      <span className={`text-sm font-semibold flex-1 text-left ${opt.value === settings.voiceLang ? "text-theme-700" : "text-slate-800"}`}>{opt.label}</span>
                      <span className="text-xs text-slate-400 mr-3">{opt.desc}</span>
                      {opt.value === settings.voiceLang && <span className="text-theme-600 text-sm">✓</span>}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1.5">
                {T("settings.voice_lang_auto_hint")}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-600 block mb-2">{T("settings.currency")}</span>
              <button
                onClick={() => setShowCurrencyPicker((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <span className="font-semibold text-slate-800">
                  {CURRENCY_OPTIONS.find((o) => o.symbol === settings.currencySymbol)?.label ?? settings.currencySymbol}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showCurrencyPicker ? "rotate-180" : ""}`} />
              </button>
              {showCurrencyPicker && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden">
                  {CURRENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.lang}
                      onClick={() => { update("currencySymbol", opt.symbol); setShowCurrencyPicker(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${opt.symbol === settings.currencySymbol ? "bg-theme-50" : ""}`}
                    >
                      <span className={`text-sm font-semibold flex-1 text-left ${opt.symbol === settings.currencySymbol ? "text-theme-700" : "text-slate-800"}`}>{opt.label}</span>
                      {opt.symbol === settings.currencySymbol && <span className="text-theme-600 text-sm">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Reset Day */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center">
              <RefreshCw size={18} className="text-theme-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{T("settings.monthly_reset")}</h2>
              <p className="text-xs text-slate-500">{T("settings.monthly_reset_hint")}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{T("settings.reset_day")}</span>
              <span className="text-sm font-semibold text-theme-600">
                {settings.monthResetDay === 31
                  ? T("settings.reset_day_last")
                  : `${settings.monthResetDay} ${T("of_each_month")}`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={31}
              step={1}
              value={settings.monthResetDay}
              onChange={(e) => update("monthResetDay", Number(e.target.value))}
              onTouchEnd={(e) => update("monthResetDay", Number((e.target as HTMLInputElement).value))}
              className="w-full accent-theme-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>31★</span>
            </div>
          </div>
        </div>

        {/* Swipe Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center">
              <Hand size={18} className="text-theme-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Swipe Navigation</h2>
              <p className="text-xs text-slate-500">{T("settings.swipe_direction")}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-slate-700 font-medium">Swipe right to create new</span>
              <p className="text-xs text-slate-400 mt-0.5">
                {settings.swipeBackDirection === "right" ? T("settings.swipe_right") : T("settings.swipe_left")}
              </p>
            </div>
            <button
              onClick={() => update("swipeBackDirection", settings.swipeBackDirection === "right" ? "left" : "right")}
              className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
                settings.swipeBackDirection === "right" ? "bg-theme-500" : "bg-slate-300"
              }`}
            >
              <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${settings.swipeBackDirection === "right" ? "ml-auto" : ""}`} />
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Globe size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Language</h2>
              <p className="text-xs text-slate-500">{T("settings.display_language")}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => update("language", "en")}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                settings.language === "en"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => update("language", "th")}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                settings.language === "th"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              🇹🇭 {T("settings.language_th")}
            </button>
            <button
              onClick={() => update("language", "zh")}
              className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                settings.language === "zh"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              🇨🇳 {T("settings.language_zh")}
            </button>
          </div>
        </div>

        {/* Guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center">
              <BookOpen size={18} className="text-theme-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{T("settings.guide_title")}</h2>
              <p className="text-xs text-slate-500">{T("settings.user_guide")}</p>
            </div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("show-guide"))}
            className="w-full py-2.5 rounded-xl bg-theme-50 text-theme-700 text-sm font-semibold hover:bg-theme-100 transition-colors border border-theme-200"
          >
            {T("settings.view_guide")}
          </button>
        </div>

        {/* Cloud Sync */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <Cloud size={18} className="text-sky-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-800">{T("settings.cloud_sync_title")}</h2>
              <p className="text-xs text-slate-500">{T("settings.cloud_sync_subtitle")}</p>
            </div>
            <button
              onClick={() => {
                if (!isPremium) { scrollToPremium(); return; }
                const next = !syncAuto;
                setSyncAuto(next);
                localStorage.setItem("sync_auto_enabled", next ? "true" : "false");
              }}
              className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
                isPremium && syncAuto ? "bg-sky-500" : "bg-slate-300"
              }`}
            >
              <span className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${isPremium && syncAuto ? "ml-auto" : ""}`} />
            </button>
          </div>

          {cloudToken ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{T("settings.connected")}</p>
                  <p className="text-xs text-slate-400">{cloudEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut size={12} />
                  {T("logout")}
                </button>
              </div>
              <button
                onClick={handleSync}
                disabled={syncStatus === "syncing"}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-50 text-sky-700 text-sm font-semibold hover:bg-sky-100 transition-colors border border-sky-200 disabled:opacity-50"
              >
                <RefreshCw size={15} className={syncStatus === "syncing" ? "animate-spin" : ""} />
                <span>
                  {syncStatus === "syncing"
                    ? T("settings.syncing")
                    : syncStatus === "error"
                    ? T("settings.sync_failed")
                    : lastSyncTime
                    ? `Sync · ${lastSyncTime} · from ${syncDirection ?? "server"}`
                    : T("settings.sync_now")}
                </span>
              </button>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 rounded-xl text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                >
                  {T("settings.delete_account")}
                </button>
              ) : (
                <div className="border border-red-200 rounded-xl p-3 space-y-2 bg-red-50">
                  <p className="text-xs font-semibold text-red-700">{T("settings.delete_account_confirm")}</p>
                  <p className="text-xs text-red-500">{T("settings.delete_account_warning")}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                    >
                      {T("cancel")}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="flex-1 py-1.5 rounded-lg text-xs bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deleteLoading ? "..." : T("delete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-50 text-sky-700 text-sm font-semibold hover:bg-sky-100 transition-colors border border-sky-200"
            >
              <RefreshCw size={15} />
              {T("settings.sync_title")}
            </button>
          )}
        </div>

        {/* Premium Subscription */}
        <div ref={premiumRef} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Star size={18} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Premium</h2>
              <p className="text-xs text-slate-500">
                {T("premium.current_plan")}: {isPremium ? "Premium" : T("premium.free_plan")}
              </p>
            </div>
          </div>

          {isPremium ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-700 font-bold text-base">
                {T("premium.active_badge")}
                {planType ? ` · ${T(`premium.${planType}`)}` : ""}
              </p>
              {premiumExpiresAt ? (
                <p className="text-xs text-amber-600 mt-1">
                  {T("premium.renews_on", {
                    date: new Date(premiumExpiresAt).toLocaleDateString(
                      LANG_LOCALE[getLang()] + "-u-ca-gregory",
                      { day: "numeric", month: "short", year: "numeric" },
                    ),
                  })}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-1">{T("premium.active_desc")}</p>
              )}
              {isIOS && (
                <button
                  onClick={handleRestorePurchase}
                  disabled={!!purchaseLoading}
                  className="mt-3 text-xs text-amber-500 underline disabled:opacity-50"
                >
                  {purchaseLoading === "restore" ? "..." : T("premium.restore")}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Current plan - Free */}
              <div className="border border-slate-200 rounded-xl p-4 mb-3">
                <p className="text-sm font-bold text-slate-700 mb-2">
                  {T("premium.current_plan")} ({T("premium.free_plan")})
                </p>
                <ul className="space-y-1.5">
                  {(["premium.free_limit_keyword", "premium.free_limit_income", "premium.free_limit_expense", "premium.free_limit_account"] as const).map((k) => (
                    <li key={k} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                      {T(k)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Monthly */}
              <div className="border border-theme-200 rounded-xl p-4 mb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Premium {T("premium.monthly")}</p>
                    <p className="text-lg font-bold text-theme-600">฿{T("premium.monthly_price")}</p>
                  </div>
                  {isIOS && (
                    <button
                      onClick={() => handlePurchase("monthly")}
                      disabled={!!purchaseLoading}
                      className="px-4 py-2 rounded-xl bg-theme-500 text-white font-semibold text-sm hover:bg-theme-600 transition-colors disabled:opacity-60 flex items-center gap-1"
                    >
                      {purchaseLoading === "monthly" ? <Loader2 size={14} className="animate-spin" /> : null}
                      {T("premium.subscribe")}
                    </button>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {(["premium.feat_keywords", "premium.feat_income_cat", "premium.feat_expense_cat", "premium.feat_accounts", "premium.feat_ledger", "premium.feat_sync"] as const).map((k) => (
                    <li key={k} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check size={12} className="text-theme-500 flex-shrink-0" />
                      {T(k)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Yearly */}
              <div className="relative border-2 border-amber-400 rounded-xl p-4 mb-3">
                <span className="absolute -top-2.5 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">-47%</span>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Premium {T("premium.yearly")}</p>
                    <p className="text-lg font-bold text-amber-600">฿{T("premium.yearly_price")}</p>
                  </div>
                  {isIOS && (
                    <button
                      onClick={() => handlePurchase("yearly")}
                      disabled={!!purchaseLoading}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center gap-1"
                    >
                      {purchaseLoading === "yearly" ? <Loader2 size={14} className="animate-spin" /> : null}
                      {T("premium.subscribe")}
                    </button>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {(["premium.feat_keywords", "premium.feat_income_cat", "premium.feat_expense_cat", "premium.feat_accounts", "premium.feat_ledger", "premium.feat_sync"] as const).map((k) => (
                    <li key={k} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check size={12} className="text-amber-500 flex-shrink-0" />
                      {T(k)}
                    </li>
                  ))}
                </ul>
              </div>

              {purchaseError && (
                <p className="text-xs text-red-500 text-center mb-2">{purchaseError}</p>
              )}

              {isIOS && (
                <button
                  onClick={handleRestorePurchase}
                  disabled={!!purchaseLoading}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                >
                  {purchaseLoading === "restore" ? "..." : T("premium.restore")}
                </button>
              )}

              <div className="flex justify-center gap-3 text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
                <button onClick={() => navigate("/privacy")} className="underline hover:text-slate-600">Privacy Policy</button>
                <span>·</span>
                <button onClick={() => navigate("/terms")} className="underline hover:text-slate-600">Terms of Use</button>
                <span>·</span>
                <button onClick={() => navigate("/eula")} className="underline hover:text-slate-600">EULA</button>
              </div>
            </>
          )}
        </div>

        {/* Legal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-slate-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{T("settings.legal_title")}</h2>
              <p className="text-xs text-slate-500">{T("settings.legal")}</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            <button
              onClick={() => navigate("/privacy")}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <FileText size={15} className="text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-slate-700">Privacy Policy · นโยบายความเป็นส่วนตัว</span>
              <ChevronLeft size={14} className="text-slate-300 rotate-180 flex-shrink-0" />
            </button>
            <button
              onClick={() => navigate("/terms")}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <FileText size={15} className="text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-slate-700">Terms of Use · ข้อกำหนดการใช้งาน</span>
              <ChevronLeft size={14} className="text-slate-300 rotate-180 flex-shrink-0" />
            </button>
            <button
              onClick={() => navigate("/eula")}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              <FileText size={15} className="text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-sm text-slate-700">License Agreement · EULA</span>
              <ChevronLeft size={14} className="text-slate-300 rotate-180 flex-shrink-0" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-2">NeverJod v1.0 · com.neverjod.app</p>

      </div>

      {showAuthForm && (
        <CloudAuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuthForm(false)}
        />
      )}
      {/* Delete Ledger Confirm */}
      {confirmDeleteLedger && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteLedger(null)} />
          <div className="relative bg-white rounded-t-2xl p-5 pb-10 space-y-3">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-1">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-slate-800 text-center">
              {T("ledger.delete_confirm") || "ลบสมุดบัญชีนี้?"}
            </p>
            <p className="text-xs text-slate-500 text-center">
              {T("ledger.delete_hint") || "ข้อมูลในสมุดบัญชีนี้จะถูกลบออกจาก Cloud ไม่สามารถกู้คืนได้"}
            </p>
            <button
              onClick={() => handleDeleteLedger(confirmDeleteLedger)}
              disabled={ledgerLoading}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {T("delete") || "ลบ"}
            </button>
            <button
              onClick={() => setConfirmDeleteLedger(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
            >
              {T("cancel") || "ยกเลิก"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
