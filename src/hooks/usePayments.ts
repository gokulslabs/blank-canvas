import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentRepo } from "@/repositories/paymentRepo";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { accountRepo } from "@/repositories/accountRepo";
import { createJournalEntry } from "@/services/accountingService";
import { Payment } from "@/types/accounting";
import { toast } from "sonner";

function invalidateAll(qc: ReturnType<typeof useQueryClient>, orgId: string | undefined) {
  qc.invalidateQueries({ queryKey: ["payments", orgId] });
  qc.invalidateQueries({ queryKey: ["invoices", orgId] });
  qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
  qc.invalidateQueries({ queryKey: ["pnl"] });
  qc.invalidateQueries({ queryKey: ["balance-sheet", orgId] });
  qc.invalidateQueries({ queryKey: ["revenue-over-time", orgId] });
}

export function usePayments(orgId: string | undefined) {
  return useQuery({
    queryKey: ["payments", orgId],
    queryFn: () => paymentRepo.findByOrg(orgId!),
    enabled: !!orgId,
  });
}

export function useCreatePayment(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      invoiceId: string;
      amount: number;
      method: "cash" | "bank" | "upi";
      date: string;
      notes?: string;
    }) => {
      const id = orgId || "";

      // Check for duplicate: if invoice already has a payment, block
      const existing = await paymentRepo.findByInvoice(data.invoiceId);
      if (existing.length > 0) {
        throw new Error("This invoice already has a payment recorded");
      }

      // Check invoice exists and isn't already paid
      const invoice = await invoiceRepo.findById(data.invoiceId);
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status === "paid") throw new Error("Invoice is already marked as paid");

      const payment: Payment = {
        id: crypto.randomUUID(),
        organizationId: id,
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        date: data.date,
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };

      await paymentRepo.insert(payment);

      // Update invoice status to paid
      await invoiceRepo.update({ ...invoice, status: "paid" });

      // Create journal entry: DR Cash/Bank, CR Accounts Receivable
      const [cashAccount, arAccount] = await Promise.all([
        accountRepo.findByCode("1000"),
        accountRepo.findByCode("1200"),
      ]);

      await createJournalEntry({
        organizationId: id,
        date: data.date,
        description: `Payment received — Invoice #${invoice.invoiceNumber} (${data.method.toUpperCase()})`,
        referenceType: "payment",
        referenceId: payment.id,
        lines: [
          { accountId: cashAccount!.id, debit: data.amount, credit: 0 },
          { accountId: arAccount!.id, debit: 0, credit: data.amount },
        ],
      });

      return payment;
    },
    onSuccess: () => {
      invalidateAll(qc, orgId);
      toast.success("Payment recorded successfully");
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
  });
}
