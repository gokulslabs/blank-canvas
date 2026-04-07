import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Invoice, LineItem } from "@/types/accounting";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useMarkInvoicePaid } from "@/hooks/useInvoices";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 10;

function InvoiceForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: { customerName: string; taxRate: string; lineItems: { name: string; price: string; quantity: string }[] };
  onSubmit: (data: { customerName: string; taxRate: number; lineItems: Omit<LineItem, "id" | "total">[] }) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [customerName, setCustomerName] = useState(initial?.customerName || "");
  const [taxRate, setTaxRate] = useState(initial?.taxRate || "0");
  const [lineItems, setLineItems] = useState(initial?.lineItems || [{ name: "", price: "", quantity: "1" }]);

  const addLineItem = () => setLineItems([...lineItems, { name: "", price: "", quantity: "1" }]);
  const removeLineItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));
  const updateLineItem = (idx: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setLineItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || submitting) return;
    const items = lineItems
      .filter((li) => li.name && li.price)
      .map((li) => ({ name: li.name, price: parseFloat(li.price) || 0, quantity: parseInt(li.quantity) || 1 }));
    if (items.length === 0) return;
    onSubmit({ customerName: customerName.trim(), lineItems: items, taxRate: parseFloat(taxRate) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Customer Name</Label>
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" required />
      </div>
      <div className="space-y-3">
        <Label>Line Items</Label>
        {lineItems.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input placeholder="Item name" value={item.name} onChange={(e) => updateLineItem(idx, "name", e.target.value)} />
            </div>
            <div className="w-20">
              <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", e.target.value)} />
            </div>
            <div className="w-24">
              <Input type="number" step="0.01" placeholder="Price" value={item.price} onChange={(e) => updateLineItem(idx, "price", e.target.value)} />
            </div>
            {lineItems.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addLineItem}>+ Add Item</Button>
      </div>
      <div className="w-32">
        <Label>Tax Rate (%)</Label>
        <Input type="number" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

function InvoiceDetail({ invoice, currency, onEdit, onDelete, onMarkPaid, markingPaid }: {
  invoice: Invoice;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  markingPaid: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium">{invoice.customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>{invoice.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status !== "paid" && (
            <Button variant="outline" size="sm" onClick={onMarkPaid} disabled={markingPaid} className="text-green-600 border-green-300 hover:bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" /> {markingPaid ? "Processing..." : "Mark Paid"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {invoice.invoiceNumber} and reverse its journal entries.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((li) => (
              <TableRow key={li.id}>
                <TableCell>{li.name}</TableCell>
                <TableCell className="text-right">{li.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(li.price, currency as any)}</TableCell>
                <TableCell className="text-right">{formatCurrency(li.total, currency as any)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-1 text-sm text-right">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(invoice.subtotal, currency as any)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
          <span>{formatCurrency(invoice.taxAmount, currency as any)}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-2 border-t">
          <span>Total</span>
          <span>{formatCurrency(invoice.total, currency as any)}</span>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Invoices() {
  const { currentOrg, currency } = useApp();
  const orgId = currentOrg?.id;
  const { data: invoices = [], isLoading } = useInvoices(orgId);
  const createMutation = useCreateInvoice(orgId);
  const updateMutation = useUpdateInvoice(orgId);
  const deleteMutation = useDeleteInvoice(orgId);
  const markPaidMutation = useMarkInvoicePaid(orgId);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => invoices.slice().reverse(), [invoices]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  const handleCreate = async (data: { customerName: string; taxRate: number; lineItems: Omit<LineItem, "id" | "total">[] }) => {
    await createMutation.mutateAsync(data);
    setCreateOpen(false);
    setPage(1);
  };

  const handleUpdate = async (data: { customerName: string; taxRate: number; lineItems: Omit<LineItem, "id" | "total">[] }) => {
    if (!editInvoice) return;
    const lineItems: LineItem[] = data.lineItems.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      total: item.price * item.quantity,
    }));
    const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
    const taxAmount = subtotal * (data.taxRate / 100);
    const total = subtotal + taxAmount;

    await updateMutation.mutateAsync({
      ...editInvoice,
      customerName: data.customerName,
      lineItems,
      taxRate: data.taxRate,
      subtotal,
      taxAmount,
      total,
    });
    setEditInvoice(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setDetailInvoice(null);
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    await markPaidMutation.mutateAsync(invoice);
    setDetailInvoice(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your invoices {sorted.length > 0 && `(${sorted.length} total)`}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
              <InvoiceForm onSubmit={handleCreate} submitting={createMutation.isPending} submitLabel="Create Invoice" />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p>No invoices yet. Create your first invoice to get started.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((inv) => (
                      <TableRow key={inv.id} className="cursor-pointer" onClick={() => setDetailInvoice(inv)}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.customerName}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.total, currency)}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!detailInvoice && !editInvoice} onOpenChange={(open) => { if (!open) setDetailInvoice(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{detailInvoice?.invoiceNumber}</DialogTitle>
            </DialogHeader>
            {detailInvoice && (
              <InvoiceDetail
                invoice={detailInvoice}
                currency={currency}
                onEdit={() => setEditInvoice(detailInvoice)}
                onDelete={() => handleDelete(detailInvoice.id)}
                onMarkPaid={() => handleMarkPaid(detailInvoice)}
                markingPaid={markPaidMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editInvoice} onOpenChange={(open) => { if (!open) setEditInvoice(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit {editInvoice?.invoiceNumber}</DialogTitle></DialogHeader>
            {editInvoice && (
              <InvoiceForm
                initial={{
                  customerName: editInvoice.customerName,
                  taxRate: String(editInvoice.taxRate),
                  lineItems: editInvoice.lineItems.map((li) => ({
                    name: li.name,
                    price: String(li.price),
                    quantity: String(li.quantity),
                  })),
                }}
                onSubmit={handleUpdate}
                submitting={updateMutation.isPending}
                submitLabel="Save Changes"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
