/**
 * Invoice Repository — Supabase-backed
 */

import { Invoice } from "@/types/accounting";
import { supabase } from "@/integrations/supabase/client";

export const invoiceRepo = {
  async insert(invoice: Invoice): Promise<void> {
    const { error } = await supabase.from("invoices").insert({
      id: invoice.id,
      organization_id: invoice.organizationId,
      invoice_number: invoice.invoiceNumber,
      customer_name: invoice.customerName,
      line_items: invoice.lineItems,
      tax_rate: invoice.taxRate,
      subtotal: invoice.subtotal,
      tax_amount: invoice.taxAmount,
      total: invoice.total,
      status: invoice.status,
      reconciliation_status: invoice.reconciliationStatus,
      created_at: invoice.createdAt,
    });
    if (error) throw error;
  },

  async findByOrg(organizationId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async findById(id: string): Promise<Invoice | undefined> {
    const { data, error } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : undefined;
  },

  async count(organizationId: string): Promise<number> {
    const { count, error } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    if (error) throw error;
    return count || 0;
  },

  async updateReconciliationStatus(id: string, status: "unreconciled" | "reconciled"): Promise<void> {
    const { error } = await supabase
      .from("invoices")
      .update({ reconciliation_status: status })
      .eq("id", id);
    if (error) throw error;
  },

  async update(invoice: Invoice): Promise<void> {
    const { error } = await supabase
      .from("invoices")
      .update({
        customer_name: invoice.customerName,
        line_items: invoice.lineItems,
        tax_rate: invoice.taxRate,
        subtotal: invoice.subtotal,
        tax_amount: invoice.taxAmount,
        total: invoice.total,
        status: invoice.status,
      })
      .eq("id", invoice.id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) throw error;
  },
};

function mapRow(row: any): Invoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    lineItems: row.line_items || [],
    taxRate: Number(row.tax_rate),
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    status: row.status,
    reconciliationStatus: row.reconciliation_status || "unreconciled",
    createdAt: row.created_at,
  };
}
