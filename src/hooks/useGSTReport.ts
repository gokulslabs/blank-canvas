import { useQuery } from "@tanstack/react-query";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { GSTSummary, GSTInvoiceRow, HSNSummaryRow } from "@/types/accounting";
import { classifyB2BorB2C } from "@/lib/gst";

export function useGSTReport(orgId: string | undefined) {
  return useQuery<GSTSummary>({
    queryKey: ["gst-report", orgId],
    queryFn: async () => {
      const invoices = await invoiceRepo.findByOrg(orgId!);

      let totalTaxableValue = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;
      let b2bCount = 0;
      let b2cCount = 0;
      let b2bValue = 0;
      let b2cValue = 0;

      const hsnMap = new Map<string, HSNSummaryRow>();

      const rows: GSTInvoiceRow[] = invoices.map((inv) => {
        const taxable = inv.subtotal;
        const cgst = inv.cgstAmount || 0;
        const sgst = inv.sgstAmount || 0;
        const igst = inv.igstAmount || 0;
        const classification = classifyB2BorB2C(inv.customerGstin);

        totalTaxableValue += taxable;
        totalCGST += cgst;
        totalSGST += sgst;
        totalIGST += igst;

        if (classification === "B2B") {
          b2bCount++;
          b2bValue += inv.total;
        } else {
          b2cCount++;
          b2cValue += inv.total;
        }

        // HSN grouping
        const hsnCodes: string[] = [];
        for (const li of inv.lineItems) {
          const code = li.hsnCode || "N/A";
          hsnCodes.push(code);
          const existing = hsnMap.get(code);
          const liTaxRate = li.taxRate ?? inv.taxRate;
          const liTax = li.total * (liTaxRate / 100);

          if (existing) {
            existing.quantity += li.quantity;
            existing.taxableValue += li.total;
            if (inv.isInterstate) {
              existing.igst += liTax;
            } else {
              existing.cgst += liTax / 2;
              existing.sgst += liTax / 2;
            }
            existing.totalTax += liTax;
          } else {
            hsnMap.set(code, {
              hsnCode: code,
              description: li.name,
              quantity: li.quantity,
              taxableValue: li.total,
              cgst: inv.isInterstate ? 0 : liTax / 2,
              sgst: inv.isInterstate ? 0 : liTax / 2,
              igst: inv.isInterstate ? liTax : 0,
              totalTax: liTax,
            });
          }
        }

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
          placeOfSupply: inv.placeOfSupply || "",
          isInterstate: inv.isInterstate || false,
          classification,
          hsnCodes,
        };
      });

      return {
        totalTaxableValue,
        totalCGST,
        totalSGST,
        totalIGST,
        totalTax: totalCGST + totalSGST + totalIGST,
        b2bCount,
        b2cCount,
        b2bValue,
        b2cValue,
        invoices: rows,
        hsnSummary: Array.from(hsnMap.values()),
      };
    },
    enabled: !!orgId,
  });
}
