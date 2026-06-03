-- =====================================================================
-- 020_milk_consolidation.sql
-- Milk data consolidation — milk_entries is single source of truth.
-- Adds bought/opening/closing/total_consumed columns.
-- Merges two-rows-per-day into one row per (branch, entry_date).
-- Migrates purchase data from stock_entries into milk_entries.
-- Marks milk inactive in stock_item_config.
-- NEVER modifies existing migration files.
-- =====================================================================

-- Step 1: Make daily_entry_id nullable (was NOT NULL)
ALTER TABLE milk_entries ALTER COLUMN daily_entry_id DROP NOT NULL;

-- Step 2: Add new columns (non-generated)
ALTER TABLE milk_entries
  ADD COLUMN IF NOT EXISTS branch branch_code,
  ADD COLUMN IF NOT EXISTS entry_date DATE,
  ADD COLUMN IF NOT EXISTS coffee_s1_litres NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tea_s1_litres    NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coffee_s2_litres NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tea_s2_litres    NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bought_litres           NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance_litres  NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_balance_litres  NUMERIC(6,2) NOT NULL DEFAULT 0;

-- Step 3: Consolidate two-rows-per-day into one row per (branch, entry_date).
-- Aggregates shift_number=1 and shift_number=2 consumption into a single row.
CREATE TEMP TABLE _milk_cons AS
SELECT
  gen_random_uuid()                                                           AS id,
  MIN(de.id)                                                                  AS daily_entry_id,
  de.branch,
  de.entry_date,
  SUM(CASE WHEN me.shift_number = 1 THEN COALESCE(me.coffee_milk_litres, 0) ELSE 0 END) AS coffee_s1_litres,
  SUM(CASE WHEN me.shift_number = 1 THEN COALESCE(me.tea_milk_litres,    0) ELSE 0 END) AS tea_s1_litres,
  SUM(CASE WHEN me.shift_number = 2 THEN COALESCE(me.coffee_milk_litres, 0) ELSE 0 END) AS coffee_s2_litres,
  SUM(CASE WHEN me.shift_number = 2 THEN COALESCE(me.tea_milk_litres,    0) ELSE 0 END) AS tea_s2_litres
FROM milk_entries me
JOIN daily_entries de ON de.id = me.daily_entry_id
GROUP BY de.branch, de.entry_date;

DELETE FROM milk_entries;

INSERT INTO milk_entries (
  id, daily_entry_id, shift_number,
  coffee_milk_litres, tea_milk_litres,
  branch, entry_date,
  coffee_s1_litres, tea_s1_litres,
  coffee_s2_litres, tea_s2_litres,
  bought_litres, opening_balance_litres, closing_balance_litres
)
SELECT
  id, daily_entry_id, 1,
  coffee_s1_litres + coffee_s2_litres,
  tea_s1_litres    + tea_s2_litres,
  branch, entry_date,
  coffee_s1_litres, tea_s1_litres,
  coffee_s2_litres, tea_s2_litres,
  0, 0, 0
FROM _milk_cons;

DROP TABLE _milk_cons;

-- Step 4: Apply NOT NULL on branch and entry_date now that all rows have values.
ALTER TABLE milk_entries ALTER COLUMN branch SET NOT NULL;
ALTER TABLE milk_entries ALTER COLUMN entry_date SET NOT NULL;

-- Step 5: Migrate milk purchase + closing stock from stock_entries.
-- Uses entry_date and branch directly from stock_entries (added in migration 005).
UPDATE milk_entries me
SET
  bought_litres          = COALESCE(agg.total_purchase, 0),
  closing_balance_litres = COALESCE(agg.last_closing,   0)
FROM (
  SELECT
    se.branch,
    se.entry_date,
    SUM(COALESCE(se.purchase,      0)) AS total_purchase,
    MAX(COALESCE(se.closing_stock, 0)) AS last_closing
  FROM stock_entries se
  WHERE LOWER(se.item_name) LIKE '%milk%'
    AND se.branch IS NOT NULL
    AND se.entry_date IS NOT NULL
  GROUP BY se.branch, se.entry_date
) agg
WHERE agg.branch = me.branch
  AND agg.entry_date = me.entry_date;

-- Step 6: Calculate opening balances — previous day's closing_balance_litres per branch.
WITH ordered AS (
  SELECT
    id,
    branch,
    entry_date,
    closing_balance_litres,
    LAG(closing_balance_litres) OVER (
      PARTITION BY branch ORDER BY entry_date ASC
    ) AS prev_closing
  FROM milk_entries
)
UPDATE milk_entries me
SET opening_balance_litres = COALESCE(oe.prev_closing, 0)
FROM ordered oe
WHERE oe.id = me.id
  AND oe.prev_closing IS NOT NULL;

-- Step 7: Add generated column total_consumed_litres.
-- Must be added after data manipulation (PostgreSQL computes it on all existing rows).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'milk_entries' AND column_name = 'total_consumed_litres'
  ) THEN
    ALTER TABLE milk_entries
      ADD COLUMN total_consumed_litres NUMERIC(6,2) GENERATED ALWAYS AS (
        COALESCE(coffee_s1_litres, 0) + COALESCE(tea_s1_litres, 0) +
        COALESCE(coffee_s2_litres, 0) + COALESCE(tea_s2_litres, 0)
      ) STORED;
  END IF;
END $$;

-- Step 8: Drop old UNIQUE(daily_entry_id, shift_number) constraint.
ALTER TABLE milk_entries DROP CONSTRAINT IF EXISTS milk_entries_daily_entry_id_shift_number_key;

-- Step 9: Add new UNIQUE(branch, entry_date) — one row per branch per day.
ALTER TABLE milk_entries
  ADD CONSTRAINT IF NOT EXISTS milk_entries_branch_entry_date_key UNIQUE (branch, entry_date);

-- Step 10: Mark milk item inactive in stock_item_config.
-- Historical data is preserved; the item no longer appears in stock entry forms.
UPDATE stock_item_config
SET active = false
WHERE item_id IN (
  SELECT id FROM item_master WHERE LOWER(name_en) LIKE '%milk%'
);

-- Step 11: Register migration.
INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '020_milk_consolidation',
  'Phase 13',
  'Milk data consolidation — single source of truth in milk_entries. Adds bought_litres, opening_balance_litres, closing_balance_litres, total_consumed_litres (generated). Merges two-row-per-day structure to one row per (branch, entry_date). Migrates stock_entries milk purchase data. Marks milk inactive in stock_item_config.'
)
ON CONFLICT (migration_name) DO NOTHING;
