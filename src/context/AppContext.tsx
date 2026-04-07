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
import { organizationMemberRepo } from "@/repositories/organizationMemberRepo";
import { useAuth } from "@/context/AuthContext";
import { calculateGST } from "@/lib/gst";

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
    customerGstin?: string;
    placeOfSupply?: string;
    isInterstate?: boolean;
    currency?: CurrencyCode;
  }) => Promise<Invoice>;
  addExpense: (data: {
    vendorName: string;
    amount: number;
    category: string;
    date: string;
    description?: string;
    currency?: CurrencyCode;
  }) => Promise<Expense>;
  getDashboardData: () => Promise<DashboardData>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const currency: CurrencyCode = currentOrg?.currency || "INR";

  // Load organizations the user is a member of
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Get org IDs user is a member of
        const memberships = await organizationMemberRepo.findByUser(user.id);
        
        if (memberships.length === 0) {
          // New user: create default org + membership
          const orgId = crypto.randomUUID();
          const org: Organization = {
            id: orgId,
            name: "My Business",
            currency: "INR",
            ownerId: user.id,
            createdAt: new Date().toISOString(),
          };
          await organizationRepo.insert(org);
          await organizationMemberRepo.insert({
            userId: user.id,
            organizationId: orgId,
            role: "owner",
          });
          setOrganizations([org]);
          setCurrentOrg(org);
        } else {
          // Load orgs by IDs from memberships
          const orgIds = memberships.map((m) => m.organizationId);
          const orgs = await organizationRepo.findByIds(orgIds);
          setOrganizations(orgs);
          // Restore last selected org from localStorage or use first
          const lastOrgId = localStorage.getItem("ledgerflow_current_org");
          const restored = orgs.find((o) => o.id === lastOrgId);
          setCurrentOrg(restored || orgs[0]);
        }
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const loadOrgData = useCallback(async (orgId: string) => {
    const [inv, exp] = await Promise.all([
      invoiceRepo.findByOrg(orgId),
      expenseRepo.findByOrg(orgId),
    ]);
    setInvoices(inv);
    setExpenses(exp);
  }, []);

  useEffect(() => {
    if (currentOrg) {
      loadOrgData(currentOrg.id);
      localStorage.setItem("ledgerflow_current_org", currentOrg.id);
    }
  }, [currentOrg, loadOrgData]);

  const refreshData = useCallback(async () => {
    if (currentOrg) await loadOrgData(currentOrg.id);
  }, [currentOrg, loadOrgData]);

  const createOrganization = useCallback(async (name: string, cur: CurrencyCode = "INR") => {
    if (!user) return;
    const orgId = crypto.randomUUID();
    const org: Organization = {
      id: orgId,
      name,
      currency: cur,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    };
    await organizationRepo.insert(org);
    await organizationMemberRepo.insert({
      userId: user.id,
      organizationId: orgId,
      role: "owner",
    });
    setOrganizations((prev) => [...prev, org]);
    setCurrentOrg(org);
  }, [user]);

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
      customerGstin?: string;
      placeOfSupply?: string;
      isInterstate?: boolean;
      currency?: CurrencyCode;
    }) => {
      const orgId = currentOrg?.id || "";
      const count = (await invoiceRepo.count(orgId)) + 1;

      const lineItems: LineItem[] = data.lineItems.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        total: item.price * item.quantity,
      }));

      const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
      const gst = calculateGST(subtotal, data.taxRate, data.isInterstate || false);
      const total = subtotal + gst.totalTax;

      const invoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: `INV-${String(count).padStart(4, "0")}`,
        customerName: data.customerName,
        lineItems,
        taxRate: data.taxRate,
        subtotal,
        taxAmount: gst.totalTax,
        total,
        status: "draft",
        reconciliationStatus: "unreconciled",
        createdAt: new Date().toISOString(),
        organizationId: orgId,
        customerGstin: data.customerGstin,
        placeOfSupply: data.placeOfSupply,
        isInterstate: data.isInterstate,
        cgstAmount: gst.cgst,
        sgstAmount: gst.sgst,
        igstAmount: gst.igst,
        currency: data.currency || currency,
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
    [currentOrg, refreshData, currency]
  );

  const addExpense = useCallback(
    async (data: {
      vendorName: string;
      amount: number;
      category: string;
      date: string;
      description?: string;
      currency?: CurrencyCode;
    }) => {
      const orgId = currentOrg?.id || "";

      const expense: Expense = {
        id: crypto.randomUUID(),
        ...data,
        reconciliationStatus: "unreconciled",
        createdAt: new Date().toISOString(),
        organizationId: orgId,
        currency: data.currency || currency,
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
    [currentOrg, refreshData, currency]
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
