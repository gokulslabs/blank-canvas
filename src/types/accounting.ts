// Core accounting types — structured for PostgreSQL migration

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  code: string;
  description: string;
}

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  lineItems: LineItem[];
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: "draft" | "sent" | "paid";
  createdAt: string;
  organizationId: string;
}

export interface Expense {
  id: string;
  vendorName: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  createdAt: string;
  organizationId: string;
}

/**
 * A journal entry represents a single accounting transaction.
 * It contains multiple journal lines that must balance (total debits = total credits).
 */
export interface JournalEntry {
  id: string;
  organizationId: string;
  date: string;
  description: string;
  referenceType: "invoice" | "expense" | "manual";
  referenceId: string;
  createdAt: string;
}

/**
 * Each journal line debits OR credits a specific account.
 * In double-entry accounting, every transaction has at least one debit and one credit line.
 */
export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;  // amount debited (0 if this is a credit line)
  credit: number; // amount credited (0 if this is a debit line)
}

/**
 * Input for creating a journal entry.
 * The accounting service validates that debits === credits before persisting.
 */
export interface CreateJournalEntryInput {
  organizationId: string;
  date: string;
  description: string;
  referenceType: "invoice" | "expense" | "manual";
  referenceId: string;
  lines: {
    accountId: string;
    debit: number;
    credit: number;
  }[];
}

export interface DashboardData {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  cashBalance: number;
  invoiceCount: number;
  expenseCount: number;
}

export interface ProfitAndLoss {
  revenue: number;
  expenses: number;
  profit: number;
}
