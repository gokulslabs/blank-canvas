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
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Zap, Link2, CheckCircle, EyeOff, ArrowLeftRight } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);
  const [matchType, setMatchType] = useState<"invoice" | "expense">("invoice");
  const [matchRefId, setMatchRefId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [importDate, setImportDate] = useState(new Date().toISOString().split("T")[0]);
  const [importDesc, setImportDesc] = useState("");
  const [importAmount, setImportAmount] = useState("");
  const [importType, setImportType] = useState<"credit" | "debit">("debit");

  const loadTransactions = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const txns = await bankTransactionRepo.findByOrg(currentOrg.id);
      setTransactions(txns);
    } finally {
      setLoading(false);
    }
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
      toast.success("Transaction imported successfully");
      setImportDesc("");
      setImportAmount("");
      setImportOpen(false);
      await loadTransactions();
    } catch (err) {
      toast.error("Failed to import transaction");
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
      toast.success(matched > 0 ? `Auto-matched ${matched} transaction(s)` : "No new matches found");
    } catch (err) {
      toast.error("Auto-match failed");
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
      toast.success("Transaction matched successfully");
      setMatchOpen(false);
      setSelectedTxn(null);
      setMatchRefId("");
      await Promise.all([loadTransactions(), refreshData()]);
    } catch (err) {
      toast.error("Manual match failed");
      console.error("Manual match failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIgnore = async (txn: BankTransaction) => {
    try {
      await bankTransactionRepo.markMatched(txn.id, "ignored", "invoice");
      toast.success("Transaction marked as ignored");
      await loadTransactions();
    } catch (err) {
      toast.error("Failed to ignore transaction");
    }
  };

  const unmatchedTxns = transactions.filter((t) => t.status === "unmatched");
  const matchedTxns = transactions.filter((t) => t.status === "matched");
  const progress = transactions.length > 0 ? Math.round((matchedTxns.length / transactions.length) * 100) : 100;

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
            <Button variant="outline" onClick={handleAutoMatch} disabled={submitting || unmatchedTxns.length === 0}>
              <Zap className="h-4 w-4 mr-2" /> Auto-Match
            </Button>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button><Upload className="h-4 w-4 mr-2" /> Import Transaction</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Import Bank Transaction</DialogTitle></DialogHeader>
                <form onSubmit={handleImport} className="space-y-4">
                  <div><Label>Date</Label><Input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} required /></div>
                  <div><Label>Description</Label><Input value={importDesc} onChange={(e) => setImportDesc(e.target.value)} placeholder="Bank transaction description" required /></div>
                  <div><Label>Amount</Label><Input type="number" step="0.01" value={importAmount} onChange={(e) => setImportAmount(e.target.value)} placeholder="0.00" required /></div>
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold mt-1">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Matched</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{matchedTxns.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unmatched</p>
              <p className={cn("text-2xl font-bold mt-1", unmatchedTxns.length > 0 ? "text-amber-600" : "text-emerald-600")}>
                {unmatchedTxns.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</p>
              <p className="text-2xl font-bold mt-1 text-primary">{progress}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Unmatched Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-amber-600" />
              Unmatched Transactions
              {unmatchedTxns.length > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">{unmatchedTxns.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : unmatchedTxns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground/60 mt-1">No unmatched transactions</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatchedTxns.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(txn.date).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell className="font-medium">{txn.description}</TableCell>
                      <TableCell>
                        <Badge variant={txn.type === "credit" ? "default" : "secondary"}>{txn.type}</Badge>
                      </TableCell>
                      <TableCell className={cn("text-right font-medium", txn.type === "debit" ? "text-destructive" : "text-emerald-600")}>
                        {txn.type === "debit" ? "-" : "+"}{formatCurrency(txn.amount, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSelectedTxn(txn);
                              setMatchType(txn.type === "credit" ? "invoice" : "expense");
                              setMatchRefId("");
                              setMatchOpen(true);
                            }}
                          >
                            <Link2 className="h-3 w-3 mr-1" /> Match
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => handleIgnore(txn)}
                          >
                            <EyeOff className="h-3 w-3 mr-1" /> Ignore
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Matched Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Matched Transactions
              {matchedTxns.length > 0 && (
                <Badge className="bg-emerald-600">{matchedTxns.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {matchedTxns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowLeftRight className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No matched transactions yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Import bank transactions and match them</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Matched With</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedTxns.map((txn) => {
                    const matchedInvoice = txn.referenceType === "invoice"
                      ? invoices.find((i) => i.id === txn.referenceId)
                      : undefined;
                    const matchedExpense = txn.referenceType === "expense"
                      ? expenses.find((e) => e.id === txn.referenceId)
                      : undefined;
                    return (
                      <TableRow key={txn.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(txn.date).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell className="font-medium">{txn.description}</TableCell>
                        <TableCell>
                          <Badge variant={txn.type === "credit" ? "default" : "secondary"}>{txn.type}</Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", txn.type === "debit" ? "text-destructive" : "text-emerald-600")}>
                          {txn.type === "debit" ? "-" : "+"}{formatCurrency(txn.amount, currency)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {matchedInvoice ? (
                            <span className="text-primary">{matchedInvoice.invoiceNumber} — {matchedInvoice.customerName}</span>
                          ) : matchedExpense ? (
                            <span className="text-primary">{matchedExpense.vendorName} — {matchedExpense.category}</span>
                          ) : txn.referenceId === "ignored" ? (
                            <span className="text-muted-foreground italic">Ignored</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Manual Match Dialog */}
        <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Manual Match</DialogTitle></DialogHeader>
            {selectedTxn && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                  <p><strong>Description:</strong> {selectedTxn.description}</p>
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
