import { useNavigate } from "react-router-dom";
import { useT } from "../hooks/useT";

interface PremiumModalProps {
  message: string;
  onClose: () => void;
  onSignUp?: () => void;
}

export default function PremiumModal({ message, onClose, onSignUp }: PremiumModalProps) {
  const navigate = useNavigate();
  const T = useT();

  const handleSubscribe = () => {
    onClose();
    if (onSignUp) {
      onSignUp();
    } else {
      navigate("/settings", { state: { scrollToPremium: true } });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl px-5 pt-5 pb-10 shadow-xl">
        <p className="text-sm text-slate-600 mb-5 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium text-sm hover:bg-slate-200 transition-colors"
          >
            {T("premium.acknowledge")}
          </button>
          <button
            onClick={handleSubscribe}
            className="flex-1 py-3 rounded-xl bg-theme-500 text-white font-semibold text-sm hover:bg-theme-600 transition-colors"
          >
            ✨ {T("premium.subscribe")}
          </button>
        </div>
      </div>
    </div>
  );
}
