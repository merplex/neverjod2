import { useState, useEffect } from "react";
import { ChevronLeft, Mic, Cloud, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SETTINGS_KEY = "app_settings";

interface AppSettings {
  voiceInputDelay: number;
  cloudBackupEnabled: boolean;
  language: "en" | "th";
}

const defaultSettings: AppSettings = {
  voiceInputDelay: 3,
  cloudBackupEnabled: false,
  language: "en",
};

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
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
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

        {/* Voice Input Delay */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Mic size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Voice Input Delay</h2>
              <p className="text-xs text-slate-500">ระยะเวลาหลังหยุดพูดก่อน autosave</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">หน่วงเวลา</span>
              <span className="text-sm font-semibold text-indigo-600">
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
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1 วิ</span>
              <span>5 วิ</span>
              <span>10 วิ</span>
            </div>
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
