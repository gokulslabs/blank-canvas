import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider, useApp } from "@/context/AppContext";
import { DemoProvider } from "@/context/DemoContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Payments from "./pages/Payments";
import Cashflow from "./pages/Cashflow";
import Budgets from "./pages/Budgets";
import Assets from "./pages/Assets";
import TrialBalance from "./pages/TrialBalance";
import Reconciliation from "./pages/Reconciliation";
import ProfitLoss from "./pages/ProfitLoss";
import BalanceSheet from "./pages/BalanceSheet";
import GeneralLedger from "./pages/GeneralLedger";
import ARAging from "./pages/ARAging";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import GSTReport from "./pages/GSTReport";
import TeamMembers from "./pages/TeamMembers";
import Onboarding from "./pages/Onboarding";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { currentOrg, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentOrg && location.pathname !== "/app/onboarding") {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppProvider>
      <OnboardingGate>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/cashflow" element={<Cashflow />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/accounts" element={<ChartOfAccounts />} />
          <Route path="/reports/trial-balance" element={<TrialBalance />} />
          <Route path="/reports/profit-loss" element={<ProfitLoss />} />
          <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
          <Route path="/reports/general-ledger" element={<GeneralLedger />} />
          <Route path="/reports/ar-aging" element={<ARAging />} />
          <Route path="/reports/gst" element={<GSTReport />} />
          <Route path="/reconciliation" element={<Reconciliation />} />
          <Route path="/team" element={<TeamMembers />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </OnboardingGate>
    </AppProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <Auth />;
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicRoute />} />
            <Route path="/login" element={<AuthRoute />} />
            <Route path="/signup" element={<AuthRoute />} />
            <Route path="/demo" element={<DemoProvider><Demo /></DemoProvider>} />
            <Route path="/app/*" element={<ProtectedRoutes />} />
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/invoices" element={<Navigate to="/app/invoices" replace />} />
            <Route path="/expenses" element={<Navigate to="/app/expenses" replace />} />
            <Route path="/reconciliation" element={<Navigate to="/app/reconciliation" replace />} />
            <Route path="/team" element={<Navigate to="/app/team" replace />} />
            <Route path="/accounts" element={<Navigate to="/app/accounts" replace />} />
            <Route path="/reports/*" element={<Navigate to="/app/reports" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
