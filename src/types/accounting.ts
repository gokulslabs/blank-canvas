// Core accounting types — structured for PostgreSQL

import { CurrencyCode } from "@/lib/currency";

export interface Organization {
  id: string;
  name: string;
  currency: CurrencyCode;
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

export interface JournalEntry {
  id: string;
  organizationId: string;
  date: string;
  description: string;
  referenceType: "invoice" | "expense" | "manual";
  referenceId: string;
  createdAt: string;
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
}

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
