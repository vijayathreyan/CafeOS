-- =====================================================================
-- 007_item_master_enhancements.sql
-- Phase 3 — Enhance item_master: pricing, reconciliation method,
--           POS/stock/snack flags, ml_per_serving, estimated cost per piece
-- =====================================================================

ALTER TABLE item_master
  ADD COLUMN IF NOT EXISTS selling_price             DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS cost_price                DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS reconciliation_method     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_pos_item               BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_stock_item             BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_snack_item             BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS estimated_cost_per_piece  DECIMAL(10,2);

-- ─── Seed values for known items (ILIKE matching — safe to re-run) ──

UPDATE item_master SET category='Snacks',    reconciliation_method='received_wastage_diff', selling_price=10,    cost_price=7     WHERE name_en ILIKE 'Medu Vada';
UPDATE item_master SET category='Snacks',    reconciliation_method='received_wastage_diff', selling_price=10,    cost_price=10    WHERE name_en ILIKE 'Onion Samosa';
UPDATE item_master SET category='Snacks',    reconciliation_method='received_wastage_diff', selling_price=20                      WHERE name_en ILIKE 'Aloo Samosa';
UPDATE item_master SET category='Snacks',    reconciliation_method='received_wastage_diff', selling_price=20                      WHERE name_en ILIKE 'Cutlet';
UPDATE item_master SET category='Snacks',    reconciliation_method='received_wastage_diff', selling_price=25,    cost_price=18,   branch_kr=TRUE,  branch_c2=FALSE WHERE name_en ILIKE 'Elai Adai';
UPDATE item_master SET category='Snacks',    reconciliation_method='received_wastage_diff', selling_price=15,    cost_price=10,   branch_kr=TRUE,  branch_c2=FALSE WHERE name_en ILIKE 'Kozhukattai';
UPDATE item_master SET category='Snacks',    reconciliation_method='preparation_staff',     selling_price=10,    item_type='made_in_shop', estimated_cost_per_piece=3  WHERE name_en ILIKE 'Bajji';
UPDATE item_master SET category='Snacks',    reconciliation_method='preparation_staff',     selling_price=10,    item_type='made_in_shop', estimated_cost_per_piece=4  WHERE name_en ILIKE 'Masala Bonda';
UPDATE item_master SET category='Snacks',    reconciliation_method='preparation_staff',     selling_price=20,    item_type='made_in_shop', estimated_cost_per_piece=8  WHERE name_en ILIKE 'Cauliflower 65';
UPDATE item_master SET category='Snacks',    reconciliation_method='preparation_staff',     selling_price=10,    item_type='made_in_shop', estimated_cost_per_piece=4  WHERE name_en ILIKE 'Chinese Bonda';
UPDATE item_master SET category='Bakery',    reconciliation_method='stock_balance',         selling_price=30,    cost_price=16    WHERE name_en ILIKE 'Tea Cake';
UPDATE item_master SET category='Bakery',    reconciliation_method='stock_balance',         selling_price=65,    cost_price=38    WHERE name_en ILIKE 'Brownie';
UPDATE item_master SET category='Bakery',    reconciliation_method='stock_balance',         selling_price=65,    cost_price=33    WHERE name_en ILIKE 'Choco Lava';
UPDATE item_master SET category='Bakery',    reconciliation_method='stock_balance',         selling_price=20,    cost_price=12    WHERE name_en ILIKE 'Banana Cake';
UPDATE item_master SET category='Buns',      reconciliation_method='stock_balance',         selling_price=20                      WHERE name_en ILIKE 'Cream Bun';
UPDATE item_master SET category='Buns',      reconciliation_method='stock_balance',         selling_price=20                      WHERE name_en ILIKE 'Jam Bun';
UPDATE item_master SET category='Buns',      reconciliation_method='stock_balance',         selling_price=10                      WHERE name_en ILIKE 'Plain Bun';
UPDATE item_master SET category='Buns',      reconciliation_method='stock_balance',         selling_price=30                      WHERE name_en ILIKE 'Bun Butter Jam';
UPDATE item_master SET category='Buns',      reconciliation_method='stock_balance',         selling_price=20                      WHERE name_en ILIKE 'Coconut Bun';
UPDATE item_master SET category='Snacks',    reconciliation_method='pack_of_bottle',        selling_price=5,     cost_price=2     WHERE name_en ILIKE 'Osmania Biscuit';
UPDATE item_master SET category='Ladoos',    reconciliation_method='remaining_weight_bottle', selling_price=12,  cost_price=7     WHERE name_en ILIKE 'Peanut Ladoo';
UPDATE item_master SET category='Ladoos',    reconciliation_method='remaining_weight_bottle', selling_price=15,  cost_price=10    WHERE name_en ILIKE 'Dry Fruit Ladoo';
UPDATE item_master SET category='Ladoos',    reconciliation_method='remaining_weight_bottle', selling_price=12,  cost_price=8,    branch_kr=TRUE,  branch_c2=FALSE WHERE name_en ILIKE 'Rava Ladoo';
UPDATE item_master SET category='Snacks',    reconciliation_method='remaining_weight_peanut', selling_price=20                   WHERE name_en ILIKE '%Sundal%';
UPDATE item_master SET category='Snacks',    reconciliation_method='remaining_weight_peanut', selling_price=25                   WHERE name_en ILIKE 'Sweet Corn';
UPDATE item_master SET category='Snacks',    reconciliation_method='big_box_opened',         branch_kr=TRUE,   branch_c2=FALSE   WHERE name_en ILIKE 'Paal Khoa' OR name_en ILIKE 'Paa Khoa';
UPDATE item_master SET category='Beverages', reconciliation_method='stock_balance',          selling_price=20,  cost_price=11.67  WHERE name_en ILIKE 'Mineral Water%';
UPDATE item_master SET category='Snacks',    reconciliation_method='consumed_pieces',        selling_price=10                    WHERE name_en ILIKE 'Veg Momos';
UPDATE item_master SET category='Snacks',    reconciliation_method='consumed_pieces',        selling_price=40                    WHERE name_en ILIKE 'Chicken Momos';
UPDATE item_master SET category='Tea/Coffee', reconciliation_method='consumed_litres',       selling_price=22,  ml_per_serving=150, is_snack_item=FALSE WHERE name_en ILIKE 'Tea Milk' OR name_en = 'Tea';
UPDATE item_master SET category='Tea/Coffee', reconciliation_method='consumed_litres',       selling_price=17,  ml_per_serving=100, is_snack_item=FALSE WHERE name_en ILIKE 'Coffee Milk' OR name_en = 'Coffee';
UPDATE item_master SET category='Beverages', reconciliation_method='remaining_cups',         selling_price=30,  ml_per_serving=200, branch_kr=FALSE, branch_c2=TRUE, is_snack_item=FALSE WHERE name_en ILIKE 'Rose Milk';
UPDATE item_master SET category='Beverages', reconciliation_method='remaining_cups',         selling_price=40,  ml_per_serving=200, branch_kr=FALSE, branch_c2=TRUE, is_snack_item=FALSE WHERE name_en ILIKE 'Badam Milk';
UPDATE item_master SET category='Snacks',    branch_kr=FALSE, branch_c2=TRUE WHERE name_en ILIKE 'Egg';
UPDATE item_master SET category='Snacks',    branch_kr=FALSE, branch_c2=TRUE WHERE name_en ILIKE 'White Channa';

-- ─── Register migration ────────────────────────────────────────────

INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '007_item_master_enhancements',
  'Phase 3',
  'Add selling_price, cost_price, reconciliation_method, is_pos_item, is_stock_item, is_snack_item, estimated_cost_per_piece to item_master; seed values for all known items'
)
ON CONFLICT (migration_name) DO NOTHING;
