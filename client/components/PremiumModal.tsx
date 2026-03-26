import { Lock } from "lucide-react";

interface PremiumModalProps {
  message: string;
  onClose: () => void;
}

export default function PremiumModal({ message, onClose }: PremiumModalProps) {
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
        <p className="text-sm text-slate-500 mb-5">{message}</p>
        <div className="flex flex-col gap-2">
          <button className="w-full py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm">
            ✨ อัปเกรด Premium
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
