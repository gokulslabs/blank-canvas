/**
 * Invitation Repository — Supabase-backed
 */

import { supabase } from "@/integrations/supabase/client";

export interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  role: "owner" | "accountant";
  token: string;
  status: "pending" | "accepted";
  invitedBy: string;
  createdAt: string;
}

export const invitationRepo = {
  async findByOrg(organizationId: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async create(invitation: {
    email: string;
    organizationId: string;
    role: string;
    invitedBy: string;
  }): Promise<Invitation> {
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        email: invitation.email.toLowerCase().trim(),
        organization_id: invitation.organizationId,
        role: invitation.role,
        invited_by: invitation.invitedBy,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async revoke(id: string): Promise<void> {
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async acceptByToken(token: string): Promise<void> {
    const { error } = await supabase.rpc("accept_invitation", {
      invitation_token: token,
    });
    if (error) throw error;
  },
};

function mapRow(row: any): Invitation {
  return {
    id: row.id,
    email: row.email,
    organizationId: row.organization_id,
    role: row.role,
    token: row.token,
    status: row.status,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  };
}
