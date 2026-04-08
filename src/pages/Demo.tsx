import { useState } from "react";
import { Link } from "react-router-dom";
import { useDemo } from "@/context/DemoContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, FileText, Receipt, Wallet,
  ArrowLeftRight, AlertTriangle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function DemoBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 text-sm flex items-center gap-2 rounded-lg mb-6">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="font-medium">You're in demo mode</span>
      <span className="text-amber-600">— data will not be saved.</span>
      <Link to="/signup" className="ml-auto">
        <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
          Sign up free
        </Button>
      </Link>
    </div>
  );
}

export default function Demo() {
  const { invoices, expenses, dashboardData: data, currency, orgName } = useDemo();
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* Simple top bar for demo */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <Link to="/" className="font-bold text-sm tracking-tight">Yoho-Books</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Demo: {orgName}</span>
          <Link to="/signup">
            <Button size="sm">Sign Up Free</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <DemoBanner />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Revenue" value={formatCurrency(data.totalRevenue, currency)} icon={TrendingUp} trend="up" />
                <StatCard title="Expenses" value={formatCurrency(data.totalExpenses, currency)} icon={TrendingDown} trend="down" />
                <StatCard title="Net Profit" value={formatCurrency(data.profit, currency)} icon={TrendingUp} trend="up" />
                <StatCard title="Cash Balance" value={formatCurrency(data.cashBalance, currency)} icon={Wallet} />
              </div>
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Invoices ({invoices.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.customerName}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.total, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Expenses ({expenses.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.vendorName}</TableCell>
                        <TableCell>{exp.category}</TableCell>
                        <TableCell className="text-muted-foreground">{exp.date}</TableCell>
                        <TableCell className="text-right font-medium text-red-500">-{formatCurrency(exp.amount, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: { title: string; value: string; icon: React.ElementType; trend?: "up" | "down" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
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
