import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";

export default function Stats() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Statistics</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
          <p className="text-slate-500 text-lg font-medium">Statistics coming soon</p>
          <p className="text-slate-400 text-sm mt-2">Charts and analysis will be available here</p>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
