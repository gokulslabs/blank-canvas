/**
 * Journal Repository
 * 
 * Provides data access for journal entries and journal lines.
 * This is the CORE of the accounting system — the ledger.
 */

import { JournalEntry, JournalLine } from "@/types/accounting";
import { store } from "./store";

export const journalRepo = {
  /** Insert a journal entry */
  insertEntry(entry: JournalEntry): void {
    store.journalEntries.push(entry);
  },

  /** Insert multiple journal lines (belonging to one entry) */
  insertLines(lines: JournalLine[]): void {
    store.journalLines.push(...lines);
  },

  /** Get all journal entries for an organization */
  findEntriesByOrg(organizationId: string): JournalEntry[] {
    return store.journalEntries.filter(
      (e) => e.organizationId === organizationId
    );
  },

  /** Get all journal lines for a specific entry */
  findLinesByEntry(journalEntryId: string): JournalLine[] {
    return store.journalLines.filter(
      (l) => l.journalEntryId === journalEntryId
    );
  },

  /**
   * Get all journal lines for an organization (joins through entries).
   * This is the primary query for reporting.
   */
  findLinesByOrg(organizationId: string): JournalLine[] {
    const entryIds = new Set(
      store.journalEntries
        .filter((e) => e.organizationId === organizationId)
        .map((e) => e.id)
    );
    return store.journalLines.filter((l) => entryIds.has(l.journalEntryId));
  },

  /** Get all journal lines for a specific account within an organization */
  findLinesByAccount(organizationId: string, accountId: string): JournalLine[] {
    const entryIds = new Set(
      store.journalEntries
        .filter((e) => e.organizationId === organizationId)
        .map((e) => e.id)
    );
    return store.journalLines.filter(
      (l) => entryIds.has(l.journalEntryId) && l.accountId === accountId
    );
  },
};
