import { useState, useEffect } from "react";
import { ChevronLeft, Mic, Cloud, Globe, Palette, Check, BookOpen, Hand } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSwipeBack } from "../hooks/useSwipeBack";

const SETTINGS_KEY = "app_settings";

type ColorTheme = "teal" | "blue" | "purple" | "rose" | "amber" | "sky";

interface AppSettings {
  voiceInputDelay: number;
  voiceAutoStart: boolean;
  cloudBackupEnabled: boolean;
  language: "en" | "th";
  colorTheme: ColorTheme;
  swipeBackDirection: "right" | "left";
}

const defaultSettings: AppSettings = {
  voiceInputDelay: 3,
  voiceAutoStart: true,
  cloudBackupEnabled: false,
  language: "en",
  colorTheme: "teal",
  swipeBackDirection: "right",
};

const colorThemes: { id: ColorTheme; name: string; swatches: string[] }[] = [
  { id: "teal",   name: "Teal",   swatches: ["#ccfbf1", "#2dd4bf", "#0d9488", "#0f766e"] },
  { id: "blue",   name: "Blue",   swatches: ["#e0e7ff", "#818cf8", "#4f46e5", "#4338ca"] },
  { id: "purple", name: "Purple", swatches: ["#ede9fe", "#a78bfa", "#7c3aed", "#6d28d9"] },
  { id: "rose",   name: "Rose",   swatches: ["#ffe4e6", "#fb7185", "#e11d48", "#be123c"] },
  { id: "amber",  name: "Amber",  swatches: ["#fef3c7", "#fbbf24", "#d97706", "#b45309"] },
  { id: "sky",    name: "Sky",    swatches: ["#e0f2fe", "#38bdf8", "#0284c7", "#0369a1"] },
];

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {}
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const navigate = useNavigate();
  useSwipeBack();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.setAttribute("data-theme", settings.colorTheme);
  }, [settings]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">Settings</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Color Theme */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-theme-100 rounded-xl flex items-center justify-center">
              <Palette size={18} className="text-theme-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Color Theme</h2>
              <p className="text-xs text-slate-500">ธีมสีของแอป</p>
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
              <p className="text-xs text-slate-500">ระยะเวลาหลังหยุดพูดก่อน autosave</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-700 font-medium">Auto Start</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  {settings.voiceAutoStart ? "เปิดไมค์อัตโนมัติเมื่อเข้าหน้าแรก" : "ต้องกดปุ่มไมค์เองก่อนพูด"}
                </p>
              </div>
              <button
                onClick={() => update("voiceAutoStart", !settings.voiceAutoStart)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.voiceAutoStart ? "bg-theme-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    settings.voiceAutoStart ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">หน่วงเวลา autosave</span>
                <span className="text-sm font-semibold text-theme-600">
                  {settings.voiceInputDelay} วินาที
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={settings.voiceInputDelay}
                onChange={(e) => update("voiceInputDelay", Number(e.target.value))}
                className="w-full accent-theme-600"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>1 วิ</span>
                <span>5 วิ</span>
                <span>10 วิ</span>
              </div>
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
              <p className="text-xs text-slate-500">ทิศทาง swipe เพื่อย้อนกลับ</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-slate-700 font-medium">Swipe right to go back</span>
              <p className="text-xs text-slate-400 mt-0.5">
                {settings.swipeBackDirection === "right" ? "swipe ขวา = ย้อนกลับ" : "swipe ซ้าย = ย้อนกลับ"}
              </p>
            </div>
            <button
              onClick={() => update("swipeBackDirection", settings.swipeBackDirection === "right" ? "left" : "right")}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.swipeBackDirection === "right" ? "bg-theme-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.swipeBackDirection === "right" ? "translate-x-7" : "translate-x-1"
                }`}
              />
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
              <p className="text-xs text-slate-500">ภาษาแสดงผลในแอป</p>
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
              🇹🇭 ภาษาไทย
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
              <p className="text-xs text-slate-500">คู่มือการใช้งานแอป</p>
            </div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("show-guide"))}
            className="w-full py-2.5 rounded-xl bg-theme-50 text-theme-700 text-sm font-semibold hover:bg-theme-100 transition-colors border border-theme-200"
          >
            ดูคู่มือการใช้งาน
          </button>
        </div>

        {/* Cloud Backup */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <Cloud size={18} className="text-sky-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Cloud Backup</h2>
              <p className="text-xs text-slate-500">สำรองข้อมูลขึ้น Cloud</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">เปิดใช้งาน</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
              <button
                disabled
                className="relative w-12 h-6 rounded-full bg-slate-200 cursor-not-allowed opacity-50"
              >
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
