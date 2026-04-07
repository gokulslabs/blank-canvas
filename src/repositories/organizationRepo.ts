/**
 * Organization Repository — Supabase-backed
 */

import { Organization } from "@/types/accounting";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyCode } from "@/lib/currency";

export const organizationRepo = {
  async findAll(): Promise<Organization[]> {
    const { data, error } = await supabase.from("organizations").select("*").order("created_at");
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async findById(id: string): Promise<Organization | undefined> {
    const { data, error } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : undefined;
  },

  async insert(org: Organization): Promise<void> {
    const { error } = await supabase.from("organizations").insert({
      id: org.id,
      name: org.name,
      currency: org.currency,
      created_at: org.createdAt,
    });
    if (error) throw error;
  },
};

function mapRow(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    currency: (row.currency || "INR") as CurrencyCode,
    createdAt: row.created_at,
  };
}
