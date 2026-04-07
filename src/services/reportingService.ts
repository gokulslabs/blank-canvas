/**
 * Reporting Service — Async, Supabase-backed
 * 
 * ALL financial reports are derived from journal lines.
 * Ledger is the single source of truth.
 */

import { ProfitAndLoss } from "@/types/accounting";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";

export async function getProfitAndLoss(organizationId: string): Promise<ProfitAndLoss> {
  const [lines, revenueAccounts, expenseAccounts] = await Promise.all([
    journalRepo.findLinesByOrg(organizationId),
    accountRepo.findByType("revenue"),
    accountRepo.findByType("expense"),
  ]);

  const revenueIds = new Set(revenueAccounts.map((a) => a.id));
  const expenseIds = new Set(expenseAccounts.map((a) => a.id));

  let revenue = 0;
  let expenses = 0;

  for (const line of lines) {
    if (revenueIds.has(line.accountId)) {
      revenue += line.credit - line.debit;
    } else if (expenseIds.has(line.accountId)) {
      expenses += line.debit - line.credit;
    }
  }

  return { revenue, expenses, profit: revenue - expenses };
}

export async function getCashBalance(organizationId: string): Promise<number> {
  const cashAccount = await accountRepo.findByCode("1000");
  if (!cashAccount) return 0;

  const lines = await journalRepo.findLinesByAccount(organizationId, cashAccount.id);
  return lines.reduce((balance, line) => balance + line.debit - line.credit, 0);
}

export async function getAccountBalance(organizationId: string, accountId: string): Promise<number> {
  const account = await accountRepo.findById(accountId);
  if (!account) return 0;

  const lines = await journalRepo.findLinesByAccount(organizationId, accountId);
  const isNormalDebit = account.type === "asset" || account.type === "expense";

  return lines.reduce((balance, line) => {
    return isNormalDebit
      ? balance + line.debit - line.credit
      : balance + line.credit - line.debit;
  }, 0);
}
