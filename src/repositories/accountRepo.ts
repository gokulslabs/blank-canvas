/**
 * Account Repository — Supabase-backed
 */

import { Account } from "@/types/accounting";
import { supabase } from "@/integrations/supabase/client";

export const accountRepo = {
  async findAll(): Promise<Account[]> {
    const { data, error } = await supabase.from("accounts").select("*");
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async findById(id: string): Promise<Account | undefined> {
    const { data, error } = await supabase.from("accounts").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : undefined;
  },

  async findByCode(code: string): Promise<Account | undefined> {
    const { data, error } = await supabase.from("accounts").select("*").eq("code", code).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : undefined;
  },

  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabase.from("accounts").select("id", { count: "exact", head: true }).eq("id", id);
    if (error) throw error;
    return (count || 0) > 0;
  },

  async findByType(type: Account["type"]): Promise<Account[]> {
    const { data, error } = await supabase.from("accounts").select("*").eq("type", type);
    if (error) throw error;
    return (data || []).map(mapRow);
  },
};

function mapRow(row: any): Account {
  return { id: row.id, code: row.code, name: row.name, type: row.type, description: row.description };
}
