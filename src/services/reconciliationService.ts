/**
 * Reconciliation Service
 * 
 * Matches bank transactions with invoices/expenses.
 * Simple deterministic matching by amount.
 */

import { BankTransaction } from "@/types/accounting";
import { bankTransactionRepo } from "@/repositories/bankTransactionRepo";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { expenseRepo } from "@/repositories/expenseRepo";

/**
 * Import bank transactions into the system
 */
export async function importBankTransactions(
  organizationId: string,
  transactions: { date: string; description: string; amount: number; type: "credit" | "debit" }[]
): Promise<BankTransaction[]> {
  const bankTxns: BankTransaction[] = transactions.map((t) => ({
    id: crypto.randomUUID(),
    organizationId,
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
    status: "unmatched" as const,
    createdAt: new Date().toISOString(),
  }));

  await bankTransactionRepo.insertMany(bankTxns);
  return bankTxns;
}

/**
 * Auto-match unmatched bank transactions with invoices/expenses.
 * - Credit bank txns → match with invoices (same amount)
 * - Debit bank txns → match with expenses (same amount)
 */
export async function autoMatchTransactions(organizationId: string): Promise<number> {
  const unmatched = await bankTransactionRepo.findUnmatched(organizationId);
  const [invoices, expenses] = await Promise.all([
    invoiceRepo.findByOrg(organizationId),
    expenseRepo.findByOrg(organizationId),
  ]);

  // Only match with unreconciled items
  const unreconciledInvoices = invoices.filter((i) => i.reconciliationStatus === "unreconciled");
  const unreconciledExpenses = expenses.filter((e) => e.reconciliationStatus === "unreconciled");

  let matchCount = 0;

  for (const txn of unmatched) {
    if (txn.type === "credit") {
      // Try to match with an invoice of the same amount
      const match = unreconciledInvoices.find(
        (inv) => Math.abs(inv.total - txn.amount) < 0.01
      );
      if (match) {
        await bankTransactionRepo.markMatched(txn.id, match.id, "invoice");
        await invoiceRepo.updateReconciliationStatus(match.id, "reconciled");
        // Remove from pool
        const idx = unreconciledInvoices.indexOf(match);
        if (idx >= 0) unreconciledInvoices.splice(idx, 1);
        matchCount++;
      }
    } else {
      // Try to match with an expense of the same amount
      const match = unreconciledExpenses.find(
        (exp) => Math.abs(exp.amount - txn.amount) < 0.01
      );
      if (match) {
        await bankTransactionRepo.markMatched(txn.id, match.id, "expense");
        await expenseRepo.updateReconciliationStatus(match.id, "reconciled");
        const idx = unreconciledExpenses.indexOf(match);
        if (idx >= 0) unreconciledExpenses.splice(idx, 1);
        matchCount++;
      }
    }
  }

  return matchCount;
}

/**
 * Manually match a bank transaction with an invoice or expense
 */
export async function manualMatchTransaction(
  bankTransactionId: string,
  referenceId: string,
  referenceType: "invoice" | "expense"
): Promise<void> {
  await bankTransactionRepo.markMatched(bankTransactionId, referenceId, referenceType);

  if (referenceType === "invoice") {
    await invoiceRepo.updateReconciliationStatus(referenceId, "reconciled");
  } else {
    await expenseRepo.updateReconciliationStatus(referenceId, "reconciled");
  }
}

/**
 * Get unmatched bank transactions
 */
export async function getUnmatchedTransactions(organizationId: string): Promise<BankTransaction[]> {
  return bankTransactionRepo.findUnmatched(organizationId);
}

/**
 * Get reconciliation stats for dashboard
 */
export async function getReconciliationStats(organizationId: string) {
  const counts = await bankTransactionRepo.countByStatus(organizationId);
  return {
    unreconciledCount: counts.unmatched,
    reconciliationProgress: counts.total > 0
      ? Math.round((counts.matched / counts.total) * 100)
      : 100,
  };
}
