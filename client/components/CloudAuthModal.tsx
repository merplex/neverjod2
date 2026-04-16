import { useState } from "react";
import { X } from "lucide-react";
import { apiLogin, apiRegister, apiForgotPassword } from "../utils/syncService";
import { useT } from "../hooks/useT";

interface Props {
  onSuccess: (isPremium: boolean) => void;
  onClose: () => void;
}

export default function CloudAuthModal({ onSuccess, onClose }: Props) {
  const T = useT();
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "forgot_sent">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        await apiForgotPassword(email);
        setMode("forgot_sent");
      } else {
        const fn = mode === "login" ? apiLogin : apiRegister;
        const result = await fn(email, password);
        localStorage.setItem("app_premium", result.isPremium ? "true" : "false");
        localStorage.setItem("cloud_token", result.token);
        localStorage.setItem("cloud_email", result.email);
        if (result.planType) localStorage.setItem("app_plan_type", result.planType);
        else localStorage.removeItem("app_plan_type");
        if (result.premiumExpiresAt) localStorage.setItem("app_premium_expires_at", result.premiumExpiresAt);
        else localStorage.removeItem("app_premium_expires_at");
        localStorage.setItem("app_auto_renew", result.autoRenew ? "true" : "false");
        onSuccess(result.isPremium);
      }
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
          <h2 className="text-base font-bold text-slate-800">
            {mode === "forgot" || mode === "forgot_sent" ? T("auth.forgot_title") : T("auth.title")}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {(mode === "login" || mode === "register") && (
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
        )}

        {mode === "forgot_sent" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{T("auth.forgot_sent")}</p>
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600"
            >
              {T("auth.back_to_login")}
            </button>
          </div>
        ) : (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-sky-400"
              autoFocus
            />
            {mode !== "forgot" && (
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-sky-400"
                />
                {mode === "login" && (
                  <button
                    onClick={() => { setMode("forgot"); setError(""); }}
                    className="text-xs text-sky-500 hover:text-sky-700 pl-1"
                  >
                    {T("auth.forgot_password")}
                  </button>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2">
              {mode === "forgot" ? (
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm text-slate-500 border border-slate-200 hover:bg-slate-50"
                >
                  {T("auth.back_to_login")}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm text-slate-500 border border-slate-200 hover:bg-slate-50"
                >
                  {T("cancel")}
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {loading ? "..." : mode === "forgot" ? T("auth.send_reset") : mode === "login" ? T("login") : T("register_short")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
