// Core accounting types — structured for PostgreSQL

import { CurrencyCode } from "@/lib/currency";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  currency: CurrencyCode;
  ownerId?: string;
  gstin?: string;
  state?: string;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "accountant" | "viewer";
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
  hsnCode?: string;
  taxRate?: number;
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
  amountPaid: number;
  amountDue: number;
  status: "draft" | "sent" | "partially_paid" | "paid";
  reconciliationStatus: "unreconciled" | "reconciled";
  createdAt: string;
  organizationId: string;
  // GST fields
  customerGstin?: string;
  placeOfSupply?: string;
  isInterstate?: boolean;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  // Multi-currency
  currency?: CurrencyCode;
}

export interface Expense {
  id: string;
  vendorName: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  reconciliationStatus: "unreconciled" | "reconciled";
  createdAt: string;
  organizationId: string;
  currency?: CurrencyCode;
}

export interface JournalEntry {
  id: string;
  organizationId: string;
  date: string;
  description: string;
  referenceType: "invoice" | "expense" | "manual" | "payment";
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

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string;
  amount: number;
  method: "cash" | "bank" | "upi" | "card";
  date: string;
  notes?: string;
  createdAt: string;
}

export interface CreateJournalEntryInput {
  organizationId: string;
  date: string;
  description: string;
  referenceType: "invoice" | "expense" | "manual" | "payment";
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
  unreconciledCount: number;
  reconciliationProgress: number;
}

export interface ProfitAndLoss {
  revenue: number;
  expenses: number;
  profit: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountName: string;
  accountCode: string;
  accountType: Account["type"];
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface BankTransaction {
  id: string;
  organizationId: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  status: "unmatched" | "matched";
  referenceId?: string;
  referenceType?: "invoice" | "expense";
  createdAt: string;
}

export interface GSTInvoiceRow {
  invoiceNumber: string;
  customerName: string;
  customerGstin: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  date: string;
  placeOfSupply: string;
  isInterstate: boolean;
  classification: "B2B" | "B2C";
  hsnCodes: string[];
}

export interface HSNSummaryRow {
  hsnCode: string;
  description: string;
  quantity: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface GSTSummary {
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  b2bCount: number;
  b2cCount: number;
  b2bValue: number;
  b2cValue: number;
  invoices: GSTInvoiceRow[];
  hsnSummary: HSNSummaryRow[];
}

export interface Budget {
  id: string;
  organizationId: string;
  category: string;
  monthlyLimit: number;
  createdAt: string;
}

export interface FixedAsset {
  id: string;
  organizationId: string;
  name: string;
  purchaseValue: number;
  purchaseDate: string;
  depreciationRate: number;
  description?: string;
  createdAt: string;
}
