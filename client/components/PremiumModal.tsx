import { useState } from "react";
import { Lock, Star, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { purchaseProduct, restorePurchases } from "../utils/iap";
import { apiVerifyPurchase } from "../utils/syncService";
import { useT } from "../hooks/useT";

interface PremiumModalProps {
  message: string;
  onClose: () => void;
  onSignUp?: () => void;
}

export default function PremiumModal({ message, onClose, onSignUp }: PremiumModalProps) {
  const navigate = useNavigate();
  const T = useT();
  const [loading, setLoading] = useState<"monthly" | "yearly" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!localStorage.getItem("cloud_token");
  const isNative = Capacitor.isNativePlatform();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handlePurchase = async (plan: "monthly" | "yearly") => {
    if (!isLoggedIn) {
      onClose();
      if (onSignUp) onSignUp(); else navigate("/settings");
      return;
    }
    setError(null);
    setLoading(plan);
    try {
      const { receipt } = await purchaseProduct(plan);
      await apiVerifyPurchase(receipt);
      localStorage.setItem("app_premium", "true");
      onClose();
      window.location.reload();
    } catch (e: any) {
      if (e.message !== "cancelled") setError(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!isLoggedIn) {
      onClose();
      if (onSignUp) onSignUp(); else navigate("/settings");
      return;
    }
    setError(null);
    setLoading("restore");
    try {
      const { receipt } = await restorePurchases();
      if (!receipt) { setError("ไม่พบการซื้อเดิม"); return; }
      await apiVerifyPurchase(receipt);
      localStorage.setItem("app_premium", "true");
      onClose();
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(null);
    }
  };

  const handleSignUp = () => {
    onClose();
    if (onSignUp) onSignUp(); else navigate("/settings");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4">
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
        >
          ×
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-theme-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Lock size={20} className="text-theme-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">{T("premium.title")}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4 whitespace-pre-line">{message}</p>

        <div className="bg-theme-50 rounded-xl p-3 mb-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-theme-700">
            <Star size={12} className="fill-theme-500 text-theme-500" />
            <span>{T("premium.feature_sync")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-theme-700">
            <Star size={12} className="fill-theme-500 text-theme-500" />
            <span>{T("premium.feature_accounts")}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-theme-700">
            <Star size={12} className="fill-theme-500 text-theme-500" />
            <span>{T("premium.feature_keywords")}</span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 mb-3 text-center">{error}</p>
        )}

        {isNative && isLoggedIn ? (
          <>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => handlePurchase("monthly")}
                disabled={!!loading}
                className="flex-1 py-3 rounded-xl bg-theme-500 text-white font-semibold text-sm hover:bg-theme-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
              >
                {loading === "monthly" ? <Loader2 size={14} className="animate-spin" /> : "✨"} {T("premium.monthly")}
              </button>
              <button
                onClick={() => handlePurchase("yearly")}
                disabled={!!loading}
                className="relative flex-1 py-3 rounded-xl bg-theme-700 text-white font-semibold text-sm hover:bg-theme-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
              >
                <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">-47%</span>
                {loading === "yearly" ? <Loader2 size={14} className="animate-spin" /> : "⭐"} {T("premium.yearly")}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={!!loading}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                {T("premium.acknowledge")}
              </button>
              <button
                onClick={handleRestore}
                disabled={!!loading}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-500 font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
              >
                {loading === "restore" ? <Loader2 size={12} className="animate-spin" /> : null} {T("premium.restore")}
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              {T("premium.acknowledge")}
            </button>
            <button
              onClick={handleSignUp}
              className="flex-1 py-3 rounded-xl bg-theme-500 text-white font-semibold text-sm hover:bg-theme-600 transition-colors"
            >
              ✨ {T("premium.subscribe")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
