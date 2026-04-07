import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import TrialBalance from "./pages/TrialBalance";
import Reconciliation from "./pages/Reconciliation";
import ProfitLoss from "./pages/ProfitLoss";
import BalanceSheet from "./pages/BalanceSheet";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports/trial-balance" element={<TrialBalance />} />
            <Route path="/reports/profit-loss" element={<ProfitLoss />} />
            <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
