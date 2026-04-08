import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, IndianRupee } from "lucide-react";
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredInvoices = useMemo(() => {
    if (!data) return [];
    return data.invoices.filter((inv) => {
      if (filter !== "all" && inv.classification !== filter) return false;
      if (dateFrom && new Date(inv.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(inv.date) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [data, filter, dateFrom, dateTo]);

  const filteredTotals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inv) => ({
        taxable: acc.taxable + inv.taxableValue,
        cgst: acc.cgst + inv.cgst,
        sgst: acc.sgst + inv.sgst,
        igst: acc.igst + inv.igst,
        total: acc.total + inv.total,
      }),
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    );
  }, [filteredInvoices]);

  const handleExportSales = () => {
    if (!data) return;
    const headers = [
      "Invoice No.", "Date", "Customer Name", "GSTIN/UIN", "Place of Supply",
      "Supply Type", "B2B/B2C", "Taxable Value", "CGST", "SGST", "IGST", "Invoice Total",
    ];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      new Date(inv.date).toLocaleDateString("en-IN"),
      inv.customerName,
      inv.customerGstin || "",
      inv.placeOfSupply || "",
      inv.isInterstate ? "Inter-State" : "Intra-State",
      inv.classification,
      inv.taxableValue.toFixed(2),
      inv.cgst.toFixed(2),
      inv.sgst.toFixed(2),
      inv.igst.toFixed(2),
      inv.total.toFixed(2),
    ]);
    rows.push(["TOTAL", "", "", "", "", "", "",
      filteredTotals.taxable.toFixed(2), filteredTotals.cgst.toFixed(2),
      filteredTotals.sgst.toFixed(2), filteredTotals.igst.toFixed(2),
      filteredTotals.total.toFixed(2),
    ]);
    downloadCSV("gst-sales-register.csv", headers, rows);
  };

  const handleExportHSN = () => {
    if (!data) return;
    const headers = ["HSN/SAC Code", "Description", "Quantity", "Taxable Value (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Total Tax (₹)"];
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
            <h1 className="text-2xl font-bold">GST Sales Report</h1>
            <p className="text-sm text-muted-foreground mt-1">Tax breakdown for {currentOrg?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportSales} disabled={!data || filteredInvoices.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Sales Register CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportHSN} disabled={!data || (data?.hsnSummary.length ?? 0) === 0}>
              <Download className="h-4 w-4 mr-1" /> HSN Summary CSV
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
              {[
                { label: "Taxable Value", value: data.totalTaxableValue },
                { label: "CGST", value: data.totalCGST },
                { label: "SGST", value: data.totalSGST },
                { label: "IGST", value: data.totalIGST },
                { label: "Total Tax Collected", value: data.totalTax, highlight: true },
              ].map((card) => (
                <Card key={card.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-lg font-bold ${card.highlight ? "text-primary" : ""}`}>
                      {formatCurrency(card.value, currency)}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <CardTitle className="text-base">GST Sales Register</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                          <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-7 text-xs w-36"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                          <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-7 text-xs w-36"
                          />
                        </div>
                        {(dateFrom || dateTo) && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                            Clear
                          </Button>
                        )}
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
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredInvoices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No invoices found</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {filter !== "all" || dateFrom || dateTo
                            ? "Try adjusting your filters"
                            : "Create invoices to see GST breakdown"}
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice No.</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>GSTIN/UIN</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Taxable Value</TableHead>
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
                              <TableCell className="text-muted-foreground text-xs">
                                {new Date(inv.date).toLocaleDateString("en-IN")}
                              </TableCell>
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
                            <TableCell colSpan={5}>Total ({filteredInvoices.length} invoices)</TableCell>
                            <TableCell className="text-right">{formatCurrency(filteredTotals.taxable, currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(filteredTotals.cgst, currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(filteredTotals.sgst, currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(filteredTotals.igst, currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(filteredTotals.total, currency)}</TableCell>
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
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <IndianRupee className="h-8 w-8 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">No HSN data available</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Add HSN/SAC codes to invoice line items</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>HSN/SAC Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
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
