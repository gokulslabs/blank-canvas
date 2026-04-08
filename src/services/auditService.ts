/**
 * Audit Trail Service — logs key actions to audit_logs table
 */

import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "payment";
export type AuditEntityType = "invoice" | "expense" | "payment" | "organization";

interface AuditLogEntry {
  organizationId: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      id: crypto.randomUUID(),
      organization_id: entry.organizationId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("Audit log failed (non-blocking):", error.message);
    }
  } catch (err) {
    // Audit logging should never break the main flow
    console.warn("Audit log error:", err);
  }
}

export async function getAuditLogs(organizationId: string, limit = 50) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
