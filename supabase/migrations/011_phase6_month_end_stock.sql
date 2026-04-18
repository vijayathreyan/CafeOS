-- Phase 6 — Month End Closing Stock Module
-- Creates month_end_stock, month_end_stock_items, month_end_stock_config tables
-- and seeds all 50 standard items.

CREATE TABLE IF NOT EXISTS month_end_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch VARCHAR(10) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  total_value DECIMAL(12,2) DEFAULT 0,
  submitted_by UUID REFERENCES employees(id),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch, month, year)
);

CREATE TABLE IF NOT EXISTS month_end_stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_end_stock_id UUID REFERENCES month_end_stock(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  section VARCHAR(50),
  unit VARCHAR(50),
  open_units DECIMAL(10,3) DEFAULT 0,
  packed_units DECIMAL(10,3) DEFAULT 0,
  total_units DECIMAL(10,3) GENERATED ALWAYS AS (open_units + packed_units) STORED,
  rate_per_unit DECIMAL(10,2) DEFAULT 0,
  cost DECIMAL(12,2) GENERATED ALWAYS AS ((open_units + packed_units) * rate_per_unit) STORED,
  previous_month_rate DECIMAL(10,2),
  rate_changed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS month_end_stock_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name VARCHAR(200) NOT NULL UNIQUE,
  section VARCHAR(50) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  branch_kr BOOLEAN DEFAULT true,
  branch_c2 BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_month_end_stock_branch_month
  ON month_end_stock(branch, month, year);
CREATE INDEX IF NOT EXISTS idx_month_end_stock_items_stock_id
  ON month_end_stock_items(month_end_stock_id);

-- Seed all 50 standard item names
INSERT INTO month_end_stock_config (item_name, section, unit, sort_order) VALUES
  ('Boost', 'Beverages & Cleaning', 'grams', 1),
  ('Horlicks', 'Beverages & Cleaning', 'grams', 2),
  ('Ragi Malt', 'Beverages & Cleaning', 'grams', 3),
  ('Rajam Sukku Malli', 'Beverages & Cleaning', 'grams', 4),
  ('Honey', 'Beverages & Cleaning', 'ml', 5),
  ('Gulkhand', 'Beverages & Cleaning', 'grams', 6),
  ('Salt', 'Beverages & Cleaning', 'grams', 7),
  ('Cleaning Liquid', 'Beverages & Cleaning', 'ml', 8),
  ('Badam Drink', 'Beverages & Cleaning', 'packets', 9),
  ('Sparkle Glass Cleaner', 'Beverages & Cleaning', 'ml', 10),
  ('Vim Big', 'Beverages & Cleaning', 'number', 11),
  ('Rubber Band', 'Beverages & Cleaning', 'number', 12),
  ('Garbage Cover Small', 'Beverages & Cleaning', 'number', 13),
  ('Garbage Cover Big', 'Beverages & Cleaning', 'number', 14),
  ('Rage Coffee Small', 'Beverages & Cleaning', 'number', 15),
  ('Rage Coffee Big', 'Beverages & Cleaning', 'number', 16),
  ('Tomato Sauce', 'Beverages & Cleaning', 'ml', 17),
  ('Tissues', 'Beverages & Cleaning', 'number', 18),
  ('Green Tea Dip', 'Beverages & Cleaning', 'number', 19),
  ('Taj Mahal Black Tea Dip', 'Packaging & Ingredients', 'number', 20),
  ('Cup Small', 'Packaging & Ingredients', 'number', 21),
  ('Cup Big', 'Packaging & Ingredients', 'number', 22),
  ('Water Bottle', 'Packaging & Ingredients', 'number', 23),
  ('Ground Nut', 'Packaging & Ingredients', 'grams', 24),
  ('Tea Powder', 'Packaging & Ingredients', 'grams', 25),
  ('Coffee Powder', 'Packaging & Ingredients', 'grams', 26),
  ('Cane Sugar', 'Packaging & Ingredients', 'grams', 27),
  ('White Sugar', 'Packaging & Ingredients', 'grams', 28),
  ('Parcel Cover Silver 6x8', 'Packaging & Ingredients', 'number', 29),
  ('Parcel Cover Silver 5x7', 'Packaging & Ingredients', 'number', 30),
  ('Parcel Cover Silver 8x10', 'Packaging & Ingredients', 'number', 31),
  ('Parcel Cover Silver 10x12', 'Packaging & Ingredients', 'number', 32),
  ('Brown Cover Small', 'Packaging & Ingredients', 'number', 33),
  ('Brown Cover Medium', 'Packaging & Ingredients', 'number', 34),
  ('White Parcel Cover 6x7', 'Packaging & Ingredients', 'number', 35),
  ('White Parcel Cover 5x6', 'Packaging & Ingredients', 'number', 36),
  ('Tea Mixing Stick', 'Packaging & Ingredients', 'number', 37),
  ('Elachi', 'Packaging & Ingredients', 'grams', 38),
  ('Spice Drop Elachi', 'Packaging & Ingredients', 'ml', 39),
  ('Spice Drop Masala', 'Spices & Speciality', 'ml', 40),
  ('Spice Drop Ginger', 'Spices & Speciality', 'ml', 41),
  ('Pepper Turmeric Milk Powder', 'Spices & Speciality', 'grams', 42),
  ('Peri Peri Powder', 'Spices & Speciality', 'grams', 43),
  ('Carrot Malt', 'Spices & Speciality', 'grams', 44),
  ('Chaat Masala', 'Spices & Speciality', 'grams', 45),
  ('Choco Sauce', 'Spices & Speciality', 'ml', 46),
  ('Ice Creams', 'Spices & Speciality', 'number', 47),
  ('Eggs', 'Spices & Speciality', 'number', 48),
  ('Pani Puri Appalam', 'Spices & Speciality', 'number', 49),
  ('Corn', 'Spices & Speciality', 'grams', 50)
ON CONFLICT (item_name) DO NOTHING;

-- Register migration
INSERT INTO migrations_log (migration_name, applied_by, notes)
VALUES (
  '011_phase6_month_end_stock',
  'Phase 6',
  'Month end closing stock module — tables, indexes, and 50 item seeds'
)
ON CONFLICT DO NOTHING;
