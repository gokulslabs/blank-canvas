import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Invoices", path: "/invoices", icon: FileText },
  { label: "Expenses", path: "/expenses", icon: Receipt },
];

export function AppSidebar() {
  const location = useLocation();
  const { currentOrg, organizations, switchOrganization, createOrganization } =
    useApp();
  const [newOrgName, setNewOrgName] = useState("");
  const [showNewOrg, setShowNewOrg] = useState(false);

  const handleCreateOrg = () => {
    if (newOrgName.trim()) {
      createOrganization(newOrgName.trim());
      setNewOrgName("");
      setShowNewOrg(false);
    }
  };

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col h-screen shrink-0">
      {/* Organization Switcher */}
      <div className="p-4 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="flex-1 text-left truncate">
                {currentOrg?.name}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrganization(org.id)}
                className={cn(
                  org.id === currentOrg?.id && "bg-accent font-medium"
                )}
              >
                {org.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {showNewOrg ? (
              <div className="p-2 flex gap-2">
                <Input
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Org name"
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
                />
                <Button size="sm" className="h-8 text-xs" onClick={handleCreateOrg}>
                  Add
                </Button>
              </div>
            ) : (
              <DropdownMenuItem onClick={() => setShowNewOrg(true)}>
                + New Organization
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
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

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">LedgerFlow v1.0</p>
      </div>
    </aside>
  );
}
