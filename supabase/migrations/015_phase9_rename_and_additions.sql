-- =====================================================================
-- 015_phase9_rename_and_additions.sql
-- Phase 9 — Rename vasanth_float tables to supervisor_float;
--           Add reconciliation_results; Extend cash_discrepancy and alert_log
-- =====================================================================

-- ─── 1. Rename vasanth_float tables to supervisor_float ───────────────────────

ALTER TABLE vasanth_float_topups RENAME TO supervisor_float_topups;
ALTER TABLE vasanth_float_balance RENAME TO supervisor_float_balance;

-- ─── 2. reconciliation_results ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reconciliation_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch          TEXT NOT NULL CHECK (branch IN ('KR', 'C2')),
  entry_date      DATE NOT NULL,
  predicted_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  reported_sales  NUMERIC(12,2) NOT NULL DEFAULT 0,
  difference      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reconciled', 'amber', 'red')),
  item_breakdown  JSONB,
  calculated_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch, entry_date)
);

GRANT ALL ON reconciliation_results TO anon, authenticated;

-- ─── 3. Extend cash_discrepancy for pre-POS Phase 9 use ───────────────────────
-- pos_session_id was NOT NULL but POS is Phase 12; make nullable so Phase 9 can
-- create records without a POS session.

ALTER TABLE cash_discrepancy
  ALTER COLUMN pos_session_id DROP NOT NULL;

ALTER TABLE cash_discrepancy
  ADD COLUMN IF NOT EXISTS shift_date       DATE,
  ADD COLUMN IF NOT EXISTS staff_name       TEXT,
  ADD COLUMN IF NOT EXISTS expected_cash    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS acknowledged_by  TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at  TIMESTAMPTZ;

-- ─── 4. Extend alert_log for Phase 9 double-alert ────────────────────────────

ALTER TABLE alert_log
  ADD COLUMN IF NOT EXISTS branch          TEXT,
  ADD COLUMN IF NOT EXISTS entry_date      DATE,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending';

-- ─── 5. Register migration ────────────────────────────────────────────────────

INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '015_phase9_rename_and_additions',
  'Phase 9',
  'Rename vasanth_float_topups/balance to supervisor_float_topups/balance; '
  'Add reconciliation_results table; Extend cash_discrepancy (nullable pos_session_id + '
  'shift_date, staff_name, expected_cash, acknowledged_by/at); '
  'Extend alert_log (branch, entry_date, delivery_status)'
)
ON CONFLICT (migration_name) DO NOTHING;
