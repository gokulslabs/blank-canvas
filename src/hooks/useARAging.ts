import { useQuery } from "@tanstack/react-query";
import { invoiceRepo } from "@/repositories/invoiceRepo";
import { Invoice } from "@/types/accounting";

export interface AgingBucket {
  label: string;
  invoices: Invoice[];
  total: number;
}

export interface ARAgingData {
  buckets: AgingBucket[];
  grandTotal: number;
}

export function useARAging(orgId: string | undefined) {
  return useQuery<ARAgingData>({
    queryKey: ["ar-aging", orgId],
    queryFn: async () => {
      const invoices = await invoiceRepo.findByOrg(orgId!);
      const unpaid = invoices.filter((inv) => inv.status !== "paid");
      const now = new Date();

      const bucket0: Invoice[] = [];
      const bucket30: Invoice[] = [];
      const bucket60: Invoice[] = [];

      for (const inv of unpaid) {
        const created = new Date(inv.createdAt);
        const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 30) bucket0.push(inv);
        else if (days <= 60) bucket30.push(inv);
        else bucket60.push(inv);
      }

      const makeBucket = (label: string, invoices: Invoice[]): AgingBucket => ({
        label,
        invoices,
        total: invoices.reduce((s, i) => s + i.total, 0),
      });

      const buckets = [
        makeBucket("0–30 days", bucket0),
        makeBucket("31–60 days", bucket30),
        makeBucket("60+ days", bucket60),
      ];

      return {
        buckets,
        grandTotal: unpaid.reduce((s, i) => s + i.total, 0),
      };
    },
    enabled: !!orgId,
  });
}
