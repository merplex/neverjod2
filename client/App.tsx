import "./global.css";

import { useEffect, useState } from "react";
import { checkAndExecuteRepeats } from "./utils/repeatTransactionService";
import { syncAll } from "./utils/syncService";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { createRoot, Root } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OnboardingGuide from "./components/OnboardingGuide";

function ThemeProvider() {
  useEffect(() => {
    function apply() {
      try {
        const s = JSON.parse(localStorage.getItem("app_settings") || "{}");
        document.documentElement.setAttribute("data-theme", s.colorTheme || "blue");
      } catch {}
    }
    apply();
    window.addEventListener("storage", apply);
    return () => window.removeEventListener("storage", apply);
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
import NotFound from "./pages/NotFound";
import BottomNavLayout from "./components/BottomNavLayout";

const queryClient = new QueryClient();

declare global {
  var __ROOT__: Root | undefined;
}

function AppContent() {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(() => {
    try { return !localStorage.getItem("app_onboarding_done"); } catch { return false; }
  });

  useEffect(() => {
    checkAndExecuteRepeats();
    navigate("/", { replace: true });
    // Auto-sync on startup if logged in and premium
    const token = localStorage.getItem("cloud_token");
    if (token) syncAll(token).catch(() => {});
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const token = localStorage.getItem("cloud_token");
        if (token) syncAll(token).catch(() => {});
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
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showGuide && <OnboardingGuide onClose={() => setShowGuide(false)} />}
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
