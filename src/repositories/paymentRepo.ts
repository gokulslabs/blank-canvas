import { Payment } from "@/types/accounting";
import { supabase } from "@/integrations/supabase/client";

export const paymentRepo = {
  async insert(payment: Payment): Promise<void> {
    const { error } = await supabase.from("payments").insert({
      id: payment.id,
      organization_id: payment.organizationId,
      invoice_id: payment.invoiceId,
      amount: payment.amount,
      method: payment.method,
      date: payment.date,
      notes: payment.notes || "",
      created_at: payment.createdAt,
    });
    if (error) throw error;
  },

  async findByOrg(organizationId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("organization_id", organizationId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async findByInvoice(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoiceId);
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) throw error;
  },
};

function mapRow(row: any): Payment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    method: row.method,
    date: row.date,
    notes: row.notes || "",
    createdAt: row.created_at,
  };
}
