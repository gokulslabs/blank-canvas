import { useQuery } from "@tanstack/react-query";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { GSTSummary } from "@/types/accounting";

export function useGSTReport(orgId: string | undefined) {
  return useQuery<GSTSummary>({
    queryKey: ["gst-report", orgId],
    queryFn: async () => {
      const invoices = await invoiceRepo.findByOrg(orgId!);

      let totalTaxableValue = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;

      const rows = invoices.map((inv) => {
        const taxable = inv.subtotal;
        const cgst = inv.cgstAmount || 0;
        const sgst = inv.sgstAmount || 0;
        const igst = inv.igstAmount || 0;

        totalTaxableValue += taxable;
        totalCGST += cgst;
        totalSGST += sgst;
        totalIGST += igst;

        return {
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          customerGstin: inv.customerGstin || "",
          taxableValue: taxable,
          cgst,
          sgst,
          igst,
          total: inv.total,
          date: inv.createdAt,
        };
      });

      return {
        totalTaxableValue,
        totalCGST,
        totalSGST,
        totalIGST,
        totalTax: totalCGST + totalSGST + totalIGST,
        invoices: rows,
      };
    },
    enabled: !!orgId,
  });
}
