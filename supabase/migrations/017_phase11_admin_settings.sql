-- =====================================================================
-- 017_phase11_admin_settings.sql
-- Phase 11 — Admin Settings Full CRUD
-- Creates admin-configurable tables and seeds initial data
-- =====================================================================

-- ─── 1. snack_item_config ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS snack_item_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch          TEXT NOT NULL CHECK (branch IN ('KR', 'C2', 'Both')),
  item_name       TEXT NOT NULL,
  item_name_tamil TEXT,
  input_type      TEXT NOT NULL CHECK (input_type IN ('qty', 'prepared')),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON snack_item_config TO anon, authenticated;

-- Seed KR snacks (idempotent)
INSERT INTO snack_item_config (branch, item_name, item_name_tamil, input_type, sort_order)
SELECT 'KR', item_name, item_name_tamil, input_type, sort_order
FROM (VALUES
  ('Medu Vada',      'மேது வடை',           'qty',      1),
  ('Onion Samosa',   'வெங்காய சமோசா',      'qty',      2),
  ('Aloo Samosa',    'உருளை சமோசா',        'qty',      3),
  ('Cutlet',         'கட்லெட்',             'qty',      4),
  ('Elai Adai',      'இலை அடை',            'qty',      5),
  ('Kozhukattai',    'கொழுக்கட்டை',         'qty',      6),
  ('Bajji',          'பஜ்ஜி',               'prepared', 7),
  ('Masala Bonda',   'மசாலா போண்டா',        'prepared', 8),
  ('Cauliflower 65', 'காலிஃப்ளவர் 65',      'prepared', 9),
  ('Chinese Bonda',  'சைனீஸ் போண்டா',      'prepared', 10)
) AS v(item_name, item_name_tamil, input_type, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM snack_item_config WHERE branch = 'KR' LIMIT 1);

-- Seed C2 snacks (idempotent)
INSERT INTO snack_item_config (branch, item_name, item_name_tamil, input_type, sort_order)
SELECT 'C2', item_name, item_name_tamil, input_type, sort_order
FROM (VALUES
  ('Medu Vada',      'மேது வடை',           'qty',      1),
  ('Masal Vada',     NULL,                  'qty',      2),
  ('Onion Samosa',   'வெங்காய சமோசா',      'qty',      3),
  ('Aloo Samosa',    'உருளை சமோசா',        'qty',      4),
  ('Cutlet',         'கட்லெட்',             'qty',      5),
  ('Bajji',          'பஜ்ஜி',               'prepared', 6),
  ('Masala Bonda',   'மசாலா போண்டா',        'prepared', 7),
  ('Cauliflower 65', 'காலிஃப்ளவர் 65',      'prepared', 8),
  ('Chinese Bonda',  'சைனீஸ் போண்டா',      'prepared', 9)
) AS v(item_name, item_name_tamil, input_type, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM snack_item_config WHERE branch = 'C2' LIMIT 1);

-- ─── 2. cash_expense_categories ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_expense_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch              TEXT NOT NULL CHECK (branch IN ('KR', 'C2', 'Both')),
  category_name       TEXT NOT NULL,
  category_name_tamil TEXT,
  gas_for_pl_gas_bill BOOLEAN NOT NULL DEFAULT FALSE,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON cash_expense_categories TO anon, authenticated;

-- Seed KR categories (idempotent)
INSERT INTO cash_expense_categories (branch, category_name, gas_for_pl_gas_bill, sort_order)
SELECT 'KR', category_name, gas_for_pl_gas_bill, sort_order
FROM (VALUES
  ('Lemon & Ginger',               FALSE,  1),
  ('Lorry Water',                  FALSE,  2),
  ('Sugar',                        FALSE,  3),
  ('Cauliflower',                  FALSE,  4),
  ('Potato',                       FALSE,  5),
  ('Onion',                        FALSE,  6),
  ('Tomato',                       FALSE,  7),
  ('Other Veggies',                FALSE,  8),
  ('Bun Items',                    FALSE,  9),
  ('Kadalai Mittai',               FALSE, 10),
  ('Curd',                         FALSE, 11),
  ('Flower',                       FALSE, 12),
  ('Corporation',                  FALSE, 13),
  ('Evening Snacks',               FALSE, 14),
  ('Rajam Sukku Powder/Malt',      FALSE, 15),
  ('Gas',                          TRUE,  16)
) AS v(category_name, gas_for_pl_gas_bill, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM cash_expense_categories WHERE branch = 'KR' LIMIT 1);

-- Seed C2 categories (idempotent)
INSERT INTO cash_expense_categories (branch, category_name, gas_for_pl_gas_bill, sort_order)
SELECT 'C2', category_name, gas_for_pl_gas_bill, sort_order
FROM (VALUES
  ('Lemon & Ginger', FALSE,  1),
  ('Bread',          FALSE,  2),
  ('Egg',            FALSE,  3),
  ('Sugar',          FALSE,  4),
  ('Cauliflower',    FALSE,  5),
  ('Potato',         FALSE,  6),
  ('Onion',          FALSE,  7),
  ('Tomato',         FALSE,  8),
  ('Other Veggies',  FALSE,  9),
  ('Bun',            FALSE, 10),
  ('Evening Snacks', FALSE, 11),
  ('Gas',            TRUE,  12)
) AS v(category_name, gas_for_pl_gas_bill, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM cash_expense_categories WHERE branch = 'C2' LIMIT 1);

-- ─── 3. supervisor_expense_categories ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supervisor_expense_categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name    TEXT NOT NULL,
  flows_to_hk_misc BOOLEAN NOT NULL DEFAULT FALSE,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON supervisor_expense_categories TO anon, authenticated;

INSERT INTO supervisor_expense_categories (category_name, flows_to_hk_misc, sort_order)
SELECT category_name, flows_to_hk_misc, sort_order
FROM (VALUES
  ('Raw Materials',  FALSE, 1),
  ('Housekeeping',   TRUE,  2),
  ('Packaging',      FALSE, 3),
  ('Equipment',      FALSE, 4),
  ('Other',          FALSE, 5)
) AS v(category_name, flows_to_hk_misc, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM supervisor_expense_categories LIMIT 1);

-- ─── 4. reconciliation_config ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reconciliation_config (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch                        TEXT NOT NULL UNIQUE CHECK (branch IN ('KR', 'C2')),
  amber_threshold               NUMERIC NOT NULL DEFAULT 200,
  red_threshold                 NUMERIC NOT NULL DEFAULT 500,
  cash_discrepancy_tolerance    NUMERIC NOT NULL DEFAULT 50,
  upi_drop_alert_percent        NUMERIC NOT NULL DEFAULT 20,
  wastage_alert_percent         NUMERIC NOT NULL DEFAULT 15,
  supervisor_deposit_history_count INTEGER NOT NULL DEFAULT 5,
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON reconciliation_config TO anon, authenticated;

INSERT INTO reconciliation_config (branch)
SELECT branch FROM (VALUES ('KR'), ('C2')) AS v(branch)
WHERE NOT EXISTS (SELECT 1 FROM reconciliation_config LIMIT 1);

-- ─── 5. pl_salary_config ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pl_salary_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name  TEXT NOT NULL,
  branch      TEXT NOT NULL CHECK (branch IN ('KR', 'C2')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON pl_salary_config TO anon, authenticated;

INSERT INTO pl_salary_config (staff_name, branch, sort_order)
SELECT staff_name, branch, sort_order
FROM (VALUES
  ('Kanchana',      'KR', 1),
  ('Parvathi',      'KR', 2),
  ('Vasanth',       'KR', 3),
  ('Praveen',       'C2', 1),
  ('Silambarasan',  'C2', 2)
) AS v(staff_name, branch, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM pl_salary_config LIMIT 1);

-- ─── 6. service_contacts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type   TEXT NOT NULL,
  branch         TEXT NOT NULL DEFAULT 'Both' CHECK (branch IN ('KR', 'C2', 'Both')),
  contact_name   TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON service_contacts TO anon, authenticated;

INSERT INTO service_contacts (service_type, branch)
SELECT service_type, branch
FROM (VALUES
  ('Electrician',           'Both'),
  ('Plumber',               'Both'),
  ('Coffee Machine Repair', 'Both'),
  ('Gas Stove Repair',      'Both'),
  ('RO Water Service',      'Both'),
  ('Drainage Service',      'KR'),
  ('CCTV Service',          'Both')
) AS v(service_type, branch)
WHERE NOT EXISTS (SELECT 1 FROM service_contacts LIMIT 1);

-- ─── 7. fixed_expenses — add missing columns ──────────────────────────────────

ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS annual_basis TEXT;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Fill in annual_basis descriptions
UPDATE fixed_expenses SET annual_basis = CASE label
  WHEN 'Rent'               THEN 'Annual rent paid monthly'
  WHEN 'FSSAI License'      THEN '₹5,000/yr ÷ 12'
  WHEN 'Corporation License' THEN '₹5,200/yr ÷ 12'
  WHEN 'Internet ACT'       THEN 'Monthly broadband plan'
  WHEN 'Pagarbook'          THEN 'Monthly subscription'
  WHEN 'Diwali Bonus'       THEN 'Annual bonus ÷ 12'
  WHEN 'Yearly Trip'        THEN 'Annual outing ÷ 12'
  ELSE 'Monthly fixed cost'
END
WHERE annual_basis IS NULL;

-- ─── 8. Register in migrations_log ───────────────────────────────────────────

INSERT INTO migrations_log (migration_name, notes)
VALUES (
  '017_phase11_admin_settings.sql',
  'Phase 11: Admin Settings — snack_item_config, cash_expense_categories, supervisor_expense_categories, reconciliation_config, pl_salary_config, service_contacts; extend fixed_expenses'
)
ON CONFLICT (migration_name) DO NOTHING;
