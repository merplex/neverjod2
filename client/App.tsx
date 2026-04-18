import "./global.css";

import { useEffect, useState } from "react";
import { checkAndExecuteRepeats } from "./utils/repeatTransactionService";
import { lk } from "./utils/ledgerStorage";
import { syncAll } from "./utils/syncService";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { createRoot, Root } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import OnboardingGuide from "./components/OnboardingGuide";

// Legal pages and reset-password are accessible on desktop too — only block the main app
const LEGAL_PATHS = ["/privacy", "/terms", "/eula", "/reset-password"];

function DesktopBlock() {
  const { pathname } = useLocation();
  const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.();
  const isLegal = LEGAL_PATHS.some((p) => pathname.startsWith(p));

  if (isNativeApp || isLegal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[9999] px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📱</div>
        <h1 className="text-2xl font-bold text-white mb-3">NeverJod</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          แอปนี้ออกแบบสำหรับมือถือ<br />กรุณาดาวน์โหลดบน iOS หรือ Android
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="https://apps.apple.com/app/neverjod"
            className="flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold py-3 px-6 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.neverjod.app"
            className="flex items-center justify-center gap-3 bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl hover:bg-slate-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M3.18 23.76c.3.17.64.22.98.15l13.06-7.55-2.83-2.83-11.21 10.23zm-1.5-20.7C1.45 3.4 1.25 3.82 1.25 4.36v15.28c0 .54.2.96.43 1.3l.07.07 8.57-8.57v-.2L1.68 3.06l-.01.01zM20.9 10.5l-2.86-1.66-3.18 3.18 3.18 3.18 2.89-1.67c.82-.48.82-1.55-.03-2.03zM4.16.25L17.22 7.8l-2.83 2.83L3.18.4A1.16 1.16 0 014.16.25z"/></svg>
            Google Play
          </a>
        </div>
      </div>
    </div>
  );
}

const ALL_THEMES = ["teal", "blue", "purple", "rose", "amber", "sky"] as const;

function ThemeProvider() {
  useEffect(() => {
    function apply() {
      try {
        const s = JSON.parse(localStorage.getItem(lk("app_settings")) || "{}");
        if (!s.colorTheme) {
          // First launch — pick a random theme and persist it
          s.colorTheme = ALL_THEMES[Math.floor(Math.random() * ALL_THEMES.length)];
          localStorage.setItem(lk("app_settings"), JSON.stringify(s));
        }
        document.documentElement.setAttribute("data-theme", s.colorTheme);
      } catch {}
    }
    apply();
    window.addEventListener("storage", apply);
    return () => window.removeEventListener("storage", apply);
  }, []);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    document.documentElement.classList.add(isIOS ? "platform-ios" : "platform-android");
  }, []);

  return null;
}
import Index from "./pages/Index";
import Transactions from "./pages/Transactions";
import AllTransactions from "./pages/AllTransactions";
import TransactionDetail from "./pages/TransactionDetail";
import Stats from "./pages/Stats";
import Categories from "./pages/Categories";
import AccountsManagement from "./pages/AccountsManagement";
import Settings from "./pages/Settings";
import RepeatTransactions from "./pages/RepeatTransactions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Eula from "./pages/Eula";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import BottomNavLayout from "./components/BottomNavLayout";

const queryClient = new QueryClient();

declare global {
  var __ROOT__: Root | undefined;
}

function AppContent() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showGuide, setShowGuide] = useState(() => {
    try { return !localStorage.getItem("app_onboarding_done"); } catch { return false; }
  });

  useEffect(() => {
    // Don't redirect if user opened a legal page directly
    if (LEGAL_PATHS.some((p) => pathname.startsWith(p))) return;
    if (checkAndExecuteRepeats()) window.dispatchEvent(new CustomEvent("repeats-updated"));
    // Restore last page if app was briefly hidden (< 1 min), else go home
    const lastPath = sessionStorage.getItem("last_path");
    const lastHideAt = sessionStorage.getItem("last_hide_at");
    const elapsed = lastHideAt ? Date.now() - parseInt(lastHideAt) : Infinity;
    if (lastPath && elapsed < 60_000) {
      navigate(lastPath, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
    // Refresh app_premium from JWT payload (in case DB was updated since last login)
    const token = localStorage.getItem("cloud_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (typeof payload.isPremium === "boolean") {
          // Only downgrade premium if JWT explicitly says false — never override a true set by purchase
          if (payload.isPremium === true || localStorage.getItem("app_premium") !== "true") {
            localStorage.setItem("app_premium", payload.isPremium ? "true" : "false");
          }
        }
      } catch {}
      if (localStorage.getItem("sync_auto_enabled") === "true") {
        syncAll(token).then(() => {
          if (localStorage.getItem("app_premium") !== "true") return;
          // Refresh data in-place after first sync (no reload — avoids resetting app state/mic)
          if (!sessionStorage.getItem("synced_once")) {
            sessionStorage.setItem("synced_once", "1");
            window.dispatchEvent(new CustomEvent("sync-data-refresh"));
          }
          {
            // Mark direction as "client" (we pushed our data)
            const now = new Date().toISOString();
            localStorage.setItem("sync_direction", "client");
            localStorage.setItem("last_client_sync_at", now);
            window.dispatchEvent(new CustomEvent("sync-updated"));
          }
        }).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Save current page and hide timestamp for restore logic
        sessionStorage.setItem("last_path", window.location.pathname);
        sessionStorage.setItem("last_hide_at", Date.now().toString());
      } else if (document.visibilityState === "visible") {
        const lastHideAt = sessionStorage.getItem("last_hide_at");
        const elapsed = lastHideAt ? Date.now() - parseInt(lastHideAt) : 0;
        // Away > 1 minute → go home
        if (elapsed >= 60_000) {
          navigate("/", { replace: true });
        }
        const token = localStorage.getItem("cloud_token");
        if (token && localStorage.getItem("sync_auto_enabled") === "true") {
          syncAll(token).then(() => {
            if (localStorage.getItem("app_premium") !== "true") return;
            const now = new Date().toISOString();
            localStorage.setItem("sync_direction", "client");
            localStorage.setItem("last_client_sync_at", now);
            window.dispatchEvent(new CustomEvent("sync-updated"));
          }).catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const handler = () => setShowGuide(true);
    window.addEventListener("show-guide", handler);
    return () => window.removeEventListener("show-guide", handler);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/transactions" element={<AllTransactions />} />
        <Route path="/account/:accountId/transactions" element={<Transactions />} />
        <Route path="/account/:accountId/transactions/:transactionId" element={<TransactionDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/accounts" element={<AccountsManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/repeat-transactions" element={<RepeatTransactions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/eula" element={<Eula />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showGuide && !LEGAL_PATHS.some((p) => pathname.startsWith(p)) && <OnboardingGuide onClose={() => setShowGuide(false)} />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DesktopBlock />
        <BottomNavLayout>
          <AppContent />
        </BottomNavLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const rootElement = document.getElementById("root");
if (rootElement) {
  if (!globalThis.__ROOT__) {
    globalThis.__ROOT__ = createRoot(rootElement);
  }
  globalThis.__ROOT__.render(<App />);
}
