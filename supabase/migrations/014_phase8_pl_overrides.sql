-- ============================================================
-- 014_phase8_pl_overrides.sql
-- Phase 8 — P&L Report + Daily Sales Summary
-- Adds pl_monthly_overrides for per-branch monthly EB bill
-- NOTE: pl_salary_entries already exists from 001_complete_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS pl_monthly_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch      VARCHAR(10) NOT NULL,
  month       DATE NOT NULL,  -- first day of month (YYYY-MM-01)
  eb_bill_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  updated_by  UUID REFERENCES employees(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch, month)
);

CREATE INDEX IF NOT EXISTS idx_pl_monthly_overrides_branch_month
  ON pl_monthly_overrides(branch, month);

GRANT ALL ON pl_monthly_overrides TO anon, authenticated;

INSERT INTO migrations_log (migration_name, applied_by, notes)
VALUES (
  '014_phase8_pl_overrides',
  'Phase 8',
  'P&L Report + Daily Sales Summary — adds pl_monthly_overrides for EB bill and notes per branch per month'
)
ON CONFLICT (migration_name) DO NOTHING;
