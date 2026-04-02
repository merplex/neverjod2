import { useLocation, useNavigate } from "react-router-dom";
import { FileText, BarChart3, Grid3x3, User, Settings } from "lucide-react";
import { useT } from "../hooks/useT";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const T = useT();

  const navItems = [
    { path: "/transactions", label: T("nav.transactions"), icon: FileText },
    { path: "/stats", label: T("nav.stats"), icon: BarChart3 },
    { path: "/categories", label: T("nav.categories"), icon: Grid3x3 },
    { path: "/accounts", label: T("nav.accounts"), icon: User },
    { path: "/settings", label: T("nav.settings"), icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 shadow-2xl z-50">
      <div className="px-4 py-3 flex justify-around items-center">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                active
                  ? "text-theme-600"
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
