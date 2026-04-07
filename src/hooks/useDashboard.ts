import { useQuery } from "@tanstack/react-query";
import { getProfitAndLoss, getCashBalance } from "@/services/reportingService";
import { getReconciliationStats } from "@/services/reconciliationService";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { expenseRepo } from "@/repositories/expenseRepo";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";
import { DashboardData } from "@/types/accounting";

export function useDashboardData(orgId: string | undefined) {
  return useQuery<DashboardData>({
    queryKey: ["dashboard", orgId],
    queryFn: async () => {
      const id = orgId!;
      const [pnl, cashBalance, invCount, expCount, reconStats] = await Promise.all([
        getProfitAndLoss(id),
        getCashBalance(id),
        invoiceRepo.count(id),
        expenseRepo.count(id),
        getReconciliationStats(id),
      ]);
      return {
        totalRevenue: pnl.revenue,
        totalExpenses: pnl.expenses,
        profit: pnl.profit,
        cashBalance,
        invoiceCount: invCount,
        expenseCount: expCount,
        unreconciledCount: reconStats.unreconciledCount,
        reconciliationProgress: reconStats.reconciliationProgress,
      };
    },
    enabled: !!orgId,
  });
}

export interface RevenueOverTime {
  date: string;
  revenue: number;
  expenses: number;
}

export function useRevenueOverTime(orgId: string | undefined) {
  return useQuery<RevenueOverTime[]>({
    queryKey: ["revenue-over-time", orgId],
    queryFn: async () => {
      const id = orgId!;
      const [entries, revenueAccounts, expenseAccounts, allLines] = await Promise.all([
        journalRepo.findEntriesByOrgWithDates(id),
        accountRepo.findByType("revenue"),
        accountRepo.findByType("expense"),
        journalRepo.findLinesByOrg(id),
      ]);

      const revenueIds = new Set(revenueAccounts.map((a) => a.id));
      const expenseIds = new Set(expenseAccounts.map((a) => a.id));

      // Build a map of entryId -> lines
      const linesByEntry = new Map<string, typeof allLines>();
      for (const line of allLines) {
        const existing = linesByEntry.get(line.journalEntryId) || [];
        existing.push(line);
        linesByEntry.set(line.journalEntryId, existing);
      }

      // Aggregate by month
      const monthly = new Map<string, { revenue: number; expenses: number }>();
      for (const entry of entries) {
        const month = entry.date.substring(0, 7); // YYYY-MM
        const bucket = monthly.get(month) || { revenue: 0, expenses: 0 };
        const lines = linesByEntry.get(entry.id) || [];
        for (const line of lines) {
          if (revenueIds.has(line.accountId)) {
            bucket.revenue += line.credit - line.debit;
          } else if (expenseIds.has(line.accountId)) {
            bucket.expenses += line.debit - line.credit;
          }
        }
        monthly.set(month, bucket);
      }

      return Array.from(monthly.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, ...vals }));
    },
    enabled: !!orgId,
  });
}

export function useExpensesByCategory(orgId: string | undefined) {
  return useQuery<{ category: string; amount: number }[]>({
    queryKey: ["expenses-by-category", orgId],
    queryFn: async () => {
      const expenses = await expenseRepo.findByOrg(orgId!);
      const byCategory = new Map<string, number>();
      for (const exp of expenses) {
        byCategory.set(exp.category, (byCategory.get(exp.category) || 0) + exp.amount);
      }
      return Array.from(byCategory.entries()).map(([category, amount]) => ({ category, amount }));
    },
    enabled: !!orgId,
  });
}
