/**
 * Bank Transaction Repository — Supabase-backed
 */

import { BankTransaction } from "@/types/accounting";
import { supabase } from "@/integrations/supabase/client";

export const bankTransactionRepo = {
  async insertMany(transactions: BankTransaction[]): Promise<void> {
    const rows = transactions.map((t) => ({
      id: t.id,
      organization_id: t.organizationId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      status: t.status,
      reference_id: t.referenceId || null,
      reference_type: t.referenceType || null,
      created_at: t.createdAt,
    }));
    const { error } = await supabase.from("bank_transactions").insert(rows);
    if (error) throw error;
  },

  async findByOrg(organizationId: string): Promise<BankTransaction[]> {
    const { data, error } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async findUnmatched(organizationId: string): Promise<BankTransaction[]> {
    const { data, error } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "unmatched")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async markMatched(id: string, referenceId: string, referenceType: "invoice" | "expense"): Promise<void> {
    const { error } = await supabase
      .from("bank_transactions")
      .update({ status: "matched", reference_id: referenceId, reference_type: referenceType })
      .eq("id", id);
    if (error) throw error;
  },

  async countByStatus(organizationId: string): Promise<{ matched: number; unmatched: number; total: number }> {
    const { data, error } = await supabase
      .from("bank_transactions")
      .select("status")
      .eq("organization_id", organizationId);
    if (error) throw error;
    const all = data || [];
    const matched = all.filter((r) => r.status === "matched").length;
    const unmatched = all.filter((r) => r.status === "unmatched").length;
    return { matched, unmatched, total: all.length };
  },
};

function mapRow(row: any): BankTransaction {
  return {
    id: row.id,
    organizationId: row.organization_id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    type: row.type,
    status: row.status,
    referenceId: row.reference_id || undefined,
    referenceType: row.reference_type || undefined,
    createdAt: row.created_at,
  };
}
