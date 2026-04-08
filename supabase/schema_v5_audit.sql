-- ============================================================
-- Schema v5: Audit Logs + Organization GST fields
-- ============================================================

-- 1. Add state and gstin to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';

-- 2. Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'payment')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'expense', 'payment', 'organization')),
  entity_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: users can view/insert audit logs for their orgs
CREATE POLICY "Users can view org audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert org audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
