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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, CheckCircle, ChevronLeft, ChevronRight, Download, AlertCircle } from "lucide-react";
import { Invoice, LineItem } from "@/types/accounting";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useMarkInvoicePaid } from "@/hooks/useInvoices";
import { Skeleton } from "@/components/ui/skeleton";
import { generateInvoicePDF } from "@/lib/invoicePdf";
import { INDIAN_STATES, VALID_GST_RATES, isValidGSTIN, calculateGST, classifyB2BorB2C } from "@/lib/gst";

const PAGE_SIZE = 10;

function InvoiceForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: {
    customerName: string;
    taxRate: string;
    lineItems: { name: string; price: string; quantity: string; hsnCode?: string }[];
    customerGstin?: string;
    placeOfSupply?: string;
    isInterstate?: boolean;
  };
  onSubmit: (data: {
    customerName: string;
    taxRate: number;
    lineItems: Omit<LineItem, "id" | "total">[];
    customerGstin?: string;
    placeOfSupply?: string;
    isInterstate?: boolean;
  }) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [customerName, setCustomerName] = useState(initial?.customerName || "");
  const [taxRate, setTaxRate] = useState(initial?.taxRate || "18");
  const [lineItems, setLineItems] = useState(initial?.lineItems || [{ name: "", price: "", quantity: "1", hsnCode: "" }]);
  const [customerGstin, setCustomerGstin] = useState(initial?.customerGstin || "");
  const [placeOfSupply, setPlaceOfSupply] = useState(initial?.placeOfSupply || "");
  const [isInterstate, setIsInterstate] = useState(initial?.isInterstate || false);
  const [gstinError, setGstinError] = useState("");

  const addLineItem = () => setLineItems([...lineItems, { name: "", price: "", quantity: "1", hsnCode: "" }]);
  const removeLineItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));
  const updateLineItem = (idx: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setLineItems(updated);
  };

  // Auto-calculate preview
  const preview = useMemo(() => {
    const items = lineItems.filter((li) => li.name && li.price);
    const subtotal = items.reduce((s, li) => s + (parseFloat(li.price) || 0) * (parseInt(li.quantity) || 1), 0);
    const rate = parseFloat(taxRate) || 0;
    const gst = calculateGST(subtotal, rate, isInterstate);
    return { subtotal, ...gst, total: subtotal + gst.totalTax };
  }, [lineItems, taxRate, isInterstate]);

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase();
    setCustomerGstin(upper);
    if (upper && !isValidGSTIN(upper)) {
      setGstinError("Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)");
    } else {
      setGstinError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || submitting) return;
    if (customerGstin && !isValidGSTIN(customerGstin)) return;
    const items = lineItems
      .filter((li) => li.name && li.price)
      .map((li) => ({
        name: li.name,
        price: parseFloat(li.price) || 0,
        quantity: parseInt(li.quantity) || 1,
        hsnCode: li.hsnCode || undefined,
      }));
    if (items.length === 0) return;
    onSubmit({
      customerName: customerName.trim(),
      lineItems: items,
      taxRate: parseFloat(taxRate) || 0,
      customerGstin: customerGstin.trim() || undefined,
      placeOfSupply: placeOfSupply || undefined,
      isInterstate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-auto pr-1">
      <div>
        <Label>Customer Name</Label>
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" required />
      </div>

      {/* GST Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Customer GSTIN</Label>
          <Input
            value={customerGstin}
            onChange={(e) => handleGstinChange(e.target.value)}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
            className={gstinError ? "border-destructive" : ""}
          />
          {gstinError && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {gstinError}
            </p>
          )}
          {customerGstin && !gstinError && (
            <p className="text-xs text-muted-foreground mt-1">
              {classifyB2BorB2C(customerGstin) === "B2B" ? "🏢 B2B Transaction" : "🛒 B2C Transaction"}
            </p>
          )}
        </div>
        <div>
          <Label>Place of Supply</Label>
          <Select value={placeOfSupply} onValueChange={(v) => setPlaceOfSupply(v)}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {INDIAN_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
        <input
          type="checkbox"
          checked={isInterstate}
          onChange={(e) => setIsInterstate(e.target.checked)}
          id="interstate"
          className="rounded border-input"
        />
        <Label htmlFor="interstate" className="text-sm cursor-pointer font-normal">
          Inter-state supply → {isInterstate ? <span className="font-medium text-primary">IGST applies</span> : <span className="font-medium">CGST + SGST applies</span>}
        </Label>
      </div>

      <div className="space-y-3">
        <Label>Line Items</Label>
        {lineItems.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input placeholder="Item name" value={item.name} onChange={(e) => updateLineItem(idx, "name", e.target.value)} />
              </div>
              <div className="w-24">
                <Input placeholder="HSN" value={item.hsnCode || ""} onChange={(e) => updateLineItem(idx, "hsnCode", e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="w-16">
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
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addLineItem}>+ Add Item</Button>
      </div>

      <div className="w-40">
        <Label>GST Rate</Label>
        <Select value={taxRate} onValueChange={setTaxRate}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {VALID_GST_RATES.map((r) => (
              <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Live Tax Preview */}
      {preview.subtotal > 0 && (
        <div className="rounded-md border p-3 space-y-1 text-sm bg-muted/30">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{preview.subtotal.toFixed(2)}</span></div>
          {isInterstate ? (
            <div className="flex justify-between"><span className="text-muted-foreground">IGST ({taxRate}%)</span><span>{preview.igst.toFixed(2)}</span></div>
          ) : (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">CGST ({(parseFloat(taxRate) || 0) / 2}%)</span><span>{preview.cgst.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SGST ({(parseFloat(taxRate) || 0) / 2}%)</span><span>{preview.sgst.toFixed(2)}</span></div>
            </>
          )}
          <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{preview.total.toFixed(2)}</span></div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={submitting || !!gstinError}>
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

function InvoiceDetail({ invoice, currency, orgName, onEdit, onDelete, onMarkPaid, markingPaid }: {
  invoice: Invoice;
  currency: string;
  orgName: string;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  markingPaid: boolean;
}) {
  const classification = classifyB2BorB2C(invoice.customerGstin);

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
            <Badge variant="outline" className="text-xs">{classification}</Badge>
          </div>
          {invoice.customerGstin && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">GSTIN</span>
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{invoice.customerGstin}</span>
            </div>
          )}
          {invoice.placeOfSupply && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Place of Supply</span>
              <span>{invoice.placeOfSupply}</span>
              <Badge variant="outline" className="text-xs">
                {invoice.isInterstate ? "Inter-state" : "Intra-state"}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => generateInvoicePDF(invoice, orgName, currency as any)}>
            <Download className="h-3 w-3 mr-1" /> PDF
          </Button>
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
              <TableHead>HSN</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((li) => (
              <TableRow key={li.id}>
                <TableCell>{li.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{li.hsnCode || "—"}</TableCell>
                <TableCell className="text-right">{li.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(li.price, currency as any)}</TableCell>
                <TableCell className="text-right">{formatCurrency(li.total, currency as any)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* GST Breakdown */}
      <div className="rounded-md border p-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(invoice.subtotal, currency as any)}</span>
        </div>
        {invoice.isInterstate ? (
          <div className="flex justify-between text-primary">
            <span>IGST ({invoice.taxRate}%)</span>
            <span>{formatCurrency(invoice.igstAmount || 0, currency as any)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-primary">
              <span>CGST ({invoice.taxRate / 2}%)</span>
              <span>{formatCurrency(invoice.cgstAmount || 0, currency as any)}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span>SGST ({invoice.taxRate / 2}%)</span>
              <span>{formatCurrency(invoice.sgstAmount || 0, currency as any)}</span>
            </div>
          </>
        )}
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
      <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
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

  const handleCreate = async (data: {
    customerName: string;
    taxRate: number;
    lineItems: Omit<LineItem, "id" | "total">[];
    customerGstin?: string;
    placeOfSupply?: string;
    isInterstate?: boolean;
  }) => {
    await createMutation.mutateAsync(data);
    setCreateOpen(false);
    setPage(1);
  };

  const handleUpdate = async (data: {
    customerName: string;
    taxRate: number;
    lineItems: Omit<LineItem, "id" | "total">[];
    customerGstin?: string;
    placeOfSupply?: string;
    isInterstate?: boolean;
  }) => {
    if (!editInvoice) return;
    const lineItems: LineItem[] = data.lineItems.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      total: item.price * item.quantity,
    }));
    const subtotal = lineItems.reduce((s, li) => s + li.total, 0);

    const gst = calculateGST(subtotal, data.taxRate, data.isInterstate || false);
    const total = subtotal + gst.totalTax;

    await updateMutation.mutateAsync({
      ...editInvoice,
      customerName: data.customerName,
      lineItems,
      taxRate: data.taxRate,
      subtotal,
      taxAmount: gst.totalTax,
      total,
      customerGstin: data.customerGstin,
      placeOfSupply: data.placeOfSupply,
      isInterstate: data.isInterstate,
      cgstAmount: gst.cgst,
      sgstAmount: gst.sgst,
      igstAmount: gst.igst,
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
                      <TableHead>Type</TableHead>
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
                          <Badge variant="outline" className="text-xs">
                            {classifyB2BorB2C(inv.customerGstin)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.total, inv.currency || currency)}</TableCell>
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
                currency={detailInvoice.currency || currency}
                orgName={currentOrg?.name || "My Business"}
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
                    hsnCode: li.hsnCode,
                  })),
                  customerGstin: editInvoice.customerGstin,
                  placeOfSupply: editInvoice.placeOfSupply,
                  isInterstate: editInvoice.isInterstate,
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
