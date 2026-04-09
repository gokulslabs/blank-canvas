/**
 * Organization Members Repository — Supabase-backed
 */

import { supabase } from "@/integrations/supabase/client";

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "accountant" | "viewer";
  createdAt: string;
}

export const organizationMemberRepo = {
  async findByUser(userId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async findByOrg(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from("organization_members")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async insert(member: { userId: string; organizationId: string; role: string }): Promise<void> {
    const { error } = await supabase.from("organization_members").insert({
      user_id: member.userId,
      organization_id: member.organizationId,
      role: member.role,
    });
    if (error) throw error;
  },

  async remove(memberId: string): Promise<void> {
    const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
    if (error) throw error;
  },
};

function mapRow(row: any): OrganizationMember {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    role: row.role,
    createdAt: row.created_at,
  };
}
