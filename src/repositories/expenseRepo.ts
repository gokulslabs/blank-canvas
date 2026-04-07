/**
 * Expense Repository — Supabase-backed
 */

import { Expense } from "@/types/accounting";
import { supabase } from "@/integrations/supabase/client";

export const expenseRepo = {
  async insert(expense: Expense): Promise<void> {
    const { error } = await supabase.from("expenses").insert({
      id: expense.id,
      organization_id: expense.organizationId,
      vendor_name: expense.vendorName,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      description: expense.description,
      reconciliation_status: expense.reconciliationStatus,
      created_at: expense.createdAt,
    });
    if (error) throw error;
  },

  async findByOrg(organizationId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async findById(id: string): Promise<Expense | undefined> {
    const { data, error } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : undefined;
  },

  async count(organizationId: string): Promise<number> {
    const { count, error } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    if (error) throw error;
    return count || 0;
  },

  async updateReconciliationStatus(id: string, status: "unreconciled" | "reconciled"): Promise<void> {
    const { error } = await supabase
      .from("expenses")
      .update({ reconciliation_status: status })
      .eq("id", id);
    if (error) throw error;
  },
};

function mapRow(row: any): Expense {
  return {
    id: row.id,
    organizationId: row.organization_id,
    vendorName: row.vendor_name,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    description: row.description,
    reconciliationStatus: row.reconciliation_status || "unreconciled",
    createdAt: row.created_at,
  };
}
