import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Receipt, Building2, ChevronDown,
  ArrowLeftRight, BarChart3, BookOpen, Layers, Clock, List,
  IndianRupee, Scale, Zap, X, Users, CreditCard, TrendingUp,
  PiggyBank, Building,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ALL_CURRENCIES, CurrencyCode } from "@/lib/currency";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { organizationRepo } from "@/repositories/organizationRepo";
import { toast } from "sonner";

const mainNav = [
  { label: "Dashboard", path: "/app", icon: LayoutDashboard },
  { label: "Invoices", path: "/app/invoices", icon: FileText },
  { label: "Payments", path: "/app/payments", icon: CreditCard },
  { label: "Expenses", path: "/app/expenses", icon: Receipt },
  { label: "Cash Flow", path: "/app/cashflow", icon: TrendingUp },
  { label: "Budgets", path: "/app/budgets", icon: PiggyBank },
  { label: "Assets", path: "/app/assets", icon: Building },
  { label: "Accounts", path: "/app/accounts", icon: List },
];

const reportNav = [
  { label: "Profit & Loss", path: "/app/reports/profit-loss", icon: BarChart3 },
  { label: "Balance Sheet", path: "/app/reports/balance-sheet", icon: BookOpen },
  { label: "General Ledger", path: "/app/reports/general-ledger", icon: Layers },
  { label: "Trial Balance", path: "/app/reports/trial-balance", icon: Scale },
  { label: "AR Aging", path: "/app/reports/ar-aging", icon: Clock },
  { label: "GST Report", path: "/app/reports/gst", icon: IndianRupee },
];

const otherNav = [
  { label: "Reconciliation", path: "/app/reconciliation", icon: ArrowLeftRight },
  { label: "Team", path: "/app/team", icon: Users },
];

function NavSection({ items, label }: { items: typeof mainNav; label?: string }) {
  const location = useLocation();
  return (
    <div>
      {label && (
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{label}</p>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const { currentOrg, organizations, switchOrganization, createOrganization } = useApp();
  const [newOrgName, setNewOrgName] = useState("");
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [newOrgCurrency, setNewOrgCurrency] = useState<CurrencyCode>("INR");

  const handleCreateOrg = () => {
    if (newOrgName.trim()) {
      createOrganization(newOrgName.trim(), newOrgCurrency);
      setNewOrgName("");
      setShowNewOrg(false);
      setNewOrgCurrency("INR");
    }
  };

  const handleCurrencyChange = async (cur: CurrencyCode) => {
    if (!currentOrg) return;
    try {
      await organizationRepo.updateCurrency(currentOrg.id, cur);
      window.location.reload();
    } catch {
      toast.error("Failed to update currency");
    }
  };

  return (
    <aside className="w-64 border-r border-border bg-background flex flex-col h-screen">
      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        <Link to="/app" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm tracking-tight">Yoho-Books</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Org switcher */}
      <div className="px-3 py-3 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg hover:bg-accent transition-colors text-sm">
              <div className="h-6 w-6 rounded bg-accent flex items-center justify-center text-[10px] font-bold text-primary">
                {currentOrg?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <span className="flex-1 text-left truncate text-xs font-medium">{currentOrg?.name || "Loading..."}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrganization(org.id)}
                className={cn(org.id === currentOrg?.id && "bg-accent font-medium")}
              >
                <span className="flex-1">{org.name}</span>
                <span className="text-xs text-muted-foreground">{org.currency}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {showNewOrg ? (
              <div className="p-2 space-y-2">
                <Input
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
                />
                <Select value={newOrgCurrency} onValueChange={(v) => setNewOrgCurrency(v as CurrencyCode)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 text-xs w-full" onClick={handleCreateOrg}>Create</Button>
              </div>
            ) : (
              <DropdownMenuItem onClick={() => setShowNewOrg(true)}>
                + New Organization
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground mb-1">Base Currency</p>
              <Select value={currentOrg?.currency || "INR"} onValueChange={(v) => handleCurrencyChange(v as CurrencyCode)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-5 overflow-auto">
        <NavSection items={mainNav} />
        <NavSection items={reportNav} label="Reports" />
        <NavSection items={otherNav} label="Settings" />
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground">Yoho-Books v3.0</p>
      </div>
    </aside>
  );
}
