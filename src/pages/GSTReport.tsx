import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { useGSTReport } from "@/hooks/useGSTReport";
import { downloadCSV } from "@/lib/csvExport";

export default function GSTReport() {
  const { currentOrg, currency } = useApp();
  const { data, isLoading } = useGSTReport(currentOrg?.id);
  const [filter, setFilter] = useState<"all" | "B2B" | "B2C">("all");

  const filteredInvoices = data?.invoices.filter(
    (inv) => filter === "all" || inv.classification === filter
  ) || [];

  const handleExportSales = () => {
    if (!data) return;
    const headers = [
      "Invoice #", "Date", "Customer", "GSTIN", "Place of Supply",
      "Type", "B2B/B2C", "Taxable Value", "CGST", "SGST", "IGST", "Total",
    ];
    const rows = data.invoices.map((inv) => [
      inv.invoiceNumber,
      new Date(inv.date).toLocaleDateString("en-IN"),
      inv.customerName,
      inv.customerGstin || "",
      inv.placeOfSupply || "",
      inv.isInterstate ? "Inter-state" : "Intra-state",
      inv.classification,
      inv.taxableValue,
      inv.cgst,
      inv.sgst,
      inv.igst,
      inv.total,
    ]);
    rows.push(["TOTAL", "", "", "", "", "", "",
      data.totalTaxableValue, data.totalCGST, data.totalSGST, data.totalIGST, data.totalTax,
    ]);
    downloadCSV("gst-sales-register.csv", headers, rows);
  };

  const handleExportHSN = () => {
    if (!data) return;
    const headers = ["HSN Code", "Description", "Quantity", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax"];
    const rows = data.hsnSummary.map((h) => [
      h.hsnCode, h.description, h.quantity, h.taxableValue.toFixed(2),
      h.cgst.toFixed(2), h.sgst.toFixed(2), h.igst.toFixed(2), h.totalTax.toFixed(2),
    ]);
    downloadCSV("gst-hsn-summary.csv", headers, rows);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">GST Summary</h1>
            <p className="text-sm text-muted-foreground mt-1">Tax breakdown for {currentOrg?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportSales} disabled={!data}>
              <Download className="h-4 w-4 mr-1" /> Sales Register
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportHSN} disabled={!data}>
              <Download className="h-4 w-4 mr-1" /> HSN Summary
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Taxable Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{formatCurrency(data.totalTaxableValue, currency)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">CGST</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{formatCurrency(data.totalCGST, currency)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">SGST</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{formatCurrency(data.totalSGST, currency)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">IGST</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{formatCurrency(data.totalIGST, currency)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total Tax</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-primary">{formatCurrency(data.totalTax, currency)}</div>
                </CardContent>
              </Card>
            </div>

            {/* B2B / B2C Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🏢 B2B Supplies
                    <Badge variant="outline">{data.b2bCount} invoices</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatCurrency(data.b2bValue, currency)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registered businesses with GSTIN</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🛒 B2C Supplies
                    <Badge variant="outline">{data.b2cCount} invoices</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatCurrency(data.b2cValue, currency)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Unregistered consumers</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="sales">
              <TabsList>
                <TabsTrigger value="sales">Sales Register</TabsTrigger>
                <TabsTrigger value="hsn">HSN Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="sales">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Sales Register</CardTitle>
                      <div className="flex gap-1">
                        {(["all", "B2B", "B2C"] as const).map((f) => (
                          <Button
                            key={f}
                            variant={filter === f ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter(f)}
                            className="text-xs h-7"
                          >
                            {f === "all" ? "All" : f}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredInvoices.length === 0 ? (
                      <p className="p-6 text-sm text-muted-foreground text-center">No invoices found</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>GSTIN</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Taxable</TableHead>
                            <TableHead className="text-right">CGST</TableHead>
                            <TableHead className="text-right">SGST</TableHead>
                            <TableHead className="text-right">IGST</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvoices.map((inv) => (
                            <TableRow key={inv.invoiceNumber}>
                              <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                              <TableCell>{inv.customerName}</TableCell>
                              <TableCell className="font-mono text-xs">{inv.customerGstin || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{inv.classification}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(inv.taxableValue, currency)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(inv.cgst, currency)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(inv.sgst, currency)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(inv.igst, currency)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(inv.total, currency)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell colSpan={4}>Total</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.totalTaxableValue, currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.totalCGST, currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.totalSGST, currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.totalIGST, currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(data.totalTax, currency)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hsn">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">HSN-wise Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {data.hsnSummary.length === 0 ? (
                      <p className="p-6 text-sm text-muted-foreground text-center">No HSN data available. Add HSN codes to invoice line items.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>HSN Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Taxable Value</TableHead>
                            <TableHead className="text-right">CGST</TableHead>
                            <TableHead className="text-right">SGST</TableHead>
                            <TableHead className="text-right">IGST</TableHead>
                            <TableHead className="text-right">Total Tax</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.hsnSummary.map((h) => (
                            <TableRow key={h.hsnCode}>
                              <TableCell className="font-mono font-medium">{h.hsnCode}</TableCell>
                              <TableCell>{h.description}</TableCell>
                              <TableCell className="text-right">{h.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(h.taxableValue, currency)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(h.cgst, currency)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(h.sgst, currency)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(h.igst, currency)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(h.totalTax, currency)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
