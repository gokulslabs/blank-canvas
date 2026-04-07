/**
 * Invoice Repository
 */

import { Invoice } from "@/types/accounting";
import { store } from "./store";

export const invoiceRepo = {
  insert(invoice: Invoice): void {
    store.invoices.push(invoice);
  },

  findByOrg(organizationId: string): Invoice[] {
    return store.invoices.filter((i) => i.organizationId === organizationId);
  },

  findById(id: string): Invoice | undefined {
    return store.invoices.find((i) => i.id === id);
  },

  count(organizationId: string): number {
    return store.invoices.filter((i) => i.organizationId === organizationId).length;
  },
};
