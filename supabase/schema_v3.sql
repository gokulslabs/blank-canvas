-- ============================================================
-- LedgerFlow Schema v3: Auth, GST, Multi-Currency
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. User Roles
CREATE TYPE public.app_role AS ENUM ('owner', 'accountant');

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Add user_id to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. GST fields on invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_gstin TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_interstate BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0;

-- 4. Multi-Currency: currency on invoices and expenses
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- 5. Profile trigger — auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. RLS Policies

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all on accounts" ON accounts;
DROP POLICY IF EXISTS "Allow all on invoices" ON invoices;
DROP POLICY IF EXISTS "Allow all on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow all on journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "Allow all on journal_lines" ON journal_lines;
DROP POLICY IF EXISTS "Allow all on bank_transactions" ON bank_transactions;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- User roles: users can read their own roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Organizations: user owns their orgs
CREATE POLICY "Users can view own orgs"
  ON organizations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create orgs"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own orgs"
  ON organizations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Accounts: shared across all users (chart of accounts is global)
CREATE POLICY "Authenticated can read accounts"
  ON accounts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert accounts"
  ON accounts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update accounts"
  ON accounts FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoices: user can access invoices in their orgs
CREATE POLICY "Users can view own org invoices"
  ON invoices FOR SELECT TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can create invoices in own orgs"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own org invoices"
  ON invoices FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own org invoices"
  ON invoices FOR DELETE TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- Expenses: same pattern
CREATE POLICY "Users can view own org expenses"
  ON expenses FOR SELECT TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can create expenses in own orgs"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own org expenses"
  ON expenses FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own org expenses"
  ON expenses FOR DELETE TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- Journal entries
CREATE POLICY "Users can view own org journal entries"
  ON journal_entries FOR SELECT TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can create journal entries in own orgs"
  ON journal_entries FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own org journal entries"
  ON journal_entries FOR DELETE TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- Journal lines: access via journal entry
CREATE POLICY "Users can view own org journal lines"
  ON journal_lines FOR SELECT TO authenticated
  USING (journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can create journal lines in own orgs"
  ON journal_lines FOR INSERT TO authenticated
  WITH CHECK (journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can delete own org journal lines"
  ON journal_lines FOR DELETE TO authenticated
  USING (journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid())
  ));

-- Bank transactions
CREATE POLICY "Users can view own org bank transactions"
  ON bank_transactions FOR SELECT TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own org bank transactions"
  ON bank_transactions FOR ALL TO authenticated
  USING (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE user_id = auth.uid()));

-- 8. Auto-assign owner role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_role ON auth.users;
CREATE TRIGGER on_auth_user_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
