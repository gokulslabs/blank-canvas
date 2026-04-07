/**
 * Expense Repository
 */

import { Expense } from "@/types/accounting";
import { store } from "./store";

export const expenseRepo = {
  insert(expense: Expense): void {
    store.expenses.push(expense);
  },

  findByOrg(organizationId: string): Expense[] {
    return store.expenses.filter((e) => e.organizationId === organizationId);
  },

  findById(id: string): Expense | undefined {
    return store.expenses.find((e) => e.id === id);
  },

  count(organizationId: string): number {
    return store.expenses.filter((e) => e.organizationId === organizationId).length;
  },
};
