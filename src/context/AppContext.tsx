import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Organization,
  Invoice,
  Expense,
  LineItem,
  DashboardData,
} from "@/types/accounting";
import { createJournalEntry } from "@/services/accountingService";

interface AppState {
  organizations: Organization[];
  currentOrg: Organization | null;
  invoices: Invoice[];
  expenses: Expense[];
}

interface AppContextType extends AppState {
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

// Default organization
const defaultOrg: Organization = {
  id: "org-1",
  name: "My Business",
  createdAt: new Date().toISOString(),
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([defaultOrg]);
  const [currentOrg, setCurrentOrg] = useState<Organization>(defaultOrg);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

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

  let invoiceCounter = invoices.length;

  const addInvoice = useCallback(
    (data: {
      customerName: string;
      lineItems: Omit<LineItem, "id" | "total">[];
      taxRate: number;
    }) => {
      invoiceCounter++;
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
        invoiceNumber: `INV-${String(invoiceCounter).padStart(4, "0")}`,
        customerName: data.customerName,
        lineItems,
        taxRate: data.taxRate,
        subtotal,
        taxAmount,
        total,
        status: "draft",
        createdAt: new Date().toISOString(),
        organizationId: currentOrg?.id || "",
      };

      // Create journal entry (double-entry accounting)
      createJournalEntry("invoice", invoice);

      setInvoices((prev) => [...prev, invoice]);
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
      const expense: Expense = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        organizationId: currentOrg?.id || "",
      };

      // Create journal entry (double-entry accounting)
      createJournalEntry("expense", expense);

      setExpenses((prev) => [...prev, expense]);
      return expense;
    },
    [currentOrg]
  );

  const getDashboardData = useCallback((): DashboardData => {
    const orgInvoices = invoices.filter(
      (i) => i.organizationId === currentOrg?.id
    );
    const orgExpenses = expenses.filter(
      (e) => e.organizationId === currentOrg?.id
    );

    const totalRevenue = orgInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalExpenses = orgExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      invoiceCount: orgInvoices.length,
      expenseCount: orgExpenses.length,
    };
  }, [invoices, expenses, currentOrg]);

  return (
    <AppContext.Provider
      value={{
        organizations,
        currentOrg,
        invoices,
        expenses,
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
