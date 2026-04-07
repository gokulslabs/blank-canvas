import { useQuery } from "@tanstack/react-query";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";
import { Account } from "@/types/accounting";

export interface BalanceSheetRow {
  accountId: string;
  accountName: string;
  accountCode: string;
  accountType: Account["type"];
  balance: number;
}

export interface BalanceSheetData {
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}

export function useBalanceSheet(orgId: string | undefined) {
  return useQuery<BalanceSheetData>({
    queryKey: ["balance-sheet", orgId],
    queryFn: async () => {
      const id = orgId!;
      const [accounts, allLines] = await Promise.all([
        accountRepo.findAll(),
        journalRepo.findLinesByOrg(id),
      ]);

      // Pre-compute balances per account from all lines in one pass
      const balanceMap = new Map<string, number>();
      for (const line of allLines) {
        balanceMap.set(line.accountId, (balanceMap.get(line.accountId) || 0) + line.debit - line.credit);
      }

      const rows: BalanceSheetRow[] = accounts
        .filter((a) => ["asset", "liability", "equity"].includes(a.type))
        .map((a) => {
          const rawBalance = balanceMap.get(a.id) || 0;
          // Assets have normal debit balance; liabilities & equity have normal credit balance
          const balance = a.type === "asset" ? rawBalance : -rawBalance;
          return {
            accountId: a.id,
            accountName: a.name,
            accountCode: a.code,
            accountType: a.type,
            balance,
          };
        })
        .filter((r) => Math.abs(r.balance) > 0.001);

      const assets = rows.filter((r) => r.accountType === "asset");
      const liabilities = rows.filter((r) => r.accountType === "liability");
      const equity = rows.filter((r) => r.accountType === "equity");

      // Retained earnings = revenue - expenses (from journal lines)
      const revenueAccounts = accounts.filter((a) => a.type === "revenue");
      const expenseAccounts = accounts.filter((a) => a.type === "expense");
      const revenueIds = new Set(revenueAccounts.map((a) => a.id));
      const expenseIds = new Set(expenseAccounts.map((a) => a.id));

      let retainedEarnings = 0;
      for (const line of allLines) {
        if (revenueIds.has(line.accountId)) {
          retainedEarnings += line.credit - line.debit;
        } else if (expenseIds.has(line.accountId)) {
          retainedEarnings -= line.debit - line.credit;
        }
      }

      if (Math.abs(retainedEarnings) > 0.001) {
        equity.push({
          accountId: "retained-earnings",
          accountName: "Retained Earnings",
          accountCode: "3100",
          accountType: "equity",
          balance: retainedEarnings,
        });
      }

      const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
      const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
      const totalEquity = equity.reduce((s, r) => s + r.balance, 0);

      return {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      };
    },
    enabled: !!orgId,
  });
}
