import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { usePayments, useCreatePayment } from "@/hooks/usePayments";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard, Banknote, Smartphone, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const METHOD_META: Record<string, { label: string; icon: React.ElementType }> = {
  cash: { label: "Cash", icon: Banknote },
  bank: { label: "Bank Transfer", icon: CreditCard },
  upi: { label: "UPI", icon: Smartphone },
};

export default function Payments() {
  const { currentOrg, loading, currency } = useApp();
  const orgId = currentOrg?.id;
  const { data: payments = [], isLoading } = usePayments(orgId);
  const { data: invoices = [] } = useInvoices(orgId);
  const createPayment = useCreatePayment(orgId);

  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank" | "upi">("bank");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const unpaidInvoices = invoices.filter((inv) => inv.status !== "paid");
  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);

  const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

  const handleSelectInvoice = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) setAmount(String(inv.total));
  };

  const handleSubmit = () => {
    if (!invoiceId || !amount || Number(amount) <= 0) return;
    createPayment.mutate(
      { invoiceId, amount: Number(amount), method, date, notes: notes || undefined },
      { onSuccess: () => { setOpen(false); resetForm(); } }
    );
  };

  const resetForm = () => {
    setInvoiceId("");
    setAmount("");
    setMethod("bank");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
  };

  if (loading || isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
            <p className="text-sm text-muted-foreground mt-1">Track and record payments against invoices</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" /> Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Invoice</Label>
                  <Select value={invoiceId} onValueChange={handleSelectInvoice}>
                    <SelectTrigger><SelectValue placeholder="Select invoice..." /></SelectTrigger>
                    <SelectContent>
                      {unpaidInvoices.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                          No unpaid invoices
                        </div>
                      ) : (
                        unpaidInvoices.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.invoiceNumber} — {inv.customerName} ({formatCurrency(inv.total, currency)})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedInvoice && (
                    <p className="text-xs text-muted-foreground">
                      Invoice total: {formatCurrency(selectedInvoice.total, currency)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["cash", "bank", "upi"] as const).map((m) => {
                      const meta = METHOD_META[m];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors",
                            method === m
                              ? "border-primary bg-accent text-primary"
                              : "border-border hover:bg-accent/50 text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payment reference, transaction ID..."
                    className="h-11"
                  />
                </div>

                <Button
                  className="w-full h-11"
                  onClick={handleSubmit}
                  disabled={!invoiceId || !amount || Number(amount) <= 0 || createPayment.isPending}
                >
                  {createPayment.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No payments recorded</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Record a payment against an invoice to get started</p>
              </div>
            ) : (
            {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => {
                      const inv = invoiceMap.get(p.invoiceId);
                      const meta = METHOD_META[p.method] || METHOD_META.bank;
                      const Icon = meta.icon;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{format(new Date(p.date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="font-medium text-sm">{inv?.invoiceNumber || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv?.customerName || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              {meta.label}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm text-emerald-600">
                            +{formatCurrency(p.amount, currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {payments.map((p) => {
                  const inv = invoiceMap.get(p.invoiceId);
                  const meta = METHOD_META[p.method] || METHOD_META.bank;
                  const Icon = meta.icon;
                  return (
                    <div key={p.id} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{inv?.invoiceNumber || "—"}</span>
                        <span className="font-semibold text-sm text-emerald-600">+{formatCurrency(p.amount, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{inv?.customerName || "—"}</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.date), "dd MMM yyyy")}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
