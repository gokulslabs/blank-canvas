import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/currency";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Zap, Link2 } from "lucide-react";
import { BankTransaction } from "@/types/accounting";
import { bankTransactionRepo } from "@/repositories/bankTransactionRepo";
import {
  importBankTransactions,
  autoMatchTransactions,
  manualMatchTransaction,
} from "@/services/reconciliationService";
import { cn } from "@/lib/utils";

export default function Reconciliation() {
  const { currentOrg, invoices, expenses, currency, refreshData } = useApp();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);
  const [matchType, setMatchType] = useState<"invoice" | "expense">("invoice");
  const [matchRefId, setMatchRefId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Import form state
  const [importDate, setImportDate] = useState(new Date().toISOString().split("T")[0]);
  const [importDesc, setImportDesc] = useState("");
  const [importAmount, setImportAmount] = useState("");
  const [importType, setImportType] = useState<"credit" | "debit">("debit");

  const loadTransactions = useCallback(async () => {
    if (!currentOrg) return;
    const txns = await bankTransactionRepo.findByOrg(currentOrg.id);
    setTransactions(txns);
  }, [currentOrg]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !importDesc || !importAmount || submitting) return;
    setSubmitting(true);
    try {
      await importBankTransactions(currentOrg.id, [{
        date: importDate,
        description: importDesc,
        amount: parseFloat(importAmount),
        type: importType,
      }]);
      setImportDesc("");
      setImportAmount("");
      setImportOpen(false);
      await loadTransactions();
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!currentOrg || submitting) return;
    setSubmitting(true);
    try {
      const matched = await autoMatchTransactions(currentOrg.id);
      await Promise.all([loadTransactions(), refreshData()]);
      toast.success(`Auto-matched ${matched} transaction(s).`);
    } catch (err) {
      console.error("Auto-match failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedTxn || !matchRefId || submitting) return;
    setSubmitting(true);
    try {
      await manualMatchTransaction(selectedTxn.id, matchRefId, matchType);
      setMatchOpen(false);
      setSelectedTxn(null);
      setMatchRefId("");
      await Promise.all([loadTransactions(), refreshData()]);
    } catch (err) {
      console.error("Manual match failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const unmatchedCount = transactions.filter((t) => t.status === "unmatched").length;
  const matchedCount = transactions.filter((t) => t.status === "matched").length;

  const unreconciledInvoices = invoices.filter((i) => i.reconciliationStatus === "unreconciled");
  const unreconciledExpenses = expenses.filter((e) => e.reconciliationStatus === "unreconciled");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reconciliation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Match bank transactions with invoices and expenses
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAutoMatch} disabled={submitting || unmatchedCount === 0}>
              <Zap className="h-4 w-4 mr-2" /> Auto-Match
            </Button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button><Upload className="h-4 w-4 mr-2" /> Import Transaction</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Import Bank Transaction</DialogTitle></DialogHeader>
                <form onSubmit={handleImport} className="space-y-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={importDesc} onChange={(e) => setImportDesc(e.target.value)} placeholder="Bank transaction description" required />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={importAmount} onChange={(e) => setImportAmount(e.target.value)} placeholder="0.00" required />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={importType} onValueChange={(v) => setImportType(v as "credit" | "debit")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit (Money Out)</SelectItem>
                        <SelectItem value="credit">Credit (Money In)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Importing..." : "Import"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Matched</p>
              <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Unmatched</p>
              <p className={cn("text-2xl font-bold", unmatchedCount > 0 ? "text-amber-600" : "text-green-600")}>
                {unmatchedCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No bank transactions imported yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(txn.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{txn.description}</TableCell>
                      <TableCell>
                        <Badge variant={txn.type === "credit" ? "default" : "secondary"}>
                          {txn.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        txn.type === "debit" ? "text-destructive" : "text-green-600"
                      )}>
                        {txn.type === "debit" ? "-" : "+"}{formatCurrency(txn.amount, currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={txn.status === "matched" ? "default" : "outline"}
                          className={txn.status === "matched" ? "bg-green-600" : "text-amber-600 border-amber-300"}>
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {txn.status === "unmatched" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTxn(txn);
                              setMatchType(txn.type === "credit" ? "invoice" : "expense");
                              setMatchRefId("");
                              setMatchOpen(true);
                            }}
                          >
                            <Link2 className="h-4 w-4 mr-1" /> Match
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Manual Match Dialog */}
        <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual Match</DialogTitle>
            </DialogHeader>
            {selectedTxn && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-md text-sm">
                  <p><strong>Bank Transaction:</strong> {selectedTxn.description}</p>
                  <p><strong>Amount:</strong> {formatCurrency(selectedTxn.amount, currency)}</p>
                  <p><strong>Type:</strong> {selectedTxn.type}</p>
                </div>

                <div>
                  <Label>Match With</Label>
                  <Select value={matchType} onValueChange={(v) => { setMatchType(v as "invoice" | "expense"); setMatchRefId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select {matchType === "invoice" ? "Invoice" : "Expense"}</Label>
                  <Select value={matchRefId} onValueChange={setMatchRefId}>
                    <SelectTrigger><SelectValue placeholder={`Select ${matchType}...`} /></SelectTrigger>
                    <SelectContent>
                      {matchType === "invoice"
                        ? unreconciledInvoices.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} — {inv.customerName} — {formatCurrency(inv.total, currency)}
                            </SelectItem>
                          ))
                        : unreconciledExpenses.map((exp) => (
                            <SelectItem key={exp.id} value={exp.id}>
                              {exp.vendorName} — {exp.category} — {formatCurrency(exp.amount, currency)}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleManualMatch} className="w-full" disabled={!matchRefId || submitting}>
                  {submitting ? "Matching..." : "Confirm Match"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
