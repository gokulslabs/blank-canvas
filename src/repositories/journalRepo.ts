/**
 * Journal Repository — Supabase-backed
 * Core of the accounting system.
 */

import { JournalEntry, JournalLine } from "@/types/accounting";
import { supabase } from "@/integrations/supabase/client";

export const journalRepo = {
  async insertEntry(entry: JournalEntry): Promise<void> {
    const { error } = await supabase.from("journal_entries").insert({
      id: entry.id,
      organization_id: entry.organizationId,
      date: entry.date,
      description: entry.description,
      reference_type: entry.referenceType,
      reference_id: entry.referenceId,
      created_at: entry.createdAt,
    });
    if (error) throw error;
  },

  async insertLines(lines: JournalLine[]): Promise<void> {
    const rows = lines.map((l) => ({
      id: l.id,
      journal_entry_id: l.journalEntryId,
      account_id: l.accountId,
      debit: l.debit,
      credit: l.credit,
    }));
    const { error } = await supabase.from("journal_lines").insert(rows);
    if (error) throw error;
  },

  async findEntriesByOrg(organizationId: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) throw error;
    return (data || []).map(mapEntry);
  },

  async findLinesByEntry(journalEntryId: string): Promise<JournalLine[]> {
    const { data, error } = await supabase
      .from("journal_lines")
      .select("*")
      .eq("journal_entry_id", journalEntryId);
    if (error) throw error;
    return (data || []).map(mapLine);
  },

  /**
   * Get all journal lines for an organization (joins through entries).
   * Primary query for reporting.
   */
  async findLinesByOrg(organizationId: string): Promise<JournalLine[]> {
    const { data, error } = await supabase
      .from("journal_lines")
      .select("*, journal_entries!inner(organization_id)")
      .eq("journal_entries.organization_id", organizationId);
    if (error) throw error;
    return (data || []).map(mapLine);
  },

  async findLinesByAccount(organizationId: string, accountId: string): Promise<JournalLine[]> {
    const { data, error } = await supabase
      .from("journal_lines")
      .select("*, journal_entries!inner(organization_id)")
      .eq("journal_entries.organization_id", organizationId)
      .eq("account_id", accountId);
    if (error) throw error;
    return (data || []).map(mapLine);
  },

  async findEntriesByReference(referenceId: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("reference_id", referenceId);
    if (error) throw error;
    return (data || []).map(mapEntry);
  },

  async deleteEntry(id: string): Promise<void> {
    // Delete lines first, then entry
    const { error: linesError } = await supabase
      .from("journal_lines")
      .delete()
      .eq("journal_entry_id", id);
    if (linesError) throw linesError;
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async findEntriesByOrgWithDates(organizationId: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("organization_id", organizationId)
      .order("date", { ascending: true });
    if (error) throw error;
    return (data || []).map(mapEntry);
  },
};

function mapEntry(row: any): JournalEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    date: row.date,
    description: row.description,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdAt: row.created_at,
  };
}

function mapLine(row: any): JournalLine {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    accountId: row.account_id,
    debit: Number(row.debit),
    credit: Number(row.credit),
  };
}
