import "./global.css";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot, Root } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import NotFound from "./pages/NotFound";
import BottomNavLayout from "./components/BottomNavLayout";

const queryClient = new QueryClient();

declare global {
  var __ROOT__: Root | undefined;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BottomNavLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/transactions" element={<AllTransactions />} />
            <Route path="/account/:accountId/transactions" element={<Transactions />} />
            <Route path="/account/:accountId/transactions/:transactionId" element={<TransactionDetail />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/accounts" element={<AccountsManagement />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
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
