-- =====================================================================
-- 021_vendor_milk_rate_fix.sql
-- Fix 2: Update item_master.unit = 'L' for Milk item.
-- Fix 4: Back-date Kalingaraj milk rate effective_from to 2026-01-01
--        and seed cost_price = 69 where cost_price is 0 or NULL.
-- =====================================================================

-- Fix 2: Milk item unit in item_master (the dropdown reads item_master.unit)
UPDATE item_master
SET unit = 'L'
WHERE LOWER(name_en) LIKE '%milk%'
  AND LOWER(name_en) NOT LIKE '%rose milk%'
  AND LOWER(name_en) NOT LIKE '%badam milk%';

-- Also keep stock_item_config in sync
UPDATE stock_item_config sic
SET entry_unit = 'L'
WHERE sic.item_id IN (
  SELECT id FROM item_master
  WHERE LOWER(name_en) LIKE '%milk%'
    AND LOWER(name_en) NOT LIKE '%rose milk%'
    AND LOWER(name_en) NOT LIKE '%badam milk%'
);

-- Fix 4a: Back-date effective_from to 2026-01-01 so it covers all historical purchases.
-- Only updates rows where effective_from is after 2026-01-01 (i.e. a future/late date).
UPDATE vendor_item_rates vir
SET effective_from = '2026-01-01'
WHERE vir.vendor_item_id IN (
  SELECT vi.id
  FROM vendor_items vi
  JOIN vendors v  ON v.id  = vi.vendor_id
  JOIN item_master im ON im.id = vi.item_id
  WHERE LOWER(v.business_name) LIKE '%kalingaraj%'
    AND LOWER(im.name_en) LIKE '%milk%'
    AND LOWER(im.name_en) NOT LIKE '%rose milk%'
    AND LOWER(im.name_en) NOT LIKE '%badam milk%'
)
AND vir.effective_from > '2026-01-01';

-- Fix 4b: Seed cost_price = 69 where cost_price is 0 or NULL.
UPDATE vendor_item_rates vir
SET cost_price = 69
WHERE vir.vendor_item_id IN (
  SELECT vi.id
  FROM vendor_items vi
  JOIN vendors v  ON v.id  = vi.vendor_id
  JOIN item_master im ON im.id = vi.item_id
  WHERE LOWER(v.business_name) LIKE '%kalingaraj%'
    AND LOWER(im.name_en) LIKE '%milk%'
    AND LOWER(im.name_en) NOT LIKE '%rose milk%'
    AND LOWER(im.name_en) NOT LIKE '%badam milk%'
)
AND (vir.cost_price = 0 OR vir.cost_price IS NULL);

-- Register migration
INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '021_vendor_milk_rate_fix',
  'Phase 13',
  'Fix item_master.unit = L for Milk; back-date Kalingaraj milk rate effective_from to 2026-01-01; seed cost_price = 69 where 0 or null.'
)
ON CONFLICT (migration_name) DO NOTHING;
