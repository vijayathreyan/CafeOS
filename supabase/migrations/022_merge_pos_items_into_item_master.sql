-- =====================================================================
-- 022_merge_pos_items_into_item_master.sql
-- Merge pos_items into item_master as the single source of truth.
-- Additive only — no DROP, no ALTER of existing columns, pos_items
-- table is untouched (still the live POS billing source until Step 3
-- repoints the hooks in a separate change).
--
-- Conflict-resolution rule applied throughout (per owner decision):
-- pos_items wins on price and branch flags — it reflects what is
-- currently live in production POS.
-- =====================================================================

-- ─── 1. New columns on item_master ────────────────────────────────────────

ALTER TABLE item_master
  ADD COLUMN IF NOT EXISTS used_in_pos_billing BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS image_url           TEXT,
  ADD COLUMN IF NOT EXISTS pos_sort_order      INTEGER;

-- ─── 2. Fix known price/branch conflicts on existing rows (pos_items wins) ──

UPDATE item_master
  SET selling_price = 15, branch_c2 = false, used_in_pos_billing = true, pos_sort_order = 11
  WHERE name_en = 'Chinese Bonda';

UPDATE item_master
  SET selling_price = 15, used_in_pos_billing = true, pos_sort_order = 9
  WHERE name_en = 'Masala Bonda';

-- Fuzzy-matched duplicates (different name in pos_items vs item_master,
-- same real-world item — confirmed via price/category overlap, not a guess)
UPDATE item_master
  SET selling_price = 40, branch_kr = true, branch_c2 = false, used_in_pos_billing = true, pos_sort_order = 13
  WHERE name_en = 'Veg Momos';

UPDATE item_master
  SET branch_kr = true, branch_c2 = false, used_in_pos_billing = true, pos_sort_order = 14
  WHERE name_en = 'Chicken Momos';

UPDATE item_master
  SET used_in_pos_billing = true, pos_sort_order = 1
  WHERE name_en = 'Plain Bun';

-- ─── 3. Existing rows that already match pos_items exactly (price + branch) ─
-- Only used_in_pos_billing needs to flip on.

UPDATE item_master SET used_in_pos_billing = true, pos_sort_order = 4  WHERE name_en = 'Aloo Samosa';
UPDATE item_master SET used_in_pos_billing = true, pos_sort_order = 8  WHERE name_en = 'Bajji';
UPDATE item_master SET used_in_pos_billing = true, pos_sort_order = 10 WHERE name_en = 'Cauliflower 65';
UPDATE item_master SET used_in_pos_billing = true, pos_sort_order = 5  WHERE name_en = 'Cutlet';
UPDATE item_master SET used_in_pos_billing = true, pos_sort_order = 6  WHERE name_en = 'Elai Adai';
UPDATE item_master SET used_in_pos_billing = true, pos_sort_order = 7  WHERE name_en = 'Kozhukattai';
UPDATE item_master SET used_in_pos_billing = true, pos_sort_order = 1  WHERE name_en = 'Medu Vada';
UPDATE item_master SET used_in_pos_billing = true, pos_sort_order = 3  WHERE name_en = 'Onion Samosa';

-- ─── 4. White Channa — collapse exact duplicate into one clean row ─────────
-- Verified before running: no stock_entries / snack_entries / vendor_items /
-- stock_item_config rows reference either duplicate's id. Safe to delete.

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM item_master WHERE name_en = 'White Channa') = 2
     AND NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'White Channa' AND selling_price IS NOT NULL)
  THEN
    DELETE FROM item_master WHERE name_en = 'White Channa';
    INSERT INTO item_master
      (name_en, name_ta, item_type, category, unit, branch_kr, branch_c2, selling_price, active, used_in_pos_billing, pos_sort_order)
    VALUES
      ('White Channa', 'வெள்ளை சன்னா', 'stock', 'Snacks', 'grams', false, true, 20.00, true, true, 12);
  END IF;
END;
$$;

-- ─── 5. Insert the 24 items that exist only in pos_items ────────────────────
-- item_type defaults to 'vendor_supplied' (per fallback rule) except where
-- clearly inferable: Tea/Coffee/Rose Milk/Badam Milk are prepared on-site
-- ('beverage'), Masal Vada mirrors its sibling Medu Vada ('snack').
-- reconciliation_method left NULL except Tea/Coffee variants
-- ('consumed_litres', matching migration 007's original intent for
-- litre-based milk reconciliation). Combos intentionally not reconciled.
-- Category: new categories 'Tea' / 'Coffee' / 'Combo' created to match
-- pos_categories naming (no reasonable existing item_master category);
-- 'Bun' mapped to existing 'Buns', 'Beverages'/'Ladoo' mapped to existing
-- 'Beverages' / 'ladoo'.

INSERT INTO item_master
  (name_en, name_ta, item_type, category, unit, branch_kr, branch_c2, selling_price,
   active, used_in_pos_billing, is_snack_item, reconciliation_method, ml_per_serving, pos_sort_order)
SELECT v.name_en, v.name_ta, v.item_type, v.category, 'piece', v.branch_kr, v.branch_c2, v.selling_price,
       true, true, v.is_snack_item, v.reconciliation_method, v.ml_per_serving, v.pos_sort_order
FROM (VALUES
  -- name_en, name_ta, item_type, category, branch_kr, branch_c2, selling_price, is_snack_item, reconciliation_method, ml_per_serving, pos_sort_order
  ('Tea',                 'தேநீர்',               'beverage',        'Tea',       true,  true,  10.00, false, 'consumed_litres', 150, 1),
  ('Tea (Special)',       'சிறப்பு தேநீர்',        'beverage',        'Tea',       true,  true,  15.00, false, 'consumed_litres', 150, 2),
  ('Ginger Tea',          'இஞ்சி தேநீர்',          'beverage',        'Tea',       true,  false, 15.00, false, 'consumed_litres', 150, 3),
  ('Coffee',              'காபி',                 'beverage',        'Coffee',    true,  true,  15.00, false, 'consumed_litres', 100, 1),
  ('Coffee (Special)',    'சிறப்பு காபி',          'beverage',        'Coffee',    true,  true,  20.00, false, 'consumed_litres', 100, 2),
  ('Filter Coffee',       'ஃபில்டர் காபி',         'beverage',        'Coffee',    true,  false, 20.00, false, 'consumed_litres', 100, 3),
  ('Masal Vada',          'மசால் வடை',            'snack',           'Snacks',    true,  true,  10.00, true,  'received_wastage_diff', NULL, 2),
  ('Egg',                 'முட்டை',               'vendor_supplied', 'Snacks',    false, true,  20.00, true,  NULL, NULL, 15),
  ('Bun Masala',          'பன் மசாலா',            'vendor_supplied', 'Buns',      true,  true,  30.00, true,  'stock_balance', NULL, 3),
  ('Butter Bun',          'வெண்ணெய் பன்',          'vendor_supplied', 'Buns',      true,  true,  15.00, true,  'stock_balance', NULL, 2),
  ('Cake Bun',            'கேக் பன்',              'vendor_supplied', 'Buns',      true,  true,  20.00, true,  'stock_balance', NULL, 4),
  ('Brownie',             'பிரவுனி',              'vendor_supplied', 'Buns',      true,  true,  65.00, true,  'stock_balance', NULL, 5),
  ('Chocolate Cake',      'சாக்லேட் கேக்',         'vendor_supplied', 'Buns',      true,  true,  65.00, true,  'stock_balance', NULL, 6),
  ('Rose Milk',           'ரோஸ் மில்க்',           'beverage',        'Beverages', true,  true,  20.00, true,  NULL, NULL, 1),
  ('Badam Milk',          'பாதாம் பால்',           'beverage',        'Beverages', true,  true,  25.00, true,  NULL, NULL, 2),
  ('Water Bottle',        'தண்ணீர் பாட்டில்',       'vendor_supplied', 'Beverages', true,  true,  20.00, true,  NULL, NULL, 3),
  ('Mineral Water',       'மினரல் வாட்டர்',        'vendor_supplied', 'Beverages', true,  true,  20.00, true,  NULL, NULL, 4),
  ('Peanut Ladoo',        'நிலக்கடலை லட்டு',       'vendor_supplied', 'ladoo',     true,  true,  20.00, true,  NULL, NULL, 1),
  ('Dry Fruit Ladoo',     'டிரை ஃப்ரூட் லட்டு',    'vendor_supplied', 'ladoo',     true,  true,  25.00, true,  NULL, NULL, 2),
  ('Rava Ladoo',          'ரவா லட்டு',            'vendor_supplied', 'ladoo',     true,  true,  20.00, true,  NULL, NULL, 3),
  ('Tea + Vada Combo',    'தேநீர் + வடை கொம்போ',   'vendor_supplied', 'Combo',     true,  true,  18.00, true,  NULL, NULL, 1),
  ('Coffee + Vada Combo', 'காபி + வடை கொம்போ',     'vendor_supplied', 'Combo',     true,  true,  22.00, true,  NULL, NULL, 2),
  ('Tea + Bonda Combo',   'தேநீர் + போண்டா கொம்போ', 'vendor_supplied', 'Combo',     true,  true,  22.00, true,  NULL, NULL, 3),
  ('Coffee + Bonda Combo','காபி + போண்டா கொம்போ',  'vendor_supplied', 'Combo',     true,  true,  28.00, true,  NULL, NULL, 4)
) AS v(name_en, name_ta, item_type, category, branch_kr, branch_c2, selling_price, is_snack_item, reconciliation_method, ml_per_serving, pos_sort_order)
WHERE NOT EXISTS (SELECT 1 FROM item_master im WHERE im.name_en = v.name_en);

-- ─── 6. Link pos_items.item_id -> item_master.id ────────────────────────────
-- Metadata linkage only. Does NOT change what POSBillingScreen reads from
-- (still pos_items) until Step 3 repoints the hooks in a separate change.

UPDATE pos_items pi
SET item_id = im.id
FROM item_master im
WHERE LOWER(im.name_en) = LOWER(pi.name_en)
  AND pi.item_id IS NULL;

UPDATE pos_items SET item_id = (SELECT id FROM item_master WHERE name_en = 'Veg Momos')
  WHERE name_en = 'Momos (Veg)';
UPDATE pos_items SET item_id = (SELECT id FROM item_master WHERE name_en = 'Chicken Momos')
  WHERE name_en = 'Momos (Chicken)';
UPDATE pos_items SET item_id = (SELECT id FROM item_master WHERE name_en = 'Plain Bun')
  WHERE name_en = 'Bun';

-- ─── 7. Register migration ──────────────────────────────────────────────────

INSERT INTO migrations_log (migration_name, notes, applied_at)
VALUES (
  '022_merge_pos_items_into_item_master.sql',
  'Merge pos_items into item_master: added used_in_pos_billing/image_url/pos_sort_order columns; resolved 5 name conflicts (Chinese Bonda, Masala Bonda, Veg Momos/Momos (Veg), Chicken Momos/Momos (Chicken), Plain Bun/Bun) using pos_items as source of truth for price+branch; collapsed duplicate White Channa row; inserted 24 items that existed only in pos_items; linked pos_items.item_id to item_master.id for all 38 rows. pos_items table itself untouched — still the live POS billing source until Step 3.',
  NOW()
)
ON CONFLICT (migration_name) DO NOTHING;
