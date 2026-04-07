import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useBalanceSheet, BalanceSheetRow } from "@/hooks/useBalanceSheet";
import { CheckCircle, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/csvExport";

function AccountSection({ title, rows, currency, color }: {
  title: string;
  rows: BalanceSheetRow[];
  currency: string;
  color: string;
}) {
  const total = rows.reduce((s, r) => s + r.balance, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <span className={`text-lg font-bold ${color}`}>{formatCurrency(total, currency as any)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 pb-4">No accounts with balances</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.accountId}>
                  <TableCell className="text-muted-foreground font-mono text-xs">{row.accountCode}</TableCell>
                  <TableCell className="font-medium">{row.accountName}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(row.balance, currency as any)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function BalanceSheet() {
  const { currentOrg, currency } = useApp();
  const { data, isLoading } = useBalanceSheet(currentOrg?.id);

  const handleExport = () => {
    if (!data) return;
    const headers = ["Section", "Code", "Account", "Balance"];
    const rows: (string | number)[][] = [];
    const addSection = (label: string, items: BalanceSheetRow[]) => {
      items.forEach((r) => rows.push([label, r.accountCode, r.accountName, r.balance]));
    };
    addSection("Assets", data.assets);
    addSection("Liabilities", data.liabilities);
    addSection("Equity", data.equity);
    downloadCSV("balance-sheet.csv", headers, rows);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Assets, Liabilities & Equity — {currentOrg?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            {data && (
              <Badge
                variant={data.isBalanced ? "default" : "destructive"}
                className="text-sm py-1 px-3"
              >
                {data.isBalanced ? (
                  <><CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Balanced</>
                ) : (
                  <><AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Unbalanced</>
                )}
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : data ? (
          <>
            <AccountSection title="Assets" rows={data.assets} currency={currency} color="text-primary" />
            <AccountSection title="Liabilities" rows={data.liabilities} currency={currency} color="text-destructive" />
            <AccountSection title="Equity" rows={data.equity} currency={currency} color="text-green-600" />

            {/* Equation verification */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-center gap-4 text-sm font-medium">
                  <span>Assets: {formatCurrency(data.totalAssets, currency as any)}</span>
                  <span className="text-muted-foreground">=</span>
                  <span>Liabilities: {formatCurrency(data.totalLiabilities, currency as any)}</span>
                  <span className="text-muted-foreground">+</span>
                  <span>Equity: {formatCurrency(data.totalEquity, currency as any)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
