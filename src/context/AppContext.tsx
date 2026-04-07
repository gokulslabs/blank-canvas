import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  Organization,
  Invoice,
  Expense,
  LineItem,
  DashboardData,
} from "@/types/accounting";
import { CurrencyCode } from "@/lib/currency";
import { createJournalEntry } from "@/services/accountingService";
import { getProfitAndLoss, getCashBalance } from "@/services/reportingService";
import { getReconciliationStats } from "@/services/reconciliationService";
import { accountRepo } from "@/repositories/accountRepo";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { expenseRepo } from "@/repositories/expenseRepo";
import { organizationRepo } from "@/repositories/organizationRepo";

interface AppContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  invoices: Invoice[];
  expenses: Expense[];
  loading: boolean;
  currency: CurrencyCode;
  createOrganization: (name: string, currency?: CurrencyCode) => Promise<void>;
  switchOrganization: (id: string) => void;
  addInvoice: (data: {
    customerName: string;
    lineItems: Omit<LineItem, "id" | "total">[];
    taxRate: number;
  }) => Promise<Invoice>;
  addExpense: (data: {
    vendorName: string;
    amount: number;
    category: string;
    date: string;
    description?: string;
  }) => Promise<Expense>;
  getDashboardData: () => Promise<DashboardData>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const currency: CurrencyCode = currentOrg?.currency || "INR";

  useEffect(() => {
    (async () => {
      try {
        const orgs = await organizationRepo.findAll();
        setOrganizations(orgs);
        const defaultOrg = orgs.find((o) => o.id === DEFAULT_ORG_ID) || orgs[0];
        if (defaultOrg) setCurrentOrg(defaultOrg);
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadOrgData = useCallback(async (orgId: string) => {
    const [inv, exp] = await Promise.all([
      invoiceRepo.findByOrg(orgId),
      expenseRepo.findByOrg(orgId),
    ]);
    setInvoices(inv);
    setExpenses(exp);
  }, []);

  useEffect(() => {
    if (currentOrg) loadOrgData(currentOrg.id);
  }, [currentOrg, loadOrgData]);

  const refreshData = useCallback(async () => {
    if (currentOrg) await loadOrgData(currentOrg.id);
  }, [currentOrg, loadOrgData]);

  const createOrganization = useCallback(async (name: string, cur: CurrencyCode = "INR") => {
    const org: Organization = {
      id: crypto.randomUUID(),
      name,
      currency: cur,
      createdAt: new Date().toISOString(),
    };
    await organizationRepo.insert(org);
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
    async (data: {
      customerName: string;
      lineItems: Omit<LineItem, "id" | "total">[];
      taxRate: number;
    }) => {
      const orgId = currentOrg?.id || "";
      const count = (await invoiceRepo.count(orgId)) + 1;

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
        reconciliationStatus: "unreconciled",
        createdAt: new Date().toISOString(),
        organizationId: orgId,
      };

      await invoiceRepo.insert(invoice);

      const [arAccount, revenueAccount] = await Promise.all([
        accountRepo.findByCode("1200"),
        accountRepo.findByCode("4000"),
      ]);

      await createJournalEntry({
        organizationId: orgId,
        date: new Date().toISOString(),
        description: `Invoice #${invoice.invoiceNumber} — ${invoice.customerName}`,
        referenceType: "invoice",
        referenceId: invoice.id,
        lines: [
          { accountId: arAccount!.id, debit: total, credit: 0 },
          { accountId: revenueAccount!.id, debit: 0, credit: total },
        ],
      });

      await refreshData();
      return invoice;
    },
    [currentOrg, refreshData]
  );

  const addExpense = useCallback(
    async (data: {
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
        reconciliationStatus: "unreconciled",
        createdAt: new Date().toISOString(),
        organizationId: orgId,
      };

      await expenseRepo.insert(expense);

      const [expenseAccount, cashAccount] = await Promise.all([
        accountRepo.findByCode("5000"),
        accountRepo.findByCode("1000"),
      ]);

      await createJournalEntry({
        organizationId: orgId,
        date: data.date,
        description: `Expense — ${data.vendorName}: ${data.category}`,
        referenceType: "expense",
        referenceId: expense.id,
        lines: [
          { accountId: expenseAccount!.id, debit: data.amount, credit: 0 },
          { accountId: cashAccount!.id, debit: 0, credit: data.amount },
        ],
      });

      await refreshData();
      return expense;
    },
    [currentOrg, refreshData]
  );

  const getDashboardData = useCallback(async (): Promise<DashboardData> => {
    const orgId = currentOrg?.id || "";
    const [pnl, cashBalance, invCount, expCount, reconStats] = await Promise.all([
      getProfitAndLoss(orgId),
      getCashBalance(orgId),
      invoiceRepo.count(orgId),
      expenseRepo.count(orgId),
      getReconciliationStats(orgId),
    ]);

    return {
      totalRevenue: pnl.revenue,
      totalExpenses: pnl.expenses,
      profit: pnl.profit,
      cashBalance,
      invoiceCount: invCount,
      expenseCount: expCount,
      unreconciledCount: reconStats.unreconciledCount,
      reconciliationProgress: reconStats.reconciliationProgress,
    };
  }, [currentOrg]);

  return (
    <AppContext.Provider
      value={{
        organizations,
        currentOrg,
        invoices,
        expenses,
        loading,
        currency,
        createOrganization,
        switchOrganization,
        addInvoice,
        addExpense,
        getDashboardData,
        refreshData,
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
