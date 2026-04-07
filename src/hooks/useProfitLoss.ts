import { useQuery } from "@tanstack/react-query";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";
import { ProfitAndLoss } from "@/types/accounting";

interface PnLFilters {
  orgId: string | undefined;
  startDate?: string;
  endDate?: string;
}

/**
 * Optimized P&L hook — fetches all lines in one query instead of N+1
 */
export function useProfitLoss({ orgId, startDate, endDate }: PnLFilters) {
  return useQuery<ProfitAndLoss>({
    queryKey: ["pnl", orgId, startDate, endDate],
    queryFn: async () => {
      const id = orgId!;

      // Batch: get entries, accounts, and ALL lines in parallel (no N+1)
      const [entries, revenueAccounts, expenseAccounts, allLines] = await Promise.all([
        journalRepo.findEntriesByOrgWithDates(id),
        accountRepo.findByType("revenue"),
        accountRepo.findByType("expense"),
        journalRepo.findLinesByOrg(id),
      ]);

      const revenueIds = new Set(revenueAccounts.map((a) => a.id));
      const expenseIds = new Set(expenseAccounts.map((a) => a.id));

      // Filter entries by date range
      const filteredEntryIds = new Set(
        entries
          .filter((e) => {
            const d = e.date.substring(0, 10);
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
          })
          .map((e) => e.id)
      );

      // Single pass over all lines, filtering by entry membership
      let revenue = 0;
      let expenses = 0;

      for (const line of allLines) {
        if (!filteredEntryIds.has(line.journalEntryId)) continue;
        if (revenueIds.has(line.accountId)) {
          revenue += line.credit - line.debit;
        } else if (expenseIds.has(line.accountId)) {
          expenses += line.debit - line.credit;
        }
      }

      return { revenue, expenses, profit: revenue - expenses };
    },
    enabled: !!orgId,
  });
}
