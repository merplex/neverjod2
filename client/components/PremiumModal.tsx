import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "../hooks/useT";
import CloudAuthModal from "./CloudAuthModal";

interface PremiumModalProps {
  message: string;
  onClose: () => void;
}

export default function PremiumModal({ message, onClose }: PremiumModalProps) {
  const navigate = useNavigate();
  const T = useT();
  const [showAuth, setShowAuth] = useState(false);

  const goToPremium = () => {
    onClose();
    navigate("/settings", { state: { scrollToPremium: true } });
  };

  const handleSubscribe = () => {
    const token = localStorage.getItem("cloud_token");
    if (token) {
      goToPremium();
    } else {
      setShowAuth(true);
    }
  };

  if (showAuth) {
    return (
      <CloudAuthModal
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          goToPremium();
        }}
      />
    );
  }

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
