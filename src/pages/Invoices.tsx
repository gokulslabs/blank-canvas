import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Invoice } from "@/types/accounting";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{invoice.invoiceNumber}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Customer</span>
          <span className="font-medium">{invoice.customerName}</span>
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
                  <TableCell className="text-right">
                    {formatCurrency(li.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(li.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-1 text-sm text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Tax ({invoice.taxRate}%)
            </span>
            <span>{formatCurrency(invoice.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

export default function Invoices() {
  const { invoices, addInvoice, currentOrg } = useApp();
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [lineItems, setLineItems] = useState([
    { name: "", price: "", quantity: "1" },
  ]);

  const orgInvoices = invoices.filter(
    (i) => i.organizationId === currentOrg?.id
  );

  const addLineItem = () =>
    setLineItems([...lineItems, { name: "", price: "", quantity: "1" }]);

  const removeLineItem = (idx: number) =>
    setLineItems(lineItems.filter((_, i) => i !== idx));

  const updateLineItem = (
    idx: number,
    field: string,
    value: string
  ) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setLineItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const items = lineItems
      .filter((li) => li.name && li.price)
      .map((li) => ({
        name: li.name,
        price: parseFloat(li.price) || 0,
        quantity: parseInt(li.quantity) || 1,
      }));

    if (items.length === 0) return;

    addInvoice({
      customerName: customerName.trim(),
      lineItems: items,
      taxRate: parseFloat(taxRate) || 0,
    });

    // Reset form
    setCustomerName("");
    setTaxRate("0");
    setLineItems([{ name: "", price: "", quantity: "1" }]);
    setOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your invoices
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Line Items</Label>
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) =>
                            updateLineItem(idx, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(idx, "quantity", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.price}
                          onChange={(e) =>
                            updateLineItem(idx, "price", e.target.value)
                          }
                        />
                      </div>
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                  >
                    + Add Item
                  </Button>
                </div>

                <div className="w-32">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Create Invoice
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {orgInvoices.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p>No invoices yet. Create your first invoice to get started.</p>
              </div>
            ) : (
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
                  {orgInvoices
                    .slice()
                    .reverse()
                    .map((inv) => (
                      <Dialog key={inv.id}>
                        <DialogTrigger asChild>
                          <TableRow className="cursor-pointer">
                            <TableCell className="font-medium">
                              {inv.invoiceNumber}
                            </TableCell>
                            <TableCell>{inv.customerName}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  inv.status === "paid"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(inv.total)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        </DialogTrigger>
                        <InvoiceDetail invoice={inv} />
                      </Dialog>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
