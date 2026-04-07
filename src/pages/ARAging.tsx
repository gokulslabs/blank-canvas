import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useARAging } from "@/hooks/useARAging";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ARAging() {
  const { currentOrg, currency } = useApp();
  const { data, isLoading } = useARAging(currentOrg?.id);

  const chartData = data?.buckets.map((b) => ({
    name: b.label,
    amount: b.total,
  })) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Accounts Receivable Aging</h1>
          <p className="text-sm text-muted-foreground mt-1">Outstanding invoices by age</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : data ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {data.buckets.map((bucket) => (
                <Card key={bucket.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{bucket.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatCurrency(bucket.total, currency)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{bucket.invoices.length} invoice(s)</p>
                  </CardContent>
                </Card>
              ))}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-destructive">{formatCurrency(data.grandTotal, currency)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            {chartData.some((d) => d.amount > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aging Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Detail tables per bucket */}
            {data.buckets.map((bucket) => (
              bucket.invoices.length > 0 && (
                <Card key={bucket.label}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {bucket.label}
                      <Badge variant="secondary">{bucket.invoices.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bucket.invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                            <TableCell>{inv.customerName}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={inv.status === "sent" ? "default" : "secondary"}>{inv.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(inv.total, currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            ))}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
