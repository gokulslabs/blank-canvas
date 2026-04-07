import { useQuery } from "@tanstack/react-query";
import { journalRepo } from "@/repositories/journalRepo";
import { accountRepo } from "@/repositories/accountRepo";

export interface LedgerLine {
  date: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface LedgerAccountGroup {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  lines: LedgerLine[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface Filters {
  orgId: string | undefined;
  startDate?: string;
  endDate?: string;
}

export function useGeneralLedger({ orgId, startDate, endDate }: Filters) {
  return useQuery<LedgerAccountGroup[]>({
    queryKey: ["general-ledger", orgId, startDate, endDate],
    queryFn: async () => {
      const id = orgId!;
      const [entries, allLines, accounts] = await Promise.all([
        journalRepo.findEntriesByOrgWithDates(id),
        journalRepo.findLinesByOrg(id),
        accountRepo.findAll(),
      ]);

      // Filter entries by date
      const filteredEntries = entries.filter((e) => {
        const d = e.date.substring(0, 10);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });

      const entryMap = new Map(filteredEntries.map((e) => [e.id, e]));
      const accountMap = new Map(accounts.map((a) => [a.id, a]));

      // Group lines by account
      const groupMap = new Map<string, { debit: number; credit: number; date: string; description: string }[]>();

      for (const line of allLines) {
        const entry = entryMap.get(line.journalEntryId);
        if (!entry) continue;
        if (!groupMap.has(line.accountId)) groupMap.set(line.accountId, []);
        groupMap.get(line.accountId)!.push({
          debit: line.debit,
          credit: line.credit,
          date: entry.date.substring(0, 10),
          description: entry.description,
        });
      }

      const groups: LedgerAccountGroup[] = [];

      for (const [accountId, items] of groupMap) {
        const account = accountMap.get(accountId);
        if (!account) continue;

        // Sort by date
        items.sort((a, b) => a.date.localeCompare(b.date));

        const isNormalDebit = account.type === "asset" || account.type === "expense";
        let running = 0;
        const lines: LedgerLine[] = items.map((item) => {
          running += isNormalDebit
            ? item.debit - item.credit
            : item.credit - item.debit;
          return {
            date: item.date,
            description: item.description,
            debit: item.debit,
            credit: item.credit,
            runningBalance: running,
          };
        });

        groups.push({
          accountId,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          lines,
          totalDebit: items.reduce((s, i) => s + i.debit, 0),
          totalCredit: items.reduce((s, i) => s + i.credit, 0),
          balance: running,
        });
      }

      groups.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      return groups;
    },
    enabled: !!orgId,
  });
}
