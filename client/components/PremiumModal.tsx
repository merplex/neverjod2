import { Lock, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PremiumModalProps {
  message: string;
  onClose: () => void;
  /** Override default behaviour (navigate to /settings). */
  onSignUp?: () => void;
}

export default function PremiumModal({ message, onClose, onSignUp }: PremiumModalProps) {
  const navigate = useNavigate();

  const handleSignUp = () => {
    onClose();
    if (onSignUp) {
      onSignUp();
    } else {
      navigate("/settings");
    }
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
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Lock size={20} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">ต้องการ Premium</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4 whitespace-pre-line">{message}</p>

        <div className="bg-amber-50 rounded-xl p-3 mb-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            <span>Cloud Sync ข้ามอุปกรณ์ไม่จำกัด</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            <span>Accounts และ Categories ไม่จำกัด</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            <span>Keywords ไม่จำกัดต่อหมวดหมู่</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            รับทราบ
          </button>
          <button
            onClick={handleSignUp}
            className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors"
          >
            ✨ สมัคร
          </button>
        </div>
      </div>
    </div>
  );
}
