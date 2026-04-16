-- ============================================================
-- 010_phase5_additions.sql
-- Phase 5 — Vendor Payments, Post-Paid Customers, Item Alert Thresholds
-- All vendor payment tables already exist in 001_complete_schema.sql.
-- This migration adds the columns required by the Phase 5 UI.
-- ============================================================

-- ── Item Master: alert threshold fields for Phase 10 Alert Manager ──
-- alert_days_threshold: if item not purchased for X days → fire owner alert
-- wastage_threshold_percent: if daily wastage % exceeds this → fire owner alert
ALTER TABLE item_master
  ADD COLUMN IF NOT EXISTS alert_days_threshold INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wastage_threshold_percent DECIMAL(5,2) DEFAULT 5.00;

-- ── Stock Entries: last purchased date tracking for alert engine ──
-- auto-set when purchase > 0 on any stock entry save
ALTER TABLE stock_entries
  ADD COLUMN IF NOT EXISTS last_purchased_date DATE;

-- Trigger: when purchase > 0, auto-set last_purchased_date = entry_date
CREATE OR REPLACE FUNCTION set_last_purchased_date() RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.purchase, 0) > 0 THEN
    NEW.last_purchased_date := COALESCE(NEW.entry_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_last_purchased_date ON stock_entries;
CREATE TRIGGER trg_last_purchased_date
  BEFORE INSERT OR UPDATE ON stock_entries
  FOR EACH ROW EXECUTE FUNCTION set_last_purchased_date();

-- ── vendor_payment_cycles_log: add cycle_type and notes ──
ALTER TABLE vendor_payment_cycles_log
  ADD COLUMN IF NOT EXISTS cycle_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── vendor_manual_bills: add vendor_id for direct vendor reference ──
-- Needed when a bill is added before a cycle_log is created
ALTER TABLE vendor_manual_bills
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

-- ── vendor_auto_calc_snapshot: add owner_note field ──
ALTER TABLE vendor_auto_calc_snapshot
  ADD COLUMN IF NOT EXISTS owner_note TEXT;

-- ─── Register migration ───────────────────────────────────────

INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '010_phase5_additions',
  'Phase 5',
  'Item alert threshold fields (alert_days_threshold, wastage_threshold_percent), last_purchased_date on stock_entries with auto-trigger, vendor payment cycle_type and notes columns, vendor_id on vendor_manual_bills'
)
ON CONFLICT (migration_name) DO NOTHING;
