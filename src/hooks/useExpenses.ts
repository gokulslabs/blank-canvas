import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseRepo } from "@/repositories/expenseRepo";
import { accountRepo } from "@/repositories/accountRepo";
import { createJournalEntry, deleteJournalEntriesByReference } from "@/services/accountingService";
import { Expense } from "@/types/accounting";
import { toast } from "sonner";

export function useExpenses(orgId: string | undefined) {
  return useQuery({
    queryKey: ["expenses", orgId],
    queryFn: () => expenseRepo.findByOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateExpense(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      vendorName: string;
      amount: number;
      category: string;
      date: string;
      description?: string;
    }) => {
      const id = orgId || "";
      const expense: Expense = {
        id: crypto.randomUUID(),
        ...data,
        reconciliationStatus: "unreconciled",
        createdAt: new Date().toISOString(),
        organizationId: id,
      };

      await expenseRepo.insert(expense);

      const [expenseAccount, cashAccount] = await Promise.all([
        accountRepo.findByCode("5000"),
        accountRepo.findByCode("1000"),
      ]);

      await createJournalEntry({
        organizationId: id,
        date: data.date,
        description: `Expense — ${data.vendorName}: ${data.category}`,
        referenceType: "expense",
        referenceId: expense.id,
        lines: [
          { accountId: expenseAccount!.id, debit: data.amount, credit: 0 },
          { accountId: cashAccount!.id, debit: 0, credit: data.amount },
        ],
      });

      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
      qc.invalidateQueries({ queryKey: ["pnl"] });
      toast.success("Expense added");
    },
    onError: (err) => {
      toast.error("Failed to add expense: " + (err as Error).message);
    },
  });
}

export function useUpdateExpense(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Expense) => {
      await deleteJournalEntriesByReference(expense.id);
      await expenseRepo.update(expense);

      const [expenseAccount, cashAccount] = await Promise.all([
        accountRepo.findByCode("5000"),
        accountRepo.findByCode("1000"),
      ]);

      await createJournalEntry({
        organizationId: expense.organizationId,
        date: expense.date,
        description: `Expense — ${expense.vendorName}: ${expense.category}`,
        referenceType: "expense",
        referenceId: expense.id,
        lines: [
          { accountId: expenseAccount!.id, debit: expense.amount, credit: 0 },
          { accountId: cashAccount!.id, debit: 0, credit: expense.amount },
        ],
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
      qc.invalidateQueries({ queryKey: ["pnl"] });
      toast.success("Expense updated");
    },
    onError: (err) => {
      toast.error("Failed to update expense: " + (err as Error).message);
    },
  });
}

export function useDeleteExpense(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      await deleteJournalEntriesByReference(expenseId);
      await expenseRepo.delete(expenseId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
      qc.invalidateQueries({ queryKey: ["pnl"] });
      toast.success("Expense deleted");
    },
    onError: (err) => {
      toast.error("Failed to delete expense: " + (err as Error).message);
    },
  });
}
