/**
 * Reporting Service
 * 
 * ALL financial reports are derived from journal lines.
 * We NEVER read from invoices/expenses tables for financial figures.
 * This ensures the ledger is the single source of truth.
 * 
 * Accounting fundamentals used here:
 * - Revenue accounts: normal credit balance (credits increase, debits decrease)
 * - Expense accounts: normal debit balance (debits increase, credits decrease)
 * - Asset accounts (Cash, AR): normal debit balance
 */

import { ProfitAndLoss } from "@/types/accounting";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";

/**
 * Profit & Loss Statement
 * 
 * Revenue = sum of credits - debits on revenue accounts
 * Expenses = sum of debits - credits on expense accounts
 * Profit = Revenue - Expenses
 */
export function getProfitAndLoss(organizationId: string): ProfitAndLoss {
  const lines = journalRepo.findLinesByOrg(organizationId);

  const revenueAccounts = new Set(
    accountRepo.findByType("revenue").map((a) => a.id)
  );
  const expenseAccounts = new Set(
    accountRepo.findByType("expense").map((a) => a.id)
  );

  let revenue = 0;
  let expenses = 0;

  for (const line of lines) {
    if (revenueAccounts.has(line.accountId)) {
      // Revenue has a normal credit balance
      revenue += line.credit - line.debit;
    } else if (expenseAccounts.has(line.accountId)) {
      // Expenses have a normal debit balance
      expenses += line.debit - line.credit;
    }
  }

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
  };
}

/**
 * Cash Balance
 * 
 * Sum of all debits - credits on the Cash account.
 * Assets have a normal debit balance, so:
 *   debits increase cash, credits decrease cash.
 */
export function getCashBalance(organizationId: string): number {
  const cashAccount = accountRepo.findByCode("1000");
  if (!cashAccount) return 0;

  const lines = journalRepo.findLinesByAccount(organizationId, cashAccount.id);

  return lines.reduce((balance, line) => {
    return balance + line.debit - line.credit;
  }, 0);
}

/**
 * Get the balance of any account.
 * 
 * For asset/expense accounts: debit - credit (normal debit balance)
 * For liability/equity/revenue accounts: credit - debit (normal credit balance)
 */
export function getAccountBalance(
  organizationId: string,
  accountId: string
): number {
  const account = accountRepo.findById(accountId);
  if (!account) return 0;

  const lines = journalRepo.findLinesByAccount(organizationId, accountId);

  const isNormalDebit =
    account.type === "asset" || account.type === "expense";

  return lines.reduce((balance, line) => {
    return isNormalDebit
      ? balance + line.debit - line.credit
      : balance + line.credit - line.debit;
  }, 0);
}
