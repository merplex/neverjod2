import { useLocation, useNavigate } from "react-router-dom";
import { FileText, BarChart3, Grid3x3, Settings } from "lucide-react";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/transactions", label: "Transaction", icon: FileText },
    { path: "/stats", label: "Stats", icon: BarChart3 },
    { path: "/categories", label: "Category", icon: Grid3x3 },
    { path: "/accounts", label: "Account", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-50">
      <div className="max-w-md mx-auto px-4 py-3 flex justify-around items-center">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                active
                  ? "text-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <IconComponent size={20} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
