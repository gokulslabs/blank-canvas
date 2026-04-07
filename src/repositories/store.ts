/**
 * In-Memory Store
 * 
 * Central mutable store for all entities. Structured to mirror
 * database tables — easy to swap for PostgreSQL later.
 * Each array here = one table.
 */

import { Account, Invoice, Expense, JournalEntry, JournalLine, Organization } from "@/types/accounting";
import { ACCOUNTS } from "@/modules/accounts/chartOfAccounts";

class Store {
  organizations: Organization[] = [];
  accounts: Account[] = [...ACCOUNTS];
  invoices: Invoice[] = [];
  expenses: Expense[] = [];
  journalEntries: JournalEntry[] = [];
  journalLines: JournalLine[] = [];

  /** Reset all data (useful for testing) */
  reset() {
    this.organizations = [];
    this.accounts = [...ACCOUNTS];
    this.invoices = [];
    this.expenses = [];
    this.journalEntries = [];
    this.journalLines = [];
  }
}

/** Singleton store instance */
export const store = new Store();
