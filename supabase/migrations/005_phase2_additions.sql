-- ============================================================
-- Migration 005 — Phase 2 additions: stock levels & cash expenses
-- Adds columns needed for Phase 2 entry forms and seeds
-- weight-based stock item configuration.
-- ============================================================

-- ── stock_entries additions ──────────────────────────────────
-- Direct branch + entry_date columns for efficient querying
-- without joining daily_entries every time.
ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS branch        branch_code;
ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS entry_date    DATE;
ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS entered_by    UUID REFERENCES employees(id);
ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS entered_by_role TEXT;

-- ── expense_entries additions ────────────────────────────────
ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS entered_by_role TEXT;

-- ── Seed weight-based stock items into item_master ───────────
-- These are the items whose weight-per-unit is configurable
-- by the owner in Admin Settings (Feature 7).
INSERT INTO item_master (name_en, name_ta, item_type, category, unit, branch_kr, branch_c2)
VALUES
  ('Peanut Ladoo Bottle',   'வேர்க்கடலை லட்டு பாட்டில்',  'stock', 'ladoo',   'grams', true,  true),
  ('Dry Fruit Ladoo Bottle','ட்ரை ஃப்ரூட் லட்டு பாட்டில்','stock', 'ladoo',   'grams', true,  true),
  ('Rava Ladoo Bottle',     'ரவா லட்டு பாட்டில்',          'stock', 'ladoo',   'grams', true,  false),
  ('Peanuts/Sundal',        'வேர்க்கடலை/சுண்டல்',          'stock', 'sundal',  'grams', true,  true),
  ('Sweet Corn Packet',     'சோள கப்',                     'stock', 'snack',   'cups',  true,  true),
  ('White Channa',          'வெள்ளை சுண்டல்',              'stock', 'sundal',  'grams', false, true)
ON CONFLICT DO NOTHING;

-- ── Seed stock_item_config with default weights ───────────────
-- Each row represents the current weight-per-unit for that item.
-- New rows are inserted on each admin edit (history is retained).
INSERT INTO stock_item_config
  (item_id, entry_unit, weight_per_unit_grams, weight_per_unit_effective_from, branch, active)
SELECT
  im.id,
  'piece',
  30,
  CURRENT_DATE,
  NULL,   -- NULL branch = applies to both
  true
FROM item_master im
WHERE im.name_en = 'Peanut Ladoo Bottle'
  AND NOT EXISTS (
    SELECT 1 FROM stock_item_config sic WHERE sic.item_id = im.id AND sic.active = true
  );

INSERT INTO stock_item_config
  (item_id, entry_unit, weight_per_unit_grams, weight_per_unit_effective_from, branch, active)
SELECT
  im.id,
  'piece',
  35,
  CURRENT_DATE,
  NULL,
  true
FROM item_master im
WHERE im.name_en = 'Dry Fruit Ladoo Bottle'
  AND NOT EXISTS (
    SELECT 1 FROM stock_item_config sic WHERE sic.item_id = im.id AND sic.active = true
  );

INSERT INTO stock_item_config
  (item_id, entry_unit, weight_per_unit_grams, weight_per_unit_effective_from, branch, active)
SELECT
  im.id,
  'piece',
  25,
  CURRENT_DATE,
  NULL,
  true
FROM item_master im
WHERE im.name_en = 'Rava Ladoo Bottle'
  AND NOT EXISTS (
    SELECT 1 FROM stock_item_config sic WHERE sic.item_id = im.id AND sic.active = true
  );

INSERT INTO stock_item_config
  (item_id, entry_unit, weight_per_unit_grams, weight_per_unit_effective_from, branch, active)
SELECT
  im.id,
  'cup',
  80,
  CURRENT_DATE,
  NULL,
  true
FROM item_master im
WHERE im.name_en = 'Peanuts/Sundal'
  AND NOT EXISTS (
    SELECT 1 FROM stock_item_config sic WHERE sic.item_id = im.id AND sic.active = true
  );

INSERT INTO stock_item_config
  (item_id, entry_unit, weight_per_unit_grams, weight_per_unit_effective_from, branch, active)
SELECT
  im.id,
  'cup',
  150,
  CURRENT_DATE,
  NULL,
  true
FROM item_master im
WHERE im.name_en = 'Sweet Corn Packet'
  AND NOT EXISTS (
    SELECT 1 FROM stock_item_config sic WHERE sic.item_id = im.id AND sic.active = true
  );

-- ── Register this migration ───────────────────────────────────
INSERT INTO migrations_log (migration_name, applied_by, notes)
VALUES (
  '005_phase2_additions',
  'Phase 2',
  'Add branch/entry_date/entered_by/entered_by_role to stock_entries; add entered_by_role to expense_entries; seed weight-based items in item_master and stock_item_config'
);
