/**
 * Invoice Repository — Supabase-backed
 */

import { Invoice } from "@/types/accounting";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyCode } from "@/lib/currency";

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
      amount_paid: invoice.amountPaid || 0,
      amount_due: invoice.amountDue ?? invoice.total,
      status: invoice.status,
      reconciliation_status: invoice.reconciliationStatus,
      created_at: invoice.createdAt,
      customer_gstin: invoice.customerGstin || '',
      place_of_supply: invoice.placeOfSupply || '',
      is_interstate: invoice.isInterstate || false,
      cgst_amount: invoice.cgstAmount || 0,
      sgst_amount: invoice.sgstAmount || 0,
      igst_amount: invoice.igstAmount || 0,
      currency: invoice.currency || 'INR',
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
        amount_paid: invoice.amountPaid || 0,
        amount_due: invoice.amountDue ?? invoice.total,
        status: invoice.status,
        customer_gstin: invoice.customerGstin || '',
        place_of_supply: invoice.placeOfSupply || '',
        is_interstate: invoice.isInterstate || false,
        cgst_amount: invoice.cgstAmount || 0,
        sgst_amount: invoice.sgstAmount || 0,
        igst_amount: invoice.igstAmount || 0,
        currency: invoice.currency || 'INR',
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
  const total = Number(row.total);
  const amountPaid = Number(row.amount_paid || 0);
  return {
    id: row.id,
    organizationId: row.organization_id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    lineItems: row.line_items || [],
    taxRate: Number(row.tax_rate),
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    total,
    amountPaid,
    amountDue: row.amount_due != null ? Number(row.amount_due) : total - amountPaid,
    status: row.status,
    reconciliationStatus: row.reconciliation_status || "unreconciled",
    createdAt: row.created_at,
    customerGstin: row.customer_gstin || '',
    placeOfSupply: row.place_of_supply || '',
    isInterstate: row.is_interstate || false,
    cgstAmount: Number(row.cgst_amount || 0),
    sgstAmount: Number(row.sgst_amount || 0),
    igstAmount: Number(row.igst_amount || 0),
    currency: (row.currency || 'INR') as CurrencyCode,
  };
}
