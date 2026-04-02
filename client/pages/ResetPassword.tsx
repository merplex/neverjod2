import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiResetPassword } from "../utils/syncService";
import { useT } from "../hooks/useT";

export default function ResetPassword() {
  const T = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) return setError(T("auth.reset_min_length"));
    if (password !== confirm) return setError(T("auth.reset_mismatch"));
    setLoading(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-slate-500 text-sm">ลิงก์ไม่ถูกต้อง</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800">{T("auth.reset_title")}</h2>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{T("auth.reset_success")}</p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600"
            >
              {T("auth.back_to_login")}
            </button>
          </div>
        ) : (
          <>
            <input
              type="password"
              placeholder={T("auth.reset_new_password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-sky-400"
              autoFocus
            />
            <input
              type="password"
              placeholder={T("auth.reset_confirm_password")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-sky-400"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {loading ? "..." : T("auth.reset_submit")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
