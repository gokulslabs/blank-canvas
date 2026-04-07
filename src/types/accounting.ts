// Core accounting types — structured for future PostgreSQL migration

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
  taxRate: number; // percentage, e.g. 10 = 10%
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
  type: "invoice" | "expense";
  date: string;
  description: string;
  debits: { accountId: string; amount: number }[];
  credits: { accountId: string; amount: number }[];
  referenceId: string; // invoice or expense ID
  createdAt: string;
}

export interface DashboardData {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  invoiceCount: number;
  expenseCount: number;
}
