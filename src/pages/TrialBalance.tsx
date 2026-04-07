import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { getTrialBalance } from "@/services/trialBalanceService";
import { TrialBalanceReport } from "@/types/accounting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrialBalance() {
  const { currentOrg, loading, currency } = useApp();
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    getTrialBalance(currentOrg.id)
      .then(setReport)
      .catch((err) => setError(err.message));
  }, [currentOrg]);

  if (loading || !report) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading trial balance...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Trial Balance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Financial integrity report for {currentOrg?.name}
          </p>
        </div>

        {/* Status Banner */}
        <Card className={cn(
          "border-2",
          report.isBalanced ? "border-green-500/30 bg-green-50/50" : "border-destructive/30 bg-destructive/5"
        )}>
          <CardContent className="flex items-center gap-3 py-4">
            {report.isBalanced ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Ledger is balanced</p>
                  <p className="text-sm text-green-700">Total debits equal total credits. Your books are correct.</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Ledger imbalance detected!</p>
                  <p className="text-sm text-destructive/80">
                    Debits ({formatCurrency(report.totalDebits, currency)}) ≠ Credits ({formatCurrency(report.totalCredits, currency)}).
                    Difference: {formatCurrency(Math.abs(report.totalDebits - report.totalCredits), currency)}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trial Balance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Balances</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {report.rows.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No journal entries yet. Create invoices or expenses to populate the trial balance.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row) => (
                    <TableRow key={row.accountId}>
                      <TableCell className="font-mono text-sm">{row.accountCode}</TableCell>
                      <TableCell className="font-medium">{row.accountName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {row.accountType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.debitBalance > 0 ? formatCurrency(row.debitBalance, currency) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.creditBalance > 0 ? formatCurrency(row.creditBalance, currency) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className={cn(
                    "font-bold border-t-2",
                    !report.isBalanced && "bg-destructive/5"
                  )}>
                    <TableCell colSpan={3} className="text-right">TOTALS</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      !report.isBalanced && "text-destructive"
                    )}>
                      {formatCurrency(report.totalDebits, currency)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right",
                      !report.isBalanced && "text-destructive"
                    )}>
                      {formatCurrency(report.totalCredits, currency)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4 text-destructive text-sm">{error}</CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
