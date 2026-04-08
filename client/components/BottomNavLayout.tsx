import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileText, BarChart3, Grid3x3, Landmark, Settings, Plus } from "lucide-react";

const LEGAL_PATHS = ["/privacy", "/terms", "/eula"];

export default function BottomNavLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLegal = LEGAL_PATHS.some((p) => location.pathname.startsWith(p));

  // Intercept Android hardware back + edge-swipe gesture via Capacitor's backbutton event.
  // On any page except home ("/"), go home. On home, let Android exit the app naturally.
  useEffect(() => {
    const handler = (e: Event) => {
      if (location.pathname !== "/") {
        e.preventDefault();
        navigate("/");
      }
      // On "/", no preventDefault → Android exits the app normally
    };
    document.addEventListener("backbutton", handler, false);
    return () => document.removeEventListener("backbutton", handler, false);
  }, [location.pathname, navigate]);

  const navItems = [
    { path: "/transactions", label: "Transaction", icon: FileText },
    { path: "/stats", label: "Stats", icon: BarChart3 },
    { path: "/categories", label: "Category", icon: Grid3x3 },
    { path: "/accounts", label: "Account", icon: Landmark },
    { path: "/settings", label: "Setting", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Pages that manage their own height (h-[100dvh]) — no extra padding needed.
  const SELF_MANAGED_PATHS = ["/", "/repeat-transactions"];
  const isHome = SELF_MANAGED_PATHS.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <div className={`flex-1 ${isHome || isLegal ? "" : "pb-safe-content"}`}>{children}</div>

      {!isHome && !isLegal && (
        <button
          onClick={() => navigate("/")}
          className="fixed right-4 z-50 w-14 h-14 rounded-full bg-theme-600 text-white shadow-lg flex items-center justify-center active:bg-theme-700 transition-colors"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* Bottom Navigation - hidden on legal pages */}
      {isLegal ? null : <div className="fixed bottom-0 left-0 right-0 flex justify-center z-40">
        <div className="w-full max-w-md bg-white border-t-2 border-slate-300 shadow-2xl pb-safe-nav">
          <div className="px-2 pt-2 pb-0 flex justify-around items-center">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
                    active
                      ? "text-theme-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <IconComponent size={18} />
                  <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>}
    </div>
  );
}
