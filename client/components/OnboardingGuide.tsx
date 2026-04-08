import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE } from "../utils/syncService";

const FALLBACK_SLIDES = [
  "/guide-1.jpg",
  "/guide-2.jpg",
  "/guide-3.jpg",
  "/guide-4.jpg",
];

interface Props {
  onClose: () => void;
}

export default function OnboardingGuide({ onClose }: Props) {
  const [slides, setSlides] = useState<string[]>(FALLBACK_SLIDES);
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/guide/slides`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          setSlides(data.slides);
        }
      })
      .catch((err) => { if (err.name !== "AbortError") {/* keep fallback */} });
    return () => controller.abort();
  }, []);

  const finish = () => {
    try { localStorage.setItem("app_onboarding_done", "1"); } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" style={{ height: "70vh" }}>

        {/* Close */}
        <div className="flex justify-end px-4 pt-4 flex-shrink-0">
          <button onClick={finish} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center px-4 pb-2 min-h-0">
          <img
            key={index}
            src={slides[index]}
            alt={`guide-${index + 1}`}
            className="w-full h-full object-contain rounded-xl"
          />
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 py-3 flex-shrink-0">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === index ? "w-5 h-2 bg-theme-600" : "w-2 h-2 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 px-6 pb-6 flex-shrink-0">
          {index > 0 && (
            <button
              onClick={() => setIndex(index - 1)}
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex-shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <button
            onClick={() => isLast ? finish() : setIndex(index + 1)}
            className="flex-1 h-11 rounded-xl bg-theme-600 text-white font-semibold text-sm hover:bg-theme-700 transition-colors flex items-center justify-center gap-1"
          >
            {isLast ? "เริ่มใช้งาน" : (
              <>ถัดไป <ChevronRight size={16} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
