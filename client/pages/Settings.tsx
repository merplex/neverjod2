import { useState, useEffect } from "react";
import { ChevronLeft, Mic, Cloud, Globe, Palette, Check, BookOpen, Hand, LogOut, RefreshCw, Repeat, Lock, FileText, Shield, ChevronDown } from "lucide-react";
import { CURRENCY_OPTIONS } from "../utils/currency";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { apiLogin, apiRegister, syncAll } from "../utils/syncService";
import PremiumModal from "../components/PremiumModal";
import { useT } from "../hooks/useT";

const SETTINGS_KEY = "app_settings";

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
    const saved = localStorage.getItem(SETTINGS_KEY);
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
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const navigate = useNavigate();
  useSwipeBack();
  const T = useT();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [initialLang] = useState(() => loadSettings().language);
  const [showVoiceLangPicker, setShowVoiceLangPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const isPremium = localStorage.getItem("app_premium") === "true";
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Cloud Backup state
  const [cloudToken, setCloudToken] = useState<string>(() => localStorage.getItem("cloud_token") || "");
  const [cloudEmail, setCloudEmail] = useState<string>(() => localStorage.getItem("cloud_email") || "");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
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
      : localStorage.getItem("last_push_at");
    if (!t) return "";
    try { return new Date(t).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  });
  const [showAuthForm, setShowAuthForm] = useState(false);

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
      const t = localStorage.getItem("last_client_sync_at") || localStorage.getItem("last_push_at");
      if (t) setLastSyncTime(formatTime(t));
    };
    window.addEventListener("sync-updated", onSyncUpdated);
    return () => window.removeEventListener("sync-updated", onSyncUpdated);
  }, []);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleAuth = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const fn = authMode === "login" ? apiLogin : apiRegister;
      const result = await fn(authEmail, authPassword);
      localStorage.setItem("app_premium", result.isPremium ? "true" : "false");
      localStorage.setItem("cloud_token", result.token);
      localStorage.setItem("cloud_email", result.email);
      setCloudToken(result.token);
      setCloudEmail(result.email);
      setShowAuthForm(false);
      setAuthEmail("");
      setAuthPassword("");
      if (!result.isPremium) {
        // Free tier — don't allow cloud sync, show upgrade prompt
        setShowPremiumModal(true);
        return;
      }
      // Auto sync after login
      setSyncStatus("syncing");
      await syncAll(result.token, false);
      localStorage.setItem("sync_direction", "server");
      setSyncDirection("server");
      setSyncStatus("ok");
      refreshLastSyncTime(false);
    } catch (err: any) {
      setAuthError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setAuthLoading(false);
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
      : (localStorage.getItem("last_push_at") || localStorage.getItem("last_sync_at"));
    if (!t) return;
    setLastSyncTime(formatTime(t));
  };

  const handleSync = async () => {
    if (!cloudToken) return;
    if (!isPremium) { setShowPremiumModal(true); return; }
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
    localStorage.removeItem("last_sync_at");
    localStorage.removeItem("sync_direction");
    localStorage.removeItem("last_client_sync_at");
    setCloudToken("");
    setCloudEmail("");
    setSyncStatus("idle");
    setSyncDirection(null);
    setLastSyncTime("");
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
        <h1 className="text-lg font-semibold text-slate-800">Settings</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Repeat Transactions — first item */}
        <button
          onClick={() => navigate("/repeat-transactions")}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Repeat size={18} className="text-theme-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-800">Repeat Transactions</h2>
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
              <h2 className="text-sm font-semibold text-slate-800">Color Theme</h2>
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
              <h2 className="text-sm font-semibold text-slate-800">Voice Input</h2>
              <p className="text-xs text-slate-500">{T("settings.autosave_hint")}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-700 font-medium">Auto Start</span>
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
              <h2 className="text-sm font-semibold text-slate-800">Guide</h2>
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
              <h2 className="text-sm font-semibold text-slate-800">Cloud Sync</h2>
              <p className="text-xs text-slate-500">Support multiple devices</p>
            </div>
            <button
              onClick={() => {
                if (!isPremium) { setShowPremiumModal(true); return; }
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
            </div>
          ) : showAuthForm ? (
            <div className="space-y-3">
              <div className="flex gap-2 text-xs mb-1">
                <button
                  onClick={() => setAuthMode("login")}
                  className={`px-3 py-1 rounded-full font-medium ${authMode === "login" ? "bg-sky-100 text-sky-700" : "text-slate-400"}`}
                >
                  {T("login")}
                </button>
                <button
                  onClick={() => setAuthMode("register")}
                  className={`px-3 py-1 rounded-full font-medium ${authMode === "register" ? "bg-sky-100 text-sky-700" : "text-slate-400"}`}
                >
                  {T("register")}
                </button>
              </div>
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-sky-400"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-sky-400"
              />
              {authError && <p className="text-xs text-red-500">{authError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAuthForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-slate-500 border border-slate-200 hover:bg-slate-50"
                >
                  {T("cancel")}
                </button>
                <button
                  onClick={handleAuth}
                  disabled={authLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  {authLoading ? "..." : authMode === "login" ? T("login") : T("register_short")}
                </button>
              </div>
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

        {/* Legal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-slate-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Legal</h2>
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

      {showPremiumModal && (
        <PremiumModal
          message={"บัญชีของคุณเป็นแพลนฟรี\nอัปเกรด Premium เพื่อใช้งาน Cloud Sync ข้ามอุปกรณ์"}
          onClose={() => setShowPremiumModal(false)}
          onSignUp={() => { setShowPremiumModal(false); setShowAuthForm(true); }}
        />
      )}
    </div>
  );
}
