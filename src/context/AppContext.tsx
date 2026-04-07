import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Organization,
  Invoice,
  Expense,
  LineItem,
  DashboardData,
} from "@/types/accounting";
import { createJournalEntry } from "@/services/accountingService";
import { getProfitAndLoss, getCashBalance } from "@/services/reportingService";
import { accountRepo } from "@/repositories/accountRepo";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { expenseRepo } from "@/repositories/expenseRepo";

interface AppContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  invoices: Invoice[];
  expenses: Expense[];
  createOrganization: (name: string) => void;
  switchOrganization: (id: string) => void;
  addInvoice: (data: {
    customerName: string;
    lineItems: Omit<LineItem, "id" | "total">[];
    taxRate: number;
  }) => Invoice;
  addExpense: (data: {
    vendorName: string;
    amount: number;
    category: string;
    date: string;
    description?: string;
  }) => Expense;
  getDashboardData: () => DashboardData;
}

const AppContext = createContext<AppContextType | null>(null);

const defaultOrg: Organization = {
  id: "org-1",
  name: "My Business",
  createdAt: new Date().toISOString(),
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([defaultOrg]);
  const [currentOrg, setCurrentOrg] = useState<Organization>(defaultOrg);
  // Version counter to trigger re-renders when ledger data changes
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const createOrganization = useCallback((name: string) => {
    const org: Organization = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };
    setOrganizations((prev) => [...prev, org]);
    setCurrentOrg(org);
  }, []);

  const switchOrganization = useCallback(
    (id: string) => {
      const org = organizations.find((o) => o.id === id);
      if (org) setCurrentOrg(org);
    },
    [organizations]
  );

  const addInvoice = useCallback(
    (data: {
      customerName: string;
      lineItems: Omit<LineItem, "id" | "total">[];
      taxRate: number;
    }) => {
      const orgId = currentOrg?.id || "";
      const count = invoiceRepo.count(orgId) + 1;

      const lineItems: LineItem[] = data.lineItems.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        total: item.price * item.quantity,
      }));

      const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
      const taxAmount = subtotal * (data.taxRate / 100);
      const total = subtotal + taxAmount;

      const invoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: `INV-${String(count).padStart(4, "0")}`,
        customerName: data.customerName,
        lineItems,
        taxRate: data.taxRate,
        subtotal,
        taxAmount,
        total,
        status: "draft",
        createdAt: new Date().toISOString(),
        organizationId: orgId,
      };

      // Persist invoice
      invoiceRepo.insert(invoice);

      // Create journal entry: DR Accounts Receivable, CR Revenue
      const arAccount = accountRepo.findByCode("1200")!;
      const revenueAccount = accountRepo.findByCode("4000")!;

      createJournalEntry({
        organizationId: orgId,
        date: new Date().toISOString(),
        description: `Invoice #${invoice.invoiceNumber} — ${invoice.customerName}`,
        referenceType: "invoice",
        referenceId: invoice.id,
        lines: [
          { accountId: arAccount.id, debit: total, credit: 0 },
          { accountId: revenueAccount.id, debit: 0, credit: total },
        ],
      });

      bump();
      return invoice;
    },
    [currentOrg]
  );

  const addExpense = useCallback(
    (data: {
      vendorName: string;
      amount: number;
      category: string;
      date: string;
      description?: string;
    }) => {
      const orgId = currentOrg?.id || "";

      const expense: Expense = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        organizationId: orgId,
      };

      // Persist expense
      expenseRepo.insert(expense);

      // Create journal entry: DR Expenses, CR Cash
      const expenseAccount = accountRepo.findByCode("5000")!;
      const cashAccount = accountRepo.findByCode("1000")!;

      createJournalEntry({
        organizationId: orgId,
        date: data.date,
        description: `Expense — ${data.vendorName}: ${data.category}`,
        referenceType: "expense",
        referenceId: expense.id,
        lines: [
          { accountId: expenseAccount.id, debit: data.amount, credit: 0 },
          { accountId: cashAccount.id, debit: 0, credit: data.amount },
        ],
      });

      bump();
      return expense;
    },
    [currentOrg]
  );

  /**
   * Dashboard data is DERIVED from the ledger, not from invoice/expense tables.
   * Revenue & expenses come from journal lines via the reporting service.
   * Invoice/expense counts are supplementary metadata only.
   */
  const getDashboardData = useCallback((): DashboardData => {
    const orgId = currentOrg?.id || "";
    const pnl = getProfitAndLoss(orgId);
    const cashBalance = getCashBalance(orgId);

    return {
      totalRevenue: pnl.revenue,
      totalExpenses: pnl.expenses,
      profit: pnl.profit,
      cashBalance,
      invoiceCount: invoiceRepo.count(orgId),
      expenseCount: expenseRepo.count(orgId),
    };
  }, [currentOrg]);

  // Read current org's invoices/expenses from repos for UI listing
  const orgInvoices = invoiceRepo.findByOrg(currentOrg?.id || "");
  const orgExpenses = expenseRepo.findByOrg(currentOrg?.id || "");

  return (
    <AppContext.Provider
      value={{
        organizations,
        currentOrg,
        invoices: orgInvoices,
        expenses: orgExpenses,
        createOrganization,
        switchOrganization,
        addInvoice,
        addExpense,
        getDashboardData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
