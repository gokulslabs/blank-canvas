-- ============================================================
-- LedgerFlow Schema v4: Team Invitations
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'accountant' CHECK (role IN ('owner', 'accountant')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, organization_id)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- 2. RLS Policies

-- Owners can view invitations for their orgs
CREATE POLICY "Owners can view org invitations"
  ON invitations FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Owners can delete (revoke) invitations
CREATE POLICY "Owners can delete invitations"
  ON invitations FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Owners can update invitation status
CREATE POLICY "Owners can update invitations"
  ON invitations FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- 3. Function: auto-accept invitations on signup
-- When a new user signs up, check if they have pending invitations
-- and automatically add them to those organizations
CREATE OR REPLACE FUNCTION public.handle_invitation_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Find all pending invitations for this email
  FOR inv IN
    SELECT id, organization_id, role
    FROM public.invitations
    WHERE email = NEW.email AND status = 'pending'
  LOOP
    -- Add user to organization
    INSERT INTO public.organization_members (user_id, organization_id, role)
    VALUES (NEW.id, inv.organization_id, inv.role)
    ON CONFLICT (user_id, organization_id) DO NOTHING;

    -- Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger runs AFTER the profile trigger so profile exists first
DROP TRIGGER IF EXISTS on_auth_user_accept_invitations ON auth.users;
CREATE TRIGGER on_auth_user_accept_invitations
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_on_signup();

-- 4. Function: accept invitation for existing user (logged in)
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  -- Find the invitation
  SELECT * INTO inv FROM public.invitations
  WHERE token = invitation_token AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already accepted';
  END IF;

  IF inv.email != user_email THEN
    RAISE EXCEPTION 'This invitation is for a different email address';
  END IF;

  -- Add to organization
  INSERT INTO public.organization_members (user_id, organization_id, role)
  VALUES (auth.uid(), inv.organization_id, inv.role)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Mark accepted
  UPDATE public.invitations SET status = 'accepted' WHERE id = inv.id;
END;
$$;
