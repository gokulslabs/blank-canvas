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
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Expense } from "@/types/accounting";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 10;

const EXPENSE_CATEGORIES = [
  "Office Supplies", "Travel", "Utilities", "Marketing", "Software", "Rent", "Salaries", "Other",
];

function ExpenseForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: { vendorName: string; amount: string; category: string; date: string; description: string };
  onSubmit: (data: { vendorName: string; amount: number; category: string; date: string; description?: string }) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [vendorName, setVendorName] = useState(initial?.vendorName || "");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [date, setDate] = useState(initial?.date || new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState(initial?.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !amount || !category || submitting) return;
    onSubmit({
      vendorName: vendorName.trim(),
      amount: parseFloat(amount),
      category,
      date,
      description: description.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Vendor Name</Label>
        <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Enter vendor name" required />
      </div>
      <div>
        <Label>Amount</Label>
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
      </div>
      <div>
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </form>
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

export default function Expenses() {
  const { currentOrg, currency } = useApp();
  const orgId = currentOrg?.id;
  const { data: expenses = [], isLoading } = useExpenses(orgId);
  const createMutation = useCreateExpense(orgId);
  const updateMutation = useUpdateExpense(orgId);
  const deleteMutation = useDeleteExpense(orgId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => expenses.slice().reverse(), [expenses]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  const handleCreate = async (data: { vendorName: string; amount: number; category: string; date: string; description?: string }) => {
    await createMutation.mutateAsync(data);
    setCreateOpen(false);
    setPage(1);
  };

  const handleUpdate = async (data: { vendorName: string; amount: number; category: string; date: string; description?: string }) => {
    if (!editExpense) return;
    await updateMutation.mutateAsync({ ...editExpense, ...data });
    setEditExpense(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Expenses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your business expenses {sorted.length > 0 && `(${sorted.length} total)`}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <ExpenseForm onSubmit={handleCreate} submitting={createMutation.isPending} submitLabel="Add Expense" />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p>No expenses recorded yet. Add your first expense.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{exp.vendorName}</p>
                            {exp.description && <p className="text-xs text-muted-foreground">{exp.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{exp.category}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{new Date(exp.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(exp.amount, currency)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditExpense(exp)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this expense and reverse its journal entries.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(exp.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editExpense} onOpenChange={(open) => { if (!open) setEditExpense(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
            {editExpense && (
              <ExpenseForm
                initial={{
                  vendorName: editExpense.vendorName,
                  amount: String(editExpense.amount),
                  category: editExpense.category,
                  date: editExpense.date,
                  description: editExpense.description || "",
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
