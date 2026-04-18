-- Phase 6 corrections — access control tracking + item master cost seeding

-- 1. Add entry tracking to month_end_stock
ALTER TABLE month_end_stock
  ADD COLUMN IF NOT EXISTS entry_role VARCHAR(20),
  ADD COLUMN IF NOT EXISTS entry_user_id UUID REFERENCES employees(id);

-- 2. cost_price already exists in item_master; ensure default 0 so it's never NULL
UPDATE item_master SET cost_price = 0 WHERE cost_price IS NULL;
ALTER TABLE item_master ALTER COLUMN cost_price SET DEFAULT 0;
ALTER TABLE item_master ALTER COLUMN cost_price SET NOT NULL;

-- 3. Seed default cost prices for month_end_stock_config items where we know the rates
UPDATE item_master SET cost_price = 2.00    WHERE name_en = 'Boost'              AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 1.50    WHERE name_en = 'Horlicks'           AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 0.30    WHERE name_en ILIKE '%Tea Powder%'   AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 0.70    WHERE name_en ILIKE '%Coffee Powder%' AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 0.05    WHERE name_en ILIKE '%Cane Sugar%'   AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 0.05    WHERE name_en ILIKE '%White Sugar%'  AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 0.50    WHERE name_en ILIKE '%Cup Small%'    AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 1.00    WHERE name_en ILIKE '%Cup Big%'      AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 0.05    WHERE name_en ILIKE '%Cleaning%'     AND (cost_price IS NULL OR cost_price = 0);
UPDATE item_master SET cost_price = 0.50    WHERE name_en ILIKE '%Parcel%'       AND (cost_price IS NULL OR cost_price = 0);

-- 4. Ensure PostgREST can access item_master (may already be granted)
GRANT ALL ON item_master TO anon, authenticated;

-- Register
INSERT INTO migrations_log (migration_name, applied_by, notes)
VALUES (
  '013_phase6_corrections',
  'Phase 6 corrections',
  'Add entry_role/entry_user_id to month_end_stock; seed cost_price defaults; fix item_master NOT NULL'
)
ON CONFLICT DO NOTHING;
