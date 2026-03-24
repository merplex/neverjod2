import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface VoiceResultConfirmationProps {
  categoryName?: string;
  accountName?: string;
  amount?: number;
  isSuccess: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export default function VoiceResultConfirmation({
  categoryName,
  accountName,
  amount,
  isSuccess,
  onConfirm,
  onEdit,
  onClose,
}: VoiceResultConfirmationProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isSuccess) return;

    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSuccess]);

  // Separate effect to handle auto-confirm when countdown reaches 0
  useEffect(() => {
    if (isSuccess && countdown === 0) {
      onConfirm();
    }
  }, [countdown, isSuccess, onConfirm]);

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
              {categoryName && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Category:</span>
                  <span className="text-sm font-bold text-green-600">{categoryName}</span>
                </div>
              )}
              {accountName && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Account:</span>
                  <span className="text-sm font-bold text-green-600">{accountName}</span>
                </div>
              )}
              {amount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Amount:</span>
                  <span className="text-sm font-bold text-green-600">฿{amount}</span>
                </div>
              )}
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-between mb-4 p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-semibold text-slate-600">Auto-confirming in:</span>
              <span className="text-2xl font-bold text-indigo-600">{countdown}s</span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Confirm Now
              </button>
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
            <div className="mb-6 p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-slate-600">
                Could not detect all required information (category, account, and amount). Please try again or select manually.
              </p>
            </div>

            {/* Button */}
            <button
              onClick={onEdit}
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
