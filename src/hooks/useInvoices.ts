import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { accountRepo } from "@/repositories/accountRepo";
import { createJournalEntry, deleteJournalEntriesByReference } from "@/services/accountingService";
import { Invoice, LineItem } from "@/types/accounting";
import { toast } from "sonner";

function invalidateAll(qc: ReturnType<typeof useQueryClient>, orgId: string | undefined) {
  qc.invalidateQueries({ queryKey: ["invoices", orgId] });
  qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
  qc.invalidateQueries({ queryKey: ["pnl"] });
  qc.invalidateQueries({ queryKey: ["balance-sheet", orgId] });
  qc.invalidateQueries({ queryKey: ["revenue-over-time", orgId] });
}

export function useInvoices(orgId: string | undefined) {
  return useQuery({
    queryKey: ["invoices", orgId],
    queryFn: () => invoiceRepo.findByOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateInvoice(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      customerName: string;
      lineItems: Omit<LineItem, "id" | "total">[];
      taxRate: number;
    }) => {
      const id = orgId || "";
      const count = (await invoiceRepo.count(id)) + 1;
      const lineItems: LineItem[] = data.lineItems.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        total: item.price * item.quantity,
      }));
      const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
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
        organizationId: id,
      };

      await invoiceRepo.insert(invoice);

      const [arAccount, revenueAccount] = await Promise.all([
        accountRepo.findByCode("1200"),
        accountRepo.findByCode("4000"),
      ]);

      await createJournalEntry({
        organizationId: id,
        date: new Date().toISOString(),
        description: `Invoice #${invoice.invoiceNumber} — ${invoice.customerName}`,
        referenceType: "invoice",
        referenceId: invoice.id,
        lines: [
          { accountId: arAccount!.id, debit: total, credit: 0 },
          { accountId: revenueAccount!.id, debit: 0, credit: total },
        ],
      });

      return invoice;
    },
    onSuccess: () => {
      invalidateAll(qc, orgId);
      toast.success("Invoice created");
    },
    onError: (err) => {
      toast.error("Failed to create invoice: " + (err as Error).message);
    },
  });
}

export function useUpdateInvoice(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      await deleteJournalEntriesByReference(invoice.id);
      await invoiceRepo.update(invoice);

      const [arAccount, revenueAccount] = await Promise.all([
        accountRepo.findByCode("1200"),
        accountRepo.findByCode("4000"),
      ]);

      await createJournalEntry({
        organizationId: invoice.organizationId,
        date: new Date().toISOString(),
        description: `Invoice #${invoice.invoiceNumber} — ${invoice.customerName}`,
        referenceType: "invoice",
        referenceId: invoice.id,
        lines: [
          { accountId: arAccount!.id, debit: invoice.total, credit: 0 },
          { accountId: revenueAccount!.id, debit: 0, credit: invoice.total },
        ],
      });
    },
    onSuccess: () => {
      invalidateAll(qc, orgId);
      toast.success("Invoice updated");
    },
    onError: (err) => {
      toast.error("Failed to update invoice: " + (err as Error).message);
    },
  });
}

export function useDeleteInvoice(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      await deleteJournalEntriesByReference(invoiceId);
      await invoiceRepo.delete(invoiceId);
    },
    onSuccess: () => {
      invalidateAll(qc, orgId);
      toast.success("Invoice deleted");
    },
    onError: (err) => {
      toast.error("Failed to delete invoice: " + (err as Error).message);
    },
  });
}

/**
 * Mark an invoice as paid.
 * Creates a journal entry: Debit Cash (1000), Credit AR (1200)
 */
export function useMarkInvoicePaid(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      // Update status to paid
      await invoiceRepo.update({ ...invoice, status: "paid" });

      const [cashAccount, arAccount] = await Promise.all([
        accountRepo.findByCode("1000"),
        accountRepo.findByCode("1200"),
      ]);

      // Payment journal entry: Cash received, AR cleared
      await createJournalEntry({
        organizationId: invoice.organizationId,
        date: new Date().toISOString(),
        description: `Payment received — Invoice #${invoice.invoiceNumber}`,
        referenceType: "invoice",
        referenceId: invoice.id,
        lines: [
          { accountId: cashAccount!.id, debit: invoice.total, credit: 0 },
          { accountId: arAccount!.id, debit: 0, credit: invoice.total },
        ],
      });
    },
    onSuccess: () => {
      invalidateAll(qc, orgId);
      toast.success("Invoice marked as paid — payment recorded");
    },
    onError: (err) => {
      toast.error("Failed to mark as paid: " + (err as Error).message);
    },
  });
}
