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
      method: "cash" | "bank" | "upi" | "card";
      date: string;
      notes?: string;
    }) => {
      const id = orgId || "";

      // Check invoice exists
      const invoice = await invoiceRepo.findById(data.invoiceId);
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status === "paid") throw new Error("Invoice is already fully paid");

      // Calculate how much has been paid already
      const existingPayments = await paymentRepo.findByInvoice(data.invoiceId);
      const totalPaid = existingPayments.reduce((s, p) => s + p.amount, 0);
      const amountDue = invoice.total - totalPaid;

      // Prevent overpayment
      if (data.amount > amountDue + 0.01) {
        throw new Error(`Payment exceeds amount due. Maximum: ${amountDue.toFixed(2)}`);
      }

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

      // Update invoice paid amounts and status
      const newTotalPaid = totalPaid + data.amount;
      const newAmountDue = invoice.total - newTotalPaid;
      const newStatus = newAmountDue <= 0.01 ? "paid" : "partially_paid";

      await invoiceRepo.update({
        ...invoice,
        amountPaid: newTotalPaid,
        amountDue: Math.max(0, newAmountDue),
        status: newStatus,
      });

      // Journal entry: DR Cash/Bank, CR Accounts Receivable
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
