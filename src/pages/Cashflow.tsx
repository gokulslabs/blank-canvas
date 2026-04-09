import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { formatCurrency } from "@/lib/currency";
import { useInvoices } from "@/hooks/useInvoices";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function Cashflow() {
  const { currentOrg, currency, loading } = useApp();
  const orgId = currentOrg?.id;
  const { data: invoices = [], isLoading: invLoading } = useInvoices(orgId);
  const { data: expenses = [], isLoading: expLoading } = useExpenses(orgId);
  const { data: payments = [] } = usePayments(orgId);

  const analysis = useMemo(() => {
    const unpaidInvoices = invoices.filter((inv) => inv.status !== "paid");
    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const expectedInflows = unpaidInvoices.reduce((s, inv) => s + (inv.amountDue ?? inv.total), 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netPosition = totalReceived - totalExpenses;

    // Group by month
    const monthMap = new Map<string, { inflows: number; outflows: number }>();
    payments.forEach((p) => {
      const m = format(new Date(p.date), "MMM yyyy");
      const entry = monthMap.get(m) || { inflows: 0, outflows: 0 };
      entry.inflows += p.amount;
      monthMap.set(m, entry);
    });
    expenses.forEach((e) => {
      const m = format(new Date(e.date), "MMM yyyy");
      const entry = monthMap.get(m) || { inflows: 0, outflows: 0 };
      entry.outflows += e.amount;
      monthMap.set(m, entry);
    });
    const chartData = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data, net: data.inflows - data.outflows }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return { totalReceived, expectedInflows, totalExpenses, netPosition, unpaidInvoices, chartData };
  }, [invoices, expenses, payments]);

  if (loading || invLoading || expLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash Flow</h1>
          <p className="text-sm text-muted-foreground mt-1">Track money in and out</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Received</p>
                  <p className="text-2xl font-bold tracking-tight text-emerald-600">{formatCurrency(analysis.totalReceived, currency)}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expected</p>
                  <p className="text-2xl font-bold tracking-tight text-primary">{formatCurrency(analysis.expectedInflows, currency)}</p>
                  <p className="text-xs text-muted-foreground">{analysis.unpaidInvoices.length} unpaid invoices</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spent</p>
                  <p className="text-2xl font-bold tracking-tight text-red-500">{formatCurrency(analysis.totalExpenses, currency)}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
                  <ArrowUpCircle className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Position</p>
                  <p className={`text-2xl font-bold tracking-tight ${analysis.netPosition >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(analysis.netPosition, currency)}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {analysis.chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monthly Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analysis.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                  <Bar dataKey="inflows" name="Inflows" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflows" name="Outflows" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Unpaid invoices */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Expected Inflows (Unpaid Invoices)</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.unpaidInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All invoices are paid 🎉</p>
            ) : (
              <div className="space-y-2">
                {analysis.unpaidInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{inv.invoiceNumber} — {inv.customerName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(inv.amountDue ?? inv.total, currency)}</p>
                      <Badge variant="secondary" className="text-[10px]">{inv.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
