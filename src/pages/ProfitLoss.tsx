import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Download } from "lucide-react";
import { useProfitLoss } from "@/hooks/useProfitLoss";
import { downloadCSV } from "@/lib/csvExport";
import { useRevenueOverTime, useExpensesByCategory } from "@/hooks/useDashboard";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(190, 70%, 45%)",
  "hsl(330, 60%, 50%)", "hsl(60, 70%, 45%)",
];

type FilterPreset = "this-month" | "last-month" | "this-year" | "custom";

function getDateRange(preset: FilterPreset): { startDate: string; endDate: string } {
  const now = new Date();
  if (preset === "this-month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
  }
  if (preset === "last-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
  }
  if (preset === "this-year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { startDate: start.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0] };
  }
  return { startDate: "", endDate: "" };
}

export default function ProfitLoss() {
  const { currentOrg, currency } = useApp();
  const orgId = currentOrg?.id;

  const [preset, setPreset] = useState<FilterPreset>("this-year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    return getDateRange(preset);
  }, [preset, customStart, customEnd]);

  const { data: pnl, isLoading } = useProfitLoss({
    orgId,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
  });

  const { data: revenueData = [] } = useRevenueOverTime(orgId);
  const { data: expenseCategories = [] } = useExpensesByCategory(orgId);

  const handleExport = () => {
    if (!pnl) return;
    downloadCSV("profit-and-loss.csv",
      ["Category", "Amount"],
      [["Revenue", pnl.revenue], ["Expenses", pnl.expenses], ["Net Profit", pnl.profit]]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profit & Loss</h1>
            <p className="text-sm text-muted-foreground mt-1">Revenue, expenses, and net profit</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!pnl}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          {(["this-month", "last-month", "this-year", "custom"] as FilterPreset[]).map((p) => (
            <Button key={p} variant={preset === p ? "default" : "outline"} size="sm" onClick={() => setPreset(p)}>
              {p === "this-month" ? "This Month" : p === "last-month" ? "Last Month" : p === "this-year" ? "This Year" : "Custom"}
            </Button>
          ))}
          {preset === "custom" && (
            <div className="flex gap-2 items-end">
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9" />
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : pnl ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(pnl.revenue, currency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(pnl.expenses, currency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${pnl.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {formatCurrency(pnl.profit, currency)}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue & Expenses Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
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
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ category }) => category}
                    >
                      {expenseCategories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
