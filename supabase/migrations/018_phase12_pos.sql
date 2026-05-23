-- =====================================================================
-- 018_phase12_pos.sql
-- Phase 12 — POS Billing PWA
-- ALTERs existing POS tables (created in 001) to add missing columns,
-- seeds pos_categories and pos_items, registers in migrations_log.
-- NEVER modifies existing columns — additive only.
-- =====================================================================

-- ─── 1. pos_sessions — add missing columns ───────────────────────────────────

ALTER TABLE pos_sessions
  ADD COLUMN IF NOT EXISTS staff_name           TEXT,
  ADD COLUMN IF NOT EXISTS status               TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS declared_cash        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS expected_cash        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cash_discrepancy     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discrepancy_alert_level TEXT,
  ADD COLUMN IF NOT EXISTS created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 2. bills — add missing columns ─────────────────────────────────────────

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS staff_name             TEXT,
  ADD COLUMN IF NOT EXISTS postpaid_customer_name TEXT;

-- ─── 3. bill_items — add missing columns ─────────────────────────────────────

ALTER TABLE bill_items
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 4. pos_items — add missing columns ──────────────────────────────────────

ALTER TABLE pos_items
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ─── 5. pos_categories — add created_at if missing ───────────────────────────

ALTER TABLE pos_categories
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 6. pos_item_price_history — add created_at if missing ───────────────────

ALTER TABLE pos_item_price_history
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 7. Grants ────────────────────────────────────────────────────────────────

GRANT ALL ON pos_sessions           TO anon, authenticated;
GRANT ALL ON bills                  TO anon, authenticated;
GRANT ALL ON bill_items             TO anon, authenticated;
GRANT ALL ON pos_items              TO anon, authenticated;
GRANT ALL ON pos_categories         TO anon, authenticated;
GRANT ALL ON pos_item_price_history TO anon, authenticated;
GRANT ALL ON cash_discrepancy       TO anon, authenticated;

-- ─── 8. Seed pos_categories (idempotent) ─────────────────────────────────────

INSERT INTO pos_categories (name_en, name_ta, active, sort_order)
SELECT name_en, name_ta, TRUE, sort_order
FROM (VALUES
  ('Tea',       'தேநீர்',        1),
  ('Coffee',    'காபி',           2),
  ('Snacks',    'சிற்றுண்டி',   3),
  ('Bun',       'பன்',            4),
  ('Beverages', 'பானங்கள்',      5),
  ('Ladoo',     'லட்டு',          6),
  ('Combo',     'கொம்போ',         7)
) AS v(name_en, name_ta, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM pos_categories LIMIT 1);

-- ─── 9. Seed pos_items (idempotent — only if pos_items is empty) ──────────────
-- Prices from UFW Requirements v3.6 Section 5.4
-- branch_kr / branch_c2 per branch availability rules from CONTEXT.md

DO $$
DECLARE
  cat_tea       UUID;
  cat_coffee    UUID;
  cat_snacks    UUID;
  cat_bun       UUID;
  cat_beverages UUID;
  cat_ladoo     UUID;
  cat_combo     UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM pos_items LIMIT 1) THEN
    RETURN;
  END IF;

  SELECT id INTO cat_tea       FROM pos_categories WHERE name_en = 'Tea'       LIMIT 1;
  SELECT id INTO cat_coffee    FROM pos_categories WHERE name_en = 'Coffee'     LIMIT 1;
  SELECT id INTO cat_snacks    FROM pos_categories WHERE name_en = 'Snacks'     LIMIT 1;
  SELECT id INTO cat_bun       FROM pos_categories WHERE name_en = 'Bun'        LIMIT 1;
  SELECT id INTO cat_beverages FROM pos_categories WHERE name_en = 'Beverages'  LIMIT 1;
  SELECT id INTO cat_ladoo     FROM pos_categories WHERE name_en = 'Ladoo'      LIMIT 1;
  SELECT id INTO cat_combo     FROM pos_categories WHERE name_en = 'Combo'      LIMIT 1;

  -- ── Tea ───────────────────────────────────────────────────────────────────
  INSERT INTO pos_items (name_en, name_ta, category_id, selling_price, branch_kr, branch_c2, sort_order)
  VALUES
    ('Tea',              'தேநீர்',         cat_tea, 10.00, TRUE,  TRUE,  1),
    ('Tea (Special)',    'சிறப்பு தேநீர்', cat_tea, 15.00, TRUE,  TRUE,  2),
    ('Ginger Tea',       'இஞ்சி தேநீர்',   cat_tea, 15.00, TRUE,  FALSE, 3);

  -- ── Coffee ────────────────────────────────────────────────────────────────
  INSERT INTO pos_items (name_en, name_ta, category_id, selling_price, branch_kr, branch_c2, sort_order)
  VALUES
    ('Coffee',           'காபி',           cat_coffee, 15.00, TRUE,  TRUE,  1),
    ('Coffee (Special)', 'சிறப்பு காபி',  cat_coffee, 20.00, TRUE,  TRUE,  2),
    ('Filter Coffee',    'ஃபில்டர் காபி', cat_coffee, 20.00, TRUE,  FALSE, 3);

  -- ── Snacks ────────────────────────────────────────────────────────────────
  INSERT INTO pos_items (name_en, name_ta, category_id, selling_price, branch_kr, branch_c2, sort_order)
  VALUES
    ('Medu Vada',        'மேது வடை',           cat_snacks, 10.00, TRUE,  TRUE,  1),
    ('Masal Vada',       'மசால் வடை',           cat_snacks, 10.00, FALSE, TRUE,  2),
    ('Onion Samosa',     'வெங்காய சமோசா',       cat_snacks, 10.00, TRUE,  TRUE,  3),
    ('Aloo Samosa',      'உருளை சமோசா',         cat_snacks, 20.00, TRUE,  TRUE,  4),
    ('Cutlet',           'கட்லெட்',              cat_snacks, 20.00, TRUE,  TRUE,  5),
    ('Elai Adai',        'இலை அடை',             cat_snacks, 25.00, TRUE,  FALSE, 6),
    ('Kozhukattai',      'கொழுக்கட்டை',          cat_snacks, 15.00, TRUE,  FALSE, 7),
    ('Bajji',            'பஜ்ஜி',                cat_snacks, 10.00, TRUE,  TRUE,  8),
    ('Masala Bonda',     'மசாலா போண்டா',         cat_snacks, 15.00, TRUE,  TRUE,  9),
    ('Cauliflower 65',   'காலிஃப்ளவர் 65',       cat_snacks, 20.00, TRUE,  TRUE,  10),
    ('Chinese Bonda',    'சைனீஸ் போண்டா',        cat_snacks, 15.00, TRUE,  FALSE, 11),
    ('White Channa',     'வெள்ளை சன்னா',         cat_snacks, 20.00, FALSE, TRUE,  12),
    ('Momos (Veg)',      'மோமோஸ் (சைவம்)',        cat_snacks, 40.00, TRUE,  FALSE, 13),
    ('Momos (Chicken)',  'மோமோஸ் (சிக்கன்)',      cat_snacks, 40.00, TRUE,  FALSE, 14),
    ('Egg',              'முட்டை',               cat_snacks, 20.00, FALSE, TRUE,  15);

  -- ── Bun ──────────────────────────────────────────────────────────────────
  INSERT INTO pos_items (name_en, name_ta, category_id, selling_price, branch_kr, branch_c2, sort_order)
  VALUES
    ('Bun',              'பன்',            cat_bun, 10.00, TRUE,  TRUE,  1),
    ('Butter Bun',       'வெண்ணெய் பன்',   cat_bun, 15.00, TRUE,  TRUE,  2),
    ('Bun Masala',       'பன் மசாலா',      cat_bun, 30.00, TRUE,  TRUE,  3),
    ('Cake Bun',         'கேக் பன்',        cat_bun, 20.00, TRUE,  TRUE,  4),
    ('Brownie',          'பிரவுனி',         cat_bun, 65.00, TRUE,  TRUE,  5),
    ('Chocolate Cake',   'சாக்லேட் கேக்',   cat_bun, 65.00, TRUE,  TRUE,  6);

  -- ── Beverages ─────────────────────────────────────────────────────────────
  INSERT INTO pos_items (name_en, name_ta, category_id, selling_price, branch_kr, branch_c2, sort_order)
  VALUES
    ('Rose Milk',        'ரோஸ் மில்க்',    cat_beverages, 20.00, FALSE, TRUE,  1),
    ('Badam Milk',       'பாதாம் பால்',     cat_beverages, 25.00, FALSE, TRUE,  2),
    ('Water Bottle',     'தண்ணீர் பாட்டில்', cat_beverages, 20.00, TRUE,  TRUE,  3),
    ('Mineral Water',    'மினரல் வாட்டர்', cat_beverages, 20.00, TRUE,  TRUE,  4);

  -- ── Ladoo ─────────────────────────────────────────────────────────────────
  INSERT INTO pos_items (name_en, name_ta, category_id, selling_price, branch_kr, branch_c2, sort_order)
  VALUES
    ('Peanut Ladoo',     'நிலக்கடலை லட்டு',  cat_ladoo, 20.00, TRUE, TRUE, 1),
    ('Dry Fruit Ladoo',  'டிரை ஃப்ரூட் லட்டு', cat_ladoo, 25.00, TRUE, TRUE, 2),
    ('Rava Ladoo',       'ரவா லட்டு',         cat_ladoo, 20.00, TRUE, TRUE, 3);

  -- ── Combo ─────────────────────────────────────────────────────────────────
  INSERT INTO pos_items (name_en, name_ta, category_id, selling_price, branch_kr, branch_c2, sort_order)
  VALUES
    ('Tea + Vada Combo',     'தேநீர் + வடை கொம்போ',  cat_combo, 18.00, TRUE, TRUE, 1),
    ('Coffee + Vada Combo',  'காபி + வடை கொம்போ',    cat_combo, 22.00, TRUE, TRUE, 2),
    ('Tea + Bonda Combo',    'தேநீர் + போண்டா கொம்போ', cat_combo, 22.00, TRUE, TRUE, 3),
    ('Coffee + Bonda Combo', 'காபி + போண்டா கொம்போ',  cat_combo, 28.00, TRUE, TRUE, 4);
END;
$$;

-- ─── 10. Register in migrations_log ──────────────────────────────────────────

INSERT INTO migrations_log (migration_name, notes, applied_at)
VALUES (
  '018_phase12_pos.sql',
  'Phase 12 — POS Billing PWA: ALTER pos_sessions/bills/bill_items/pos_items/pos_categories to add missing columns; seed pos_categories (Tea/Coffee/Snacks/Bun/Beverages/Ladoo/Combo) and pos_items with branch availability and selling prices.',
  NOW()
)
ON CONFLICT (migration_name) DO NOTHING;
