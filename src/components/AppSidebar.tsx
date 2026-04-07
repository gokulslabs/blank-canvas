import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Receipt, Building2, ChevronDown, Scale,
  ArrowLeftRight, BarChart3, BookOpen, Layers, Clock, List, LogOut,
  IndianRupee,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
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

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Invoices", path: "/invoices", icon: FileText },
  { label: "Expenses", path: "/expenses", icon: Receipt },
  { label: "Accounts", path: "/accounts", icon: List },
  { label: "Profit & Loss", path: "/reports/profit-loss", icon: BarChart3 },
  { label: "Balance Sheet", path: "/reports/balance-sheet", icon: BookOpen },
  { label: "General Ledger", path: "/reports/general-ledger", icon: Layers },
  { label: "Trial Balance", path: "/reports/trial-balance", icon: Scale },
  { label: "AR Aging", path: "/reports/ar-aging", icon: Clock },
  { label: "GST Report", path: "/reports/gst", icon: IndianRupee },
  { label: "Reconciliation", path: "/reconciliation", icon: ArrowLeftRight },
];

export function AppSidebar() {
  const location = useLocation();
  const { currentOrg, organizations, switchOrganization, createOrganization } = useApp();
  const { signOut, user } = useAuth();
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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col h-screen shrink-0">
      <div className="p-4 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="flex-1 text-left truncate">{currentOrg?.name || "Loading..."}</span>
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

      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">LedgerFlow v3.0</p>
      </div>
    </aside>
  );
}
