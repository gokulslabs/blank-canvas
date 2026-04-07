/**
 * Trial Balance Service
 * 
 * Derives trial balance ONLY from journal_lines.
 * Never uses invoices/expenses tables.
 */

import { TrialBalanceReport, TrialBalanceRow } from "@/types/accounting";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";

export async function getTrialBalance(organizationId: string): Promise<TrialBalanceReport> {
  const [accounts, lines] = await Promise.all([
    accountRepo.findAll(),
    journalRepo.findLinesByOrg(organizationId),
  ]);

  // Aggregate debits/credits per account
  const accountTotals = new Map<string, { totalDebit: number; totalCredit: number }>();
  for (const line of lines) {
    const existing = accountTotals.get(line.accountId) || { totalDebit: 0, totalCredit: 0 };
    existing.totalDebit += line.debit;
    existing.totalCredit += line.credit;
    accountTotals.set(line.accountId, existing);
  }

  const rows: TrialBalanceRow[] = [];

  for (const account of accounts) {
    const totals = accountTotals.get(account.id);
    if (!totals) continue; // Skip accounts with no activity

    const isNormalDebit = account.type === "asset" || account.type === "expense";
    const netBalance = isNormalDebit
      ? totals.totalDebit - totals.totalCredit
      : totals.totalCredit - totals.totalDebit;

    rows.push({
      accountId: account.id,
      accountName: account.name,
      accountCode: account.code,
      accountType: account.type,
      debitBalance: netBalance > 0 && isNormalDebit ? netBalance : (!isNormalDebit && netBalance < 0 ? Math.abs(netBalance) : (isNormalDebit ? netBalance : 0)),
      creditBalance: !isNormalDebit && netBalance > 0 ? netBalance : (isNormalDebit && netBalance < 0 ? Math.abs(netBalance) : (!isNormalDebit ? netBalance : 0)),
    });
  }

  // Simpler approach: positive balance goes to natural side
  const cleanRows: TrialBalanceRow[] = accounts
    .filter((a) => accountTotals.has(a.id))
    .map((account) => {
      const totals = accountTotals.get(account.id)!;
      const isNormalDebit = account.type === "asset" || account.type === "expense";
      const netBalance = isNormalDebit
        ? totals.totalDebit - totals.totalCredit
        : totals.totalCredit - totals.totalDebit;

      return {
        accountId: account.id,
        accountName: account.name,
        accountCode: account.code,
        accountType: account.type,
        debitBalance: isNormalDebit ? Math.max(netBalance, 0) : Math.max(-netBalance, 0),
        creditBalance: isNormalDebit ? Math.max(-netBalance, 0) : Math.max(netBalance, 0),
      };
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalDebits = cleanRows.reduce((sum, r) => sum + r.debitBalance, 0);
  const totalCredits = cleanRows.reduce((sum, r) => sum + r.creditBalance, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return { rows: cleanRows, totalDebits, totalCredits, isBalanced };
}
