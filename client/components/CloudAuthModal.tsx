import { useState } from "react";
import { X } from "lucide-react";
import { apiLogin, apiRegister, apiForgotPassword, apiGoogleLogin, apiAppleLogin, AuthResponse } from "../utils/syncService";
import { signInWithGoogle, signInWithApple, isIOS } from "../utils/socialAuth";
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
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const applyAuthResult = (result: AuthResponse) => {
    localStorage.setItem("app_premium", result.isPremium ? "true" : "false");
    localStorage.setItem("cloud_token", result.token);
    localStorage.setItem("cloud_email", result.email);
    if (result.planType) localStorage.setItem("app_plan_type", result.planType);
    else localStorage.removeItem("app_plan_type");
    if (result.premiumExpiresAt) localStorage.setItem("app_premium_expires_at", result.premiumExpiresAt);
    else localStorage.removeItem("app_premium_expires_at");
    localStorage.setItem("app_auto_renew", result.autoRenew ? "true" : "false");
    onSuccess(result.isPremium);
  };

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
        applyAuthResult(result);
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSocialLoading("google");
    try {
      const idToken = await signInWithGoogle();
      applyAuthResult(await apiGoogleLogin(idToken));
    } catch (err: any) {
      setError(err.message || T("auth.social_error"));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setError("");
    setSocialLoading("apple");
    try {
      const identityToken = await signInWithApple();
      applyAuthResult(await apiAppleLogin(identityToken));
    } catch (err: any) {
      setError(err.message || T("auth.social_error"));
    } finally {
      setSocialLoading(null);
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

            {(mode === "login" || mode === "register") && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">{T("auth.or_continue_with")}</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={socialLoading !== null}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.94H1.27v3.1C3.25 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.29v-3.1H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.1z"/>
                      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z"/>
                    </svg>
                    {socialLoading === "google" ? "..." : T("auth.continue_google")}
                  </button>

                  {isIOS() && (
                    <button
                      onClick={handleAppleSignIn}
                      disabled={socialLoading !== null}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm3.02 15.09c-.06.14-.31.99-1.02 1.96-.62.85-1.26 1.7-2.27 1.72-.99.02-1.31-.58-2.44-.58-1.14 0-1.49.56-2.43.6-.98.04-1.72-.92-2.35-1.77-1.28-1.73-2.26-4.9-.94-7.04.65-1.06 1.82-1.73 3.08-1.75.98-.02 1.9.66 2.5.66.6 0 1.72-.82 2.9-.7.5.02 1.87.2 2.76 1.5-.07.05-1.65.96-1.63 2.87.02 2.28 2 3.04 2.02 3.05z"/>
                      </svg>
                      {socialLoading === "apple" ? "..." : T("auth.continue_apple")}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
