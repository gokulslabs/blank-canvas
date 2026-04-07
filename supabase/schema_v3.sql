-- ============================================================
-- LedgerFlow Auth Migration
-- Run this ONCE in your Supabase SQL Editor
-- ============================================================

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Organizations table (recreate with owner_id)
-- Add owner_id if not exists
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
-- Drop old user_id column if it exists (from previous migration attempt)
ALTER TABLE organizations DROP COLUMN IF EXISTS user_id;

-- 3. Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'accountant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Ensure organization_id exists on all data tables (already exists)
-- invoices, expenses, journal_entries already have organization_id
-- accounts are global (shared chart of accounts)

-- 5. GST columns on invoices (if not already added)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_gstin TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_interstate BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0;

-- 6. Currency columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- 7. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Helper function: get user's org IDs (avoids recursion in RLS)
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
$$;

-- ============================================================
-- 9. RLS Policies
-- ============================================================

-- Drop ALL old policies first
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- === Profiles ===
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- === Organization Members ===
CREATE POLICY "Users can view own memberships"
  ON organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can manage members"
  ON organization_members FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners can delete members"
  ON organization_members FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- === Organizations ===
CREATE POLICY "Users can view their orgs"
  ON organizations FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Authenticated users can create orgs"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their orgs"
  ON organizations FOR UPDATE TO authenticated
  USING (id IN (SELECT public.get_user_org_ids(auth.uid())))
  WITH CHECK (id IN (SELECT public.get_user_org_ids(auth.uid())));

-- === Accounts (global, shared) ===
CREATE POLICY "Authenticated can read accounts"
  ON accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert accounts"
  ON accounts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update accounts"
  ON accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- === Invoices ===
CREATE POLICY "Users can view org invoices"
  ON invoices FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can create org invoices"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update org invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete org invoices"
  ON invoices FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- === Expenses ===
CREATE POLICY "Users can view org expenses"
  ON expenses FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can create org expenses"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update org expenses"
  ON expenses FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete org expenses"
  ON expenses FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- === Journal Entries ===
CREATE POLICY "Users can view org journal entries"
  ON journal_entries FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can create org journal entries"
  ON journal_entries FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete org journal entries"
  ON journal_entries FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- === Journal Lines ===
CREATE POLICY "Users can view org journal lines"
  ON journal_lines FOR SELECT TO authenticated
  USING (journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Users can create org journal lines"
  ON journal_lines FOR INSERT TO authenticated
  WITH CHECK (journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  ));

CREATE POLICY "Users can delete org journal lines"
  ON journal_lines FOR DELETE TO authenticated
  USING (journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
  ));

-- === Bank Transactions ===
CREATE POLICY "Users can view org bank transactions"
  ON bank_transactions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can create org bank transactions"
  ON bank_transactions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update org bank transactions"
  ON bank_transactions FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete org bank transactions"
  ON bank_transactions FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- ============================================================
-- 10. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
