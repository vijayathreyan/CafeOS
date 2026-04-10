-- =====================================================================
-- 008_item_master_active_price.sql
-- Phase 3 — Add price_group, active_kr, active_c2 to item_master
-- =====================================================================

ALTER TABLE item_master
  ADD COLUMN IF NOT EXISTS price_group VARCHAR(50),
  ADD COLUMN IF NOT EXISTS active_kr   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS active_c2   BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── Register migration ───────────────────────────────────────────

INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '008_item_master_active_price',
  'Phase 3',
  'Add price_group (auto-suggested bucket), active_kr, active_c2 for per-branch active state'
)
ON CONFLICT (migration_name) DO NOTHING;
