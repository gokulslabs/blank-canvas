import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { formatCurrency } from "@/lib/currency";
import {
  Wallet, TrendingUp, TrendingDown, FileText, Receipt, IndianRupee, ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboardData, useRevenueOverTime, useExpensesByCategory } from "@/hooks/useDashboard";
import { useInvoices } from "@/hooks/useInvoices";
import { useExpenses } from "@/hooks/useExpenses";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

const COLORS = [
  "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(190, 70%, 45%)",
];

function StatCard({
  title, value, icon: Icon, trend,
}: {
  title: string; value: string; icon: React.ElementType; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", trend === "up" && "text-green-600", trend === "down" && "text-destructive", !trend && "text-muted-foreground")} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Financial overview for {currentOrg?.name}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={formatCurrency(data.totalRevenue, currency)} icon={TrendingUp} trend="up" />
          <StatCard title="Total Expenses" value={formatCurrency(data.totalExpenses, currency)} icon={TrendingDown} trend="down" />
          <StatCard title="Net Profit" value={formatCurrency(data.profit, currency)} icon={currency === "INR" ? IndianRupee : Wallet} trend={data.profit >= 0 ? "up" : "down"} />
          <StatCard title="Cash Balance" value={formatCurrency(data.cashBalance, currency)} icon={Wallet} trend={data.cashBalance >= 0 ? "up" : "down"} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Invoices" value={String(data.invoiceCount)} icon={FileText} />
          <StatCard title="Expenses" value={String(data.expenseCount)} icon={Receipt} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reconciliation</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.reconciliationProgress}%</div>
              <Progress value={data.reconciliationProgress} className="mt-2 h-2" />
              {data.unreconciledCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{data.unreconciledCount} unreconciled</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 51%)" strokeWidth={2} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={expenseCategories}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
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

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-muted-foreground text-xs">{inv.customerName}</p>
                      </div>
                      <span className="font-medium">{formatCurrency(inv.total, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Expenses</CardTitle></CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{exp.vendorName}</p>
                        <p className="text-muted-foreground text-xs">{exp.category}</p>
                      </div>
                      <span className="font-medium text-destructive">-{formatCurrency(exp.amount, currency)}</span>
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
