-- =====================================================================
-- 019_phase13_postpaid_monthly.sql
-- Phase 13 — Post-Paid month-wise ledger
-- Adds payment_month to postpaid_payments.
-- Adds postpaid_monthly_summary table.
-- NEVER modifies existing columns — additive only.
-- =====================================================================

ALTER TABLE postpaid_payments
  ADD COLUMN IF NOT EXISTS payment_month DATE;  -- first day of the month this payment covers

CREATE TABLE IF NOT EXISTS postpaid_monthly_summary (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES postpaid_customers(id) ON DELETE CASCADE,
  branch        TEXT NOT NULL,
  month         DATE NOT NULL,  -- first day of the month
  total_credit  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid    NUMERIC(10,2) NOT NULL DEFAULT 0,
  outstanding   NUMERIC(10,2) GENERATED ALWAYS AS (total_credit - total_paid) STORED,
  carry_forward NUMERIC(10,2) NOT NULL DEFAULT 0,  -- negative = advance, positive = overdue
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, month)
);

GRANT ALL ON postpaid_monthly_summary TO anon, authenticated;

INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '019_phase13_postpaid_monthly',
  'Phase 13',
  'Add payment_month to postpaid_payments; add postpaid_monthly_summary table for month-wise ledger'
)
ON CONFLICT (migration_name) DO NOTHING;
