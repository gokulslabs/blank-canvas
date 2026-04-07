import { Account } from "@/types/accounting";

/**
 * Predefined Chart of Accounts
 * Standard accounts for a small business accounting system
 */
export const ACCOUNTS: Account[] = [
  {
    id: "acc-1000",
    code: "1000",
    name: "Cash",
    type: "asset",
    description: "Cash on hand and in registers",
  },
  {
    id: "acc-1100",
    code: "1100",
    name: "Bank",
    type: "asset",
    description: "Business bank accounts",
  },
  {
    id: "acc-1200",
    code: "1200",
    name: "Accounts Receivable",
    type: "asset",
    description: "Money owed by customers",
  },
  {
    id: "acc-4000",
    code: "4000",
    name: "Revenue",
    type: "revenue",
    description: "Income from sales and services",
  },
  {
    id: "acc-5000",
    code: "5000",
    name: "Expenses",
    type: "expense",
    description: "General business expenses",
  },
];
