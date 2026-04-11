-- ============================================================
-- 009_phase4_owner_entries.sql
-- Phase 4 — Owner Entry Modules & Expenses
-- All tables already exist in 001_complete_schema.sql.
-- This migration registers Phase 4 and adds any missing
-- columns required by the Phase 4 UI.
-- ============================================================

-- Ensure notes column exists on pl_salary_entries (Phase 4 UI uses it)
ALTER TABLE pl_salary_entries
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── Register migration ───────────────────────────────────────

INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '009_phase4_owner_entries',
  'Phase 4',
  'Owner entry modules: UPI entry, delivery payouts, cash deposits, supervisor expenses, manual expenses, Vasanth float, salary entry'
)
ON CONFLICT (migration_name) DO NOTHING;
