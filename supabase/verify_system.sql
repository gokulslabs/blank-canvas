-- ============================================================
-- LedgerFlow System Verification Queries
-- Run ALL of these in Supabase SQL Editor
-- ============================================================

-- 1. Check all required tables & columns exist
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
  'profiles','organizations','organization_members',
  'bank_transactions','invoices','expenses',
  'journal_entries','journal_lines','accounts'
)
ORDER BY table_name, ordinal_position;

-- 2. Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 3. List all RLS policies
SELECT tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Check helper functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_org_ids', 'handle_new_user');

-- 5. Check signup trigger on auth.users
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth';
