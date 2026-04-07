-- ============================================================
-- LedgerFlow Schema Update: Bank Transactions + Reconciliation
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Bank Transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  status TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched')),
  reference_id UUID,
  reference_type TEXT CHECK (reference_type IN ('invoice', 'expense')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_org ON bank_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);

-- 2. RLS
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on bank_transactions" ON bank_transactions FOR ALL USING (true) WITH CHECK (true);

-- 3. Add reconciliation status to invoices and expenses (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='reconciliation_status') THEN
    ALTER TABLE invoices ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'unreconciled' CHECK (reconciliation_status IN ('unreconciled', 'reconciled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='reconciliation_status') THEN
    ALTER TABLE expenses ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'unreconciled' CHECK (reconciliation_status IN ('unreconciled', 'reconciled'));
  END IF;
END $$;
