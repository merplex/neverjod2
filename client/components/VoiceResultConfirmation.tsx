import { getCurrencySymbol } from "../utils/currency";
import { lk } from "../utils/ledgerStorage";
import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface VoiceResultConfirmationProps {
  categoryName?: string;
  accountName?: string;
  amount?: number;
  transcript?: string;
  isSuccess: boolean;
  isCategoryFallback?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onClose: () => void;
}

function readConfirmDelay(): number {
  try {
    const s = JSON.parse(localStorage.getItem(lk("app_settings")) || "{}");
    return typeof s.voiceInputDelay === "number" ? s.voiceInputDelay : 5;
  } catch { return 5; }
}

export default function VoiceResultConfirmation({
  categoryName,
  accountName,
  amount,
  transcript,
  isSuccess,
  isCategoryFallback,
  onConfirm,
  onEdit,
  onClose,
}: VoiceResultConfirmationProps) {
  const [countdown, setCountdown] = useState(() => readConfirmDelay());

  useEffect(() => {
    if (!isSuccess || !accountName) return;

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSuccess, accountName]);

  // Separate effect to handle auto-confirm when countdown reaches 0
  useEffect(() => {
    if (isSuccess && accountName && countdown <= 0) {
      onConfirm();
    }
  }, [countdown, isSuccess, accountName, onConfirm]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
        {isSuccess ? (
          <>
            {/* Success State */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={28} className="text-green-500" />
                <h2 className="text-lg font-bold text-slate-900">Voice Detected</h2>
              </div>
              <button
                onClick={onEdit}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Detected Information */}
            <div className="space-y-3 mb-6 bg-green-50 p-4 rounded-lg">
              {isCategoryFallback ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Category:</span>
                  <span className="text-sm font-bold text-yellow-600 flex items-center gap-1">
                    <XCircle size={14} /> missing → Other
                  </span>
                </div>
              ) : categoryName ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Category:</span>
                  <span className="text-sm font-bold text-green-600">{categoryName}</span>
                </div>
              ) : null}
              {accountName ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Account:</span>
                  <span className="text-sm font-bold text-green-600">{accountName}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Account:</span>
                  <span className="text-sm font-bold text-red-500 flex items-center gap-1">
                    <XCircle size={14} /> account missing
                  </span>
                </div>
              )}
              {amount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Amount:</span>
                  <span className="text-sm font-bold text-green-600">{getCurrencySymbol()}{amount}</span>
                </div>
              )}
            </div>

            {/* Countdown — only when account is present */}
            {accountName && (
              <div className="flex items-center justify-between mb-4 p-3 bg-theme-50 rounded-lg">
                <span className="text-sm font-semibold text-slate-600">Auto-confirming in:</span>
                <span className="text-2xl font-bold text-theme-600">{countdown}s</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Edit
              </button>
              {accountName && (
                <button
                  onClick={onConfirm}
                  className="flex-1 px-3 py-2 bg-theme-600 text-white rounded-lg text-sm font-semibold hover:bg-theme-700 transition-colors"
                >
                  Confirm Now
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Miss State */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle size={28} className="text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">No Match</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Miss Message */}
            <div className="mb-6 p-4 bg-orange-50 rounded-lg space-y-2">
              {transcript && (
                <p className="text-sm text-slate-700">
                  Heard: <span className="font-semibold">"{transcript.trim()}"</span>
                </p>
              )}
              <p className="text-xs text-slate-500 border-t border-orange-200 pt-2">
                Please review the keyword at category and account setting for better result
              </p>
            </div>

            {/* Button */}
            <button
              onClick={onEdit}
              className="w-full px-3 py-2 bg-theme-600 text-white rounded-lg text-sm font-semibold hover:bg-theme-700 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
