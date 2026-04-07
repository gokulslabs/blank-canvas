import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useGSTReport } from "@/hooks/useGSTReport";
import { downloadCSV } from "@/lib/csvExport";

export default function GSTReport() {
  const { currentOrg, currency } = useApp();
  const { data, isLoading } = useGSTReport(currentOrg?.id);

  const handleExport = () => {
    if (!data) return;
    const headers = ["Invoice #", "Customer", "GSTIN", "Taxable Value", "CGST", "SGST", "IGST", "Total"];
    const rows = data.invoices.map((inv) => [
      inv.invoiceNumber, inv.customerName, inv.customerGstin,
      inv.taxableValue, inv.cgst, inv.sgst, inv.igst, inv.total,
    ]);
    rows.push(["TOTAL", "", "", data.totalTaxableValue, data.totalCGST, data.totalSGST, data.totalIGST, data.totalTax]);
    downloadCSV("gst-summary.csv", headers, rows);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">GST Summary</h1>
            <p className="text-sm text-muted-foreground mt-1">Tax breakdown for {currentOrg?.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
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

            {/* Sales Register */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales Register</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.invoices.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No invoices found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>GSTIN</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST</TableHead>
                        <TableHead className="text-right">IGST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices.map((inv) => (
                        <TableRow key={inv.invoiceNumber}>
                          <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                          <TableCell>{inv.customerName}</TableCell>
                          <TableCell className="font-mono text-xs">{inv.customerGstin || "—"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.taxableValue, currency)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.cgst, currency)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.sgst, currency)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.igst, currency)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(inv.total, currency)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3}>Total</TableCell>
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
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
