/**
 * Account Repository
 * 
 * Provides data access for the chart of accounts.
 * Currently backed by in-memory store; ready for PostgreSQL migration.
 */

import { Account } from "@/types/accounting";
import { store } from "./store";

export const accountRepo = {
  findAll(): Account[] {
    return [...store.accounts];
  },

  findById(id: string): Account | undefined {
    return store.accounts.find((a) => a.id === id);
  },

  findByCode(code: string): Account | undefined {
    return store.accounts.find((a) => a.code === code);
  },

  /** Check if an account ID exists */
  exists(id: string): boolean {
    return store.accounts.some((a) => a.id === id);
  },

  findByType(type: Account["type"]): Account[] {
    return store.accounts.filter((a) => a.type === type);
  },
};
