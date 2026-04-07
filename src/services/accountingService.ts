/**
 * Central Accounting Service
 * 
 * Handles journal entry creation following double-entry accounting principles.
 * Currently a placeholder — will be connected to a real ledger later.
 */

import { JournalEntry, Invoice, Expense } from "@/types/accounting";
import { ACCOUNTS } from "@/modules/accounts/chartOfAccounts";

// In-memory journal entries store
const journalEntries: JournalEntry[] = [];

/**
 * Creates a journal entry for a financial transaction.
 * 
 * Double-entry accounting:
 * - Invoice: Debit Accounts Receivable, Credit Revenue
 * - Expense: Debit Expense account, Credit Cash/Bank
 */
export function createJournalEntry(
  type: "invoice" | "expense",
  data: Invoice | Expense
): JournalEntry {
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    type,
    date: new Date().toISOString(),
    description: "",
    debits: [],
    credits: [],
    referenceId: data.id,
    createdAt: new Date().toISOString(),
  };

  if (type === "invoice") {
    const invoice = data as Invoice;
    entry.description = `Invoice #${invoice.invoiceNumber} - ${invoice.customerName}`;
    // Debit: Accounts Receivable (asset increases)
    entry.debits.push({
      accountId: ACCOUNTS.find((a) => a.code === "1200")!.id,
      amount: invoice.total,
    });
    // Credit: Revenue (revenue increases)
    entry.credits.push({
      accountId: ACCOUNTS.find((a) => a.code === "4000")!.id,
      amount: invoice.total,
    });
  } else {
    const expense = data as Expense;
    entry.description = `Expense - ${expense.vendorName}: ${expense.category}`;
    // Debit: Expenses (expense increases)
    entry.debits.push({
      accountId: ACCOUNTS.find((a) => a.code === "5000")!.id,
      amount: expense.amount,
    });
    // Credit: Cash (asset decreases)
    entry.credits.push({
      accountId: ACCOUNTS.find((a) => a.code === "1000")!.id,
      amount: expense.amount,
    });
  }

  journalEntries.push(entry);
  console.log(`[Accounting] Journal entry created:`, entry);
  return entry;
}

export function getJournalEntries(): JournalEntry[] {
  return [...journalEntries];
}
