import { useState } from "react";
import { X } from "lucide-react";
import { apiLogin, apiRegister } from "../utils/syncService";
import { useT } from "../hooks/useT";

interface Props {
  onSuccess: (isPremium: boolean) => void;
  onClose: () => void;
}

export default function CloudAuthModal({ onSuccess, onClose }: Props) {
  const T = useT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const fn = mode === "login" ? apiLogin : apiRegister;
      const result = await fn(email, password);
      localStorage.setItem("app_premium", result.isPremium ? "true" : "false");
      localStorage.setItem("cloud_token", result.token);
      localStorage.setItem("cloud_email", result.email);
      onSuccess(result.isPremium);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">{T("auth.title")}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setMode("login")}
            className={`px-3 py-1 rounded-full font-medium ${mode === "login" ? "bg-sky-100 text-sky-700" : "text-slate-400"}`}
          >
            {T("login")}
          </button>
          <button
            onClick={() => setMode("register")}
            className={`px-3 py-1 rounded-full font-medium ${mode === "register" ? "bg-sky-100 text-sky-700" : "text-slate-400"}`}
          >
            {T("register")}
          </button>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-sky-400"
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-sky-400"
        />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-slate-500 border border-slate-200 hover:bg-slate-50"
          >
            {T("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? T("login") : T("register_short")}
          </button>
        </div>
      </div>
    </div>
  );
}
