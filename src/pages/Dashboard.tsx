import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import {
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "h-4 w-4",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            !trend && "text-muted-foreground"
          )}
        />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function Dashboard() {
  const { getDashboardData, invoices, expenses, currentOrg } = useApp();
  const data = getDashboardData();

  const recentInvoices = invoices.slice(-5).reverse();
  const recentExpenses = expenses.slice(-5).reverse();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Financial overview for {currentOrg?.name}
          </p>
        </div>

        {/* Stats Grid */}
        {/* Ledger-derived stats — all figures come from journal lines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.totalRevenue)}
            icon={TrendingUp}
            trend="up"
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(data.totalExpenses)}
            icon={TrendingDown}
            trend="down"
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(data.profit)}
            icon={DollarSign}
            trend={data.profit >= 0 ? "up" : "down"}
          />
          <StatCard
            title="Cash Balance"
            value={formatCurrency(data.cashBalance)}
            icon={Wallet}
            trend={data.cashBalance >= 0 ? "up" : "down"}
          />
        </div>

        {/* Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Invoices"
            value={String(data.invoiceCount)}
            icon={FileText}
          />
          <StatCard
            title="Expenses"
            value={String(data.expenseCount)}
            icon={Receipt}
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No invoices yet. Create your first invoice.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium">{inv.invoiceNumber}</p>
                        <p className="text-muted-foreground text-xs">
                          {inv.customerName}
                        </p>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(inv.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No expenses yet. Record your first expense.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium">{exp.vendorName}</p>
                        <p className="text-muted-foreground text-xs">
                          {exp.category}
                        </p>
                      </div>
                      <span className="font-medium text-destructive">
                        -{formatCurrency(exp.amount)}
                      </span>
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
