import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { formatCurrency } from "@/lib/currency";
import {
  TrendingUp, TrendingDown, FileText, Receipt, ArrowRight,
  ArrowLeftRight, Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardData, useRevenueOverTime, useExpensesByCategory } from "@/hooks/useDashboard";
import { useInvoices } from "@/hooks/useInvoices";
import { useExpenses } from "@/hooks/useExpenses";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

const COLORS = [
  "hsl(228, 76%, 52%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(190, 70%, 45%)",
];

function StatCard({
  title, value, icon: Icon, trend, subtitle,
}: {
  title: string; value: string; icon: React.ElementType; trend?: "up" | "down"; subtitle?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center",
            trend === "up" && "bg-emerald-50 text-emerald-600",
            trend === "down" && "bg-red-50 text-red-500",
            !trend && "bg-accent text-primary"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { currentOrg, loading, currency } = useApp();
  const orgId = currentOrg?.id;
  const { data, isLoading: dashLoading } = useDashboardData(orgId);
  const { data: invoices = [] } = useInvoices(orgId);
  const { data: expenses = [] } = useExpenses(orgId);
  const { data: revenueData = [] } = useRevenueOverTime(orgId);
  const { data: expenseCategories = [] } = useExpensesByCategory(orgId);

  const recentInvoices = invoices.slice(-5).reverse();
  const recentExpenses = expenses.slice(-5).reverse();

  if (loading || dashLoading || !data) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <PWAInstallBanner />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Financial overview for {currentOrg?.name}</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Revenue" value={formatCurrency(data.totalRevenue, currency)} icon={TrendingUp} trend="up" subtitle={`${data.invoiceCount} invoices`} />
          <StatCard title="Expenses" value={formatCurrency(data.totalExpenses, currency)} icon={TrendingDown} trend="down" subtitle={`${data.expenseCount} entries`} />
          <StatCard title="Net Profit" value={formatCurrency(data.profit, currency)} icon={data.profit >= 0 ? TrendingUp : TrendingDown} trend={data.profit >= 0 ? "up" : "down"} />
          <StatCard title="Cash Balance" value={formatCurrency(data.cashBalance, currency)} icon={Wallet} />
        </div>

        {/* Reconciliation bar */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Reconciliation Progress</span>
              </div>
              <span className="text-sm font-bold">{data.reconciliationProgress}%</span>
            </div>
            <Progress value={data.reconciliationProgress} className="h-2" />
            {data.unreconciledCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{data.unreconciledCount} transactions pending</p>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Create invoices and expenses to see trends</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Receipt className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No expenses yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add expenses to see category breakdown</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={expenseCategories}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {expenseCategories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Recent Invoices</CardTitle>
              <Link to="/app/invoices">
                <Button variant="ghost" size="sm" className="h-7 text-xs">View all <ArrowRight className="ml-1 h-3 w-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <FileText className="h-6 w-6 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{inv.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(inv.total, currency)}</p>
                        <span className={cn(
                          "text-[10px] font-medium uppercase tracking-wide",
                          inv.status === "paid" && "text-emerald-600",
                          inv.status === "sent" && "text-primary",
                          inv.status === "draft" && "text-muted-foreground"
                        )}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Recent Expenses</CardTitle>
              <Link to="/app/expenses">
                <Button variant="ghost" size="sm" className="h-7 text-xs">View all <ArrowRight className="ml-1 h-3 w-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Receipt className="h-6 w-6 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No expenses yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-medium">{exp.vendorName}</p>
                        <p className="text-xs text-muted-foreground">{exp.category}</p>
                      </div>
                      <p className="text-sm font-semibold text-red-500">-{formatCurrency(exp.amount, currency)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
