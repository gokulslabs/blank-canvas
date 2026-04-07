import { useQuery } from "@tanstack/react-query";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";
import { ProfitAndLoss } from "@/types/accounting";

interface PnLFilters {
  orgId: string | undefined;
  startDate?: string;
  endDate?: string;
}

export function useProfitLoss({ orgId, startDate, endDate }: PnLFilters) {
  return useQuery<ProfitAndLoss>({
    queryKey: ["pnl", orgId, startDate, endDate],
    queryFn: async () => {
      const id = orgId!;
      const [entries, revenueAccounts, expenseAccounts] = await Promise.all([
        journalRepo.findEntriesByOrgWithDates(id),
        accountRepo.findByType("revenue"),
        accountRepo.findByType("expense"),
      ]);

      const revenueIds = new Set(revenueAccounts.map((a) => a.id));
      const expenseIds = new Set(expenseAccounts.map((a) => a.id));

      // Filter entries by date range
      const filteredEntries = entries.filter((e) => {
        const d = e.date.substring(0, 10);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });

      // Get lines for filtered entries
      let revenue = 0;
      let expenses = 0;

      for (const entry of filteredEntries) {
        const lines = await journalRepo.findLinesByEntry(entry.id);
        for (const line of lines) {
          if (revenueIds.has(line.accountId)) {
            revenue += line.credit - line.debit;
          } else if (expenseIds.has(line.accountId)) {
            expenses += line.debit - line.credit;
          }
        }
      }

      return { revenue, expenses, profit: revenue - expenses };
    },
    enabled: !!orgId,
  });
}
