import React, { createContext, useContext } from "react";
import { Invoice, Expense, DashboardData } from "@/types/accounting";
import { CurrencyCode } from "@/lib/currency";

// Pre-seeded demo data
const DEMO_INVOICES: Invoice[] = [
  {
    id: "demo-inv-1", invoiceNumber: "INV-0001", customerName: "TechCorp India",
    lineItems: [{ id: "li-1", name: "Web Development", quantity: 1, price: 75000, total: 75000, hsnCode: "998314", taxRate: 18 }],
    taxRate: 18, subtotal: 75000, taxAmount: 13500, total: 88500,
    status: "paid", reconciliationStatus: "reconciled", createdAt: "2026-03-15T10:00:00Z",
    organizationId: "demo-org", customerGstin: "27AABCT1234D1ZV", placeOfSupply: "Maharashtra",
    isInterstate: false, cgstAmount: 6750, sgstAmount: 6750, igstAmount: 0, currency: "INR",
  },
  {
    id: "demo-inv-2", invoiceNumber: "INV-0002", customerName: "StartupXYZ",
    lineItems: [{ id: "li-2", name: "UI/UX Design", quantity: 1, price: 45000, total: 45000, hsnCode: "998314", taxRate: 18 }],
    taxRate: 18, subtotal: 45000, taxAmount: 8100, total: 53100,
    status: "sent", reconciliationStatus: "unreconciled", createdAt: "2026-03-28T10:00:00Z",
    organizationId: "demo-org", placeOfSupply: "Karnataka", isInterstate: true,
    cgstAmount: 0, sgstAmount: 0, igstAmount: 8100, currency: "INR",
  },
  {
    id: "demo-inv-3", invoiceNumber: "INV-0003", customerName: "RetailMart",
    lineItems: [{ id: "li-3", name: "Consulting", quantity: 10, price: 5000, total: 50000 }],
    taxRate: 18, subtotal: 50000, taxAmount: 9000, total: 59000,
    status: "draft", reconciliationStatus: "unreconciled", createdAt: "2026-04-05T10:00:00Z",
    organizationId: "demo-org", currency: "INR",
    cgstAmount: 4500, sgstAmount: 4500, igstAmount: 0,
  },
];

const DEMO_EXPENSES: Expense[] = [
  { id: "demo-exp-1", vendorName: "AWS", amount: 12000, category: "Cloud Hosting", date: "2026-03-10", reconciliationStatus: "reconciled", createdAt: "2026-03-10T10:00:00Z", organizationId: "demo-org", currency: "INR" },
  { id: "demo-exp-2", vendorName: "WeWork", amount: 25000, category: "Office Rent", date: "2026-03-01", reconciliationStatus: "reconciled", createdAt: "2026-03-01T10:00:00Z", organizationId: "demo-org", currency: "INR" },
  { id: "demo-exp-3", vendorName: "Swiggy", amount: 3500, category: "Office Supplies", date: "2026-04-02", reconciliationStatus: "unreconciled", createdAt: "2026-04-02T10:00:00Z", organizationId: "demo-org", currency: "INR" },
];

const DEMO_DASHBOARD: DashboardData = {
  totalRevenue: 200600,
  totalExpenses: 40500,
  profit: 160100,
  cashBalance: 88500,
  invoiceCount: 3,
  expenseCount: 3,
  unreconciledCount: 2,
  reconciliationProgress: 50,
};

interface DemoContextType {
  isDemo: true;
  invoices: Invoice[];
  expenses: Expense[];
  dashboardData: DashboardData;
  currency: CurrencyCode;
  orgName: string;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const value: DemoContextType = {
    isDemo: true,
    invoices: DEMO_INVOICES,
    expenses: DEMO_EXPENSES,
    dashboardData: DEMO_DASHBOARD,
    currency: "INR",
    orgName: "Acme Demo Corp",
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

export function useMaybeDemo() {
  return useContext(DemoContext);
}
