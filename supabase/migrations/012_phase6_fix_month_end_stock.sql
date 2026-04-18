-- Phase 6 fix — replace old flat month_end_stock with normalized header+items structure
-- The 001_complete_schema.sql had a flat single-table design.
-- Phase 6 uses a normalized header (month_end_stock) + items (month_end_stock_items) design.
-- Safe to drop: 0 rows in old table.

-- 1. Drop FK constraint on month_end_stock_items first (already created pointing to old table)
ALTER TABLE month_end_stock_items
  DROP CONSTRAINT IF EXISTS month_end_stock_items_month_end_stock_id_fkey;

-- 2. Drop old flat table
DROP TABLE IF EXISTS month_end_stock CASCADE;

-- 3. Create correct header table
CREATE TABLE month_end_stock (
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

-- 4. Re-add FK on month_end_stock_items
ALTER TABLE month_end_stock_items
  ADD CONSTRAINT month_end_stock_items_month_end_stock_id_fkey
  FOREIGN KEY (month_end_stock_id) REFERENCES month_end_stock(id) ON DELETE CASCADE;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_month_end_stock_branch_month
  ON month_end_stock(branch, month, year);

-- Register
INSERT INTO migrations_log (migration_name, applied_by, notes)
VALUES (
  '012_phase6_fix_month_end_stock',
  'Phase 6',
  'Replaces old flat month_end_stock with normalized header table matching Phase 6 design'
)
ON CONFLICT DO NOTHING;

-- 6. Permissions
GRANT ALL ON month_end_stock TO anon, authenticated;
GRANT ALL ON month_end_stock_items TO anon, authenticated;
GRANT ALL ON month_end_stock_config TO anon, authenticated;
