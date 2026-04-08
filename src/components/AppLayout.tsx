import { AppSidebar } from "@/components/AppSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown, Menu, X, LayoutDashboard, FileText, Receipt, CreditCard, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

const bottomNavItems = [
  { label: "Home", path: "/app", icon: LayoutDashboard },
  { label: "Invoices", path: "/app/invoices", icon: FileText },
  { label: "Payments", path: "/app/payments", icon: CreditCard },
  { label: "Expenses", path: "/app/expenses", icon: Receipt },
  { label: "More", path: "__more__", icon: MoreHorizontal },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { currentOrg } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const handleSignOut = async () => {
    try { await signOut(); } catch { toast.error("Failed to sign out"); }
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-background flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1.5 rounded-md hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <GlobalSearch />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-sm hover:bg-accent rounded-md px-2 py-1.5 transition-colors">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:inline text-muted-foreground truncate max-w-[120px]">{user?.email}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">{currentOrg?.name}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border lg:hidden safe-area-bottom">
        <div className="flex items-stretch h-14">
          {bottomNavItems.map((item) => {
            if (item.path === "__more__") {
              return (
                <button
                  key="more"
                  onClick={() => setSidebarOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }
            const isActive = item.path === "/app" ? location.pathname === "/app" : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
