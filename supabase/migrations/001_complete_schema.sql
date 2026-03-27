-- ============================================================
-- CafeOS — Complete Database Schema v1.0
-- Covers ALL phases (1–16) as specified in UFW Requirements v3.6
-- RLS intentionally DISABLED — access control at React app level
-- ============================================================

-- Schemas (must exist before GoTrue / Storage run their own migrations)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS public;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE branch_code AS ENUM ('KR', 'C2');
CREATE TYPE user_role AS ENUM ('staff', 'supervisor', 'owner');
CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'postpaid', 'swiggy', 'zomato', 'free_staff', 'free_others');
CREATE TYPE vendor_cycle_type AS ENUM ('mon_thu', 'fixed_dates', 'prepaid', 'same_day_cash');
CREATE TYPE task_type AS ENUM ('system', 'manual', 'recurring');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high');
CREATE TYPE alert_channel AS ENUM ('whatsapp', 'sms', 'both');
CREATE TYPE expense_type AS ENUM ('kr_ho_bill', 'eb_bill', 'water_bill', 'maintenance', 'capital', 'irregular');
CREATE TYPE backup_type AS ENUM ('daily_pgdump', 'weekly_volume', 'manual');
CREATE TYPE snack_input_type AS ENUM ('qty', 'prepared');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'upi', 'cash', 'cheque');
CREATE TYPE payment_cycle_status AS ENUM ('pending', 'paid');
CREATE TYPE recon_method AS ENUM (
  'consumed_litres',
  'received_wastage_diff',
  'stock_balance',
  'consumed_pieces',
  'pack_of_bottle',
  'remaining_weight_bottle',
  'remaining_weight_peanut',
  'remaining_cups',
  'big_box_opened',
  'preparation_count'
);

-- ============================================================
-- BRANCHES
-- ============================================================

CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        branch_code UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  location    TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO branches (code, name, location) VALUES
  ('KR', 'Kaappi Ready', 'RS Puram, Coimbatore'),
  ('C2', 'Coffee Mate C2', 'Kovundampalayam (GPM), Coimbatore');

-- ============================================================
-- PEOPLE — EMPLOYEES
-- ============================================================

CREATE TABLE employees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Section 1 — System Access
  employee_id         TEXT UNIQUE NOT NULL,         -- EMP-001 etc.
  full_name           TEXT NOT NULL,
  phone               TEXT UNIQUE NOT NULL,          -- login username
  role                user_role NOT NULL,
  branch_access       branch_code[] NOT NULL DEFAULT '{}',
  language_pref       TEXT NOT NULL DEFAULT 'en',
  join_date           DATE,
  auth_user_id        UUID,                          -- links to GoTrue auth.users
  first_login_done    BOOLEAN NOT NULL DEFAULT FALSE,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  -- Section 2 — Personal Details
  date_of_birth       DATE,
  gender              gender_type,
  blood_group         TEXT,
  personal_email      TEXT,
  address_door        TEXT,
  address_street      TEXT,
  address_area        TEXT,
  address_city        TEXT,
  address_pincode     TEXT,
  address_state       TEXT,
  google_maps_url     TEXT,
  -- Section 5 — Work Background
  previous_experience TEXT,
  reference_name      TEXT,
  reference_phone     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate employee_id
CREATE SEQUENCE employee_id_seq START 1;
CREATE OR REPLACE FUNCTION generate_employee_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
    NEW.employee_id := 'EMP-' || LPAD(nextval('employee_id_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_employee_id BEFORE INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION generate_employee_id();

CREATE TABLE employee_documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type       TEXT NOT NULL,  -- 'aadhaar_front', 'aadhaar_back', 'college_id'
  storage_url    TEXT NOT NULL,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_identity (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  aadhaar_number  BYTEA,  -- pgcrypto encrypted
  college_name    TEXT,
  course          TEXT,
  study_year      TEXT
);

CREATE TABLE employee_emergency_contacts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contact_name     TEXT NOT NULL,
  relationship     TEXT NOT NULL,
  phone            TEXT NOT NULL
);

CREATE TABLE employee_bank_details (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  bank_name           TEXT,
  account_number      BYTEA,  -- pgcrypto encrypted
  ifsc_code           TEXT,
  account_holder_name TEXT,
  upi_id              TEXT
);

-- ============================================================
-- ITEM MASTER (shared across POS, Vendor, Reconciliation)
-- ============================================================

CREATE TABLE item_master (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en         TEXT NOT NULL,
  name_ta         TEXT,
  item_type       TEXT NOT NULL,  -- 'vendor_supplied', 'made_in_shop', 'stock', 'beverage'
  category        TEXT,
  branch_kr       BOOLEAN NOT NULL DEFAULT TRUE,
  branch_c2       BOOLEAN NOT NULL DEFAULT TRUE,
  unit            TEXT NOT NULL DEFAULT 'piece',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  ml_per_serving  INTEGER,  -- for milk-based items
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_item_config (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id                         UUID NOT NULL REFERENCES item_master(id),
  recon_method                    recon_method,
  entry_unit                      TEXT,
  weight_per_unit_grams           NUMERIC(10,2),
  weight_per_unit_effective_from  DATE,
  branch                          branch_code,
  active                          BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- VENDORS
-- ============================================================

CREATE TABLE vendors (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_code         TEXT UNIQUE NOT NULL,  -- VEN-001
  business_name       TEXT NOT NULL,
  contact_name        TEXT,
  whatsapp_number     TEXT,
  alternate_phone     TEXT,
  email               TEXT,
  address             TEXT,
  google_maps_url     TEXT,
  business_type       TEXT,  -- individual/proprietor/partnership/company
  gstin               TEXT,
  payment_cycle_type  vendor_cycle_type NOT NULL DEFAULT 'mon_thu',
  fixed_cycle_dates   INTEGER[],  -- e.g. {1,11,21} for Kalingaraj
  is_prepaid          BOOLEAN NOT NULL DEFAULT FALSE,
  is_same_day_cash    BOOLEAN NOT NULL DEFAULT FALSE,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  onboarded_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE vendor_id_seq START 1;
CREATE OR REPLACE FUNCTION generate_vendor_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vendor_code IS NULL OR NEW.vendor_code = '' THEN
    NEW.vendor_code := 'VEN-' || LPAD(nextval('vendor_id_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_vendor_code BEFORE INSERT ON vendors
  FOR EACH ROW EXECUTE FUNCTION generate_vendor_code();

CREATE TABLE vendor_bank_details (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id           UUID UNIQUE NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  bank_name           TEXT,
  account_number      BYTEA,  -- pgcrypto encrypted
  ifsc_code           TEXT,
  account_holder_name TEXT,
  upi_id              TEXT,
  payment_preference  payment_method
);

CREATE TABLE vendor_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  item_id         UUID NOT NULL REFERENCES item_master(id),
  branch          branch_code,  -- NULL = both
  calc_type       TEXT NOT NULL DEFAULT 'auto',  -- 'auto' or 'manual'
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(vendor_id, item_id, branch)
);

CREATE TABLE vendor_item_rates (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_item_id        UUID NOT NULL REFERENCES vendor_items(id),
  cost_price            NUMERIC(10,2) NOT NULL,
  selling_price         NUMERIC(10,2),
  unit                  TEXT,
  cost_price_per_gram   NUMERIC(10,4),  -- auto-calculated for powder items
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-set effective_to on previous rate when new rate added
CREATE OR REPLACE FUNCTION set_vendor_rate_effective_to() RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendor_item_rates
  SET effective_to = NEW.effective_from - INTERVAL '1 day'
  WHERE vendor_item_id = NEW.vendor_item_id
    AND effective_to IS NULL
    AND id <> NEW.id;
  -- Auto-calculate per_gram for coffee/tea powder
  IF (SELECT unit FROM item_master im
        JOIN vendor_items vi ON vi.item_id = im.id
        WHERE vi.id = NEW.vendor_item_id
        LIMIT 1) IN ('kg', 'per_kg') THEN
    NEW.cost_price_per_gram := NEW.cost_price / 1000.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_vendor_rate_effective_to BEFORE INSERT ON vendor_item_rates
  FOR EACH ROW EXECUTE FUNCTION set_vendor_rate_effective_to();

-- ============================================================
-- DAILY ENTRIES — CORE SHIFT DATA
-- ============================================================

CREATE TABLE daily_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch       branch_code NOT NULL,
  entry_date   DATE NOT NULL,
  shift_number INTEGER NOT NULL DEFAULT 1,  -- 1 or 2
  staff_id     UUID REFERENCES employees(id),
  staff_name   TEXT,
  opened_at    TIMESTAMPTZ,
  closed_at    TIMESTAMPTZ,
  is_closed    BOOLEAN NOT NULL DEFAULT FALSE,
  locked_by    UUID REFERENCES employees(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch, entry_date, shift_number)
);

-- Snacks
CREATE TABLE snack_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_entry_id  UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES item_master(id),
  item_name       TEXT NOT NULL,
  input_type      snack_input_type NOT NULL DEFAULT 'qty',
  qty             INTEGER DEFAULT 0,   -- vendor supplied (vendor items)
  prepared        INTEGER DEFAULT 0,   -- made in shop
  sold            INTEGER DEFAULT 0,
  wastage         INTEGER DEFAULT 0,
  complimentary   INTEGER DEFAULT 0,
  entered_at_shift INTEGER,  -- 1 or 2
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cash (denominations, per shift)
CREATE TABLE cash_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_entry_id  UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  shift_number    INTEGER NOT NULL,  -- 1 or 2
  denom_500       INTEGER NOT NULL DEFAULT 0,
  denom_200       INTEGER NOT NULL DEFAULT 0,
  denom_100       INTEGER NOT NULL DEFAULT 0,
  denom_50        INTEGER NOT NULL DEFAULT 0,
  denom_20        INTEGER NOT NULL DEFAULT 0,
  denom_10        INTEGER NOT NULL DEFAULT 0,
  shift_total     NUMERIC(10,2) GENERATED ALWAYS AS (
    (denom_500*500 + denom_200*200 + denom_100*100 +
     denom_50*50 + denom_20*20 + denom_10*10)::NUMERIC
  ) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Milk (per-shift for both branches)
CREATE TABLE milk_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_entry_id  UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  shift_number    INTEGER NOT NULL,  -- 1 or 2
  coffee_milk_litres NUMERIC(6,2) NOT NULL DEFAULT 0,
  tea_milk_litres    NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(daily_entry_id, shift_number)
);

-- Assets (glasses)
CREATE TABLE asset_entries (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_entry_id        UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  tea_glass_small_curr  INTEGER DEFAULT 0,
  tea_glass_small_new   INTEGER DEFAULT 0,
  tea_glass_small_broke INTEGER DEFAULT 0,
  tea_glass_big_curr    INTEGER DEFAULT 0,
  tea_glass_big_new     INTEGER DEFAULT 0,
  tea_glass_big_broke   INTEGER DEFAULT 0,
  dawara_set_curr       INTEGER DEFAULT 0,
  dawara_set_new        INTEGER DEFAULT 0,
  dawara_set_broke      INTEGER DEFAULT 0,
  black_tea_glass_curr  INTEGER DEFAULT 0,
  black_tea_glass_new   INTEGER DEFAULT 0,
  black_tea_glass_broke INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Post-Paid Sales (KR only)
CREATE TABLE postpaid_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_entry_id  UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  customer_id     UUID,  -- references postpaid_customers
  customer_name   TEXT NOT NULL,
  shift1_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  shift2_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  daily_total     NUMERIC(10,2) GENERATED ALWAYS AS (shift1_amount + shift2_amount) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Levels (with kg+grams for powder items)
CREATE TABLE stock_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_entry_id   UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  item_id          UUID REFERENCES item_master(id),
  item_name        TEXT NOT NULL,
  opening_stock    NUMERIC(10,2) DEFAULT 0,
  purchase         NUMERIC(10,2) DEFAULT 0,
  closing_stock    NUMERIC(10,2) DEFAULT 0,
  -- Powder items: kg + grams fields, stored internally as total grams
  closing_kg       INTEGER,
  closing_grams    INTEGER,
  closing_total_grams INTEGER GENERATED ALWAYS AS (
    COALESCE(closing_kg, 0) * 1000 + COALESCE(closing_grams, 0)
  ) STORED,
  consumption_grams INTEGER,  -- filled by app for powder items
  unit             TEXT,
  entry_method     TEXT DEFAULT 'count',  -- 'count', 'weight_grams', 'kg_grams'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cash Expenses from Shop
CREATE TABLE expense_entries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_entry_id      UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  category            TEXT NOT NULL,
  amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_gas              BOOLEAN NOT NULL DEFAULT FALSE,  -- flows to P&L Gas Bill separately
  branch              branch_code NOT NULL,
  entry_date          DATE NOT NULL,
  entered_by          UUID REFERENCES employees(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MONTH END CLOSING STOCK
-- ============================================================

CREATE TABLE month_end_stock (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch        branch_code NOT NULL,
  month_year    TEXT NOT NULL,  -- 'YYYY-MM'
  item_name     TEXT NOT NULL,
  open_units    NUMERIC(10,2) DEFAULT 0,
  packed_units  NUMERIC(10,2) DEFAULT 0,
  total_units   NUMERIC(10,2) GENERATED ALWAYS AS (open_units + packed_units) STORED,
  rate_per_unit NUMERIC(10,2) DEFAULT 0,
  cost          NUMERIC(10,2) GENERATED ALWAYS AS ((open_units + packed_units) * rate_per_unit) STORED,
  locked        BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_by  UUID REFERENCES employees(id),
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch, month_year, item_name)
);

-- ============================================================
-- OWNER ENTRY MODULES
-- ============================================================

CREATE TABLE upi_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch       branch_code NOT NULL,
  entry_date   DATE NOT NULL,
  upi_total    NUMERIC(10,2),  -- NULL = not entered (shows —)
  notes        TEXT,
  entered_by   UUID REFERENCES employees(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch, entry_date)
);

CREATE TABLE delivery_platform_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform        TEXT NOT NULL,  -- 'swiggy' or 'zomato'
  branch          branch_code NOT NULL,
  period_from     DATE NOT NULL,
  period_to       DATE NOT NULL,
  amount_credited NUMERIC(10,2) NOT NULL,
  bank_utr        TEXT,
  notes           TEXT,
  entered_by      UUID REFERENCES employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_deposits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_date    DATE NOT NULL,
  challan_photo_url TEXT,
  bank_ref        TEXT,
  notes           TEXT,
  rows            JSONB NOT NULL DEFAULT '[]',  -- [{branch, date, amount}]
  total_amount    NUMERIC(10,2) NOT NULL,
  submitted_by    UUID REFERENCES employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPERVISOR EXPENSES
-- ============================================================

CREATE TABLE supervisor_expense_shops (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_name   TEXT UNIQUE NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO supervisor_expense_shops (shop_name) VALUES
  ('DMart'),
  ('Kasthuri Trading Company');

CREATE TABLE supervisor_expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date    DATE NOT NULL,
  shop_name       TEXT NOT NULL,
  branch          branch_code NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  bill_photo_url  TEXT,
  submitted_by    UUID REFERENCES employees(id),
  float_used      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vasanth Float
CREATE TABLE vasanth_float_topups (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topup_date            DATE NOT NULL,
  amount                NUMERIC(10,2) NOT NULL,
  transfer_ref          TEXT,
  notes                 TEXT,
  added_by              UUID REFERENCES employees(id),
  running_balance_after NUMERIC(10,2) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vasanth_float_balance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO vasanth_float_balance (current_balance) VALUES (0);

-- Owner Manual Expenses
CREATE TABLE owner_manual_expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date    DATE NOT NULL,
  branch          branch_code,
  expense_type    expense_type NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  receipt_photo_url TEXT,
  pl_category     TEXT,  -- auto-set, owner can override
  entered_by      UUID REFERENCES employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE capital_expenditure (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id  UUID NOT NULL REFERENCES owner_manual_expenses(id),
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  branch      branch_code,
  expense_date DATE NOT NULL,
  photo_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- P&L Salary
CREATE TABLE pl_salary_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch       branch_code NOT NULL,
  month_year   TEXT NOT NULL,  -- 'YYYY-MM'
  staff_name   TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  entered_by   UUID REFERENCES employees(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch, month_year, staff_name)
);

-- Fixed Expenses (auto-prorated monthly)
CREATE TABLE fixed_expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch      branch_code NOT NULL,
  label       TEXT NOT NULL,
  annual_amount NUMERIC(10,2) NOT NULL,
  months_divisor INTEGER NOT NULL DEFAULT 12,
  monthly_amount NUMERIC(10,2) GENERATED ALWAYS AS (annual_amount / months_divisor) STORED,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(branch, label)
);

INSERT INTO fixed_expenses (branch, label, annual_amount, months_divisor) VALUES
  ('KR', 'Rent',              208500.00, 12),
  ('C2', 'Rent',              180000.00, 12),
  ('KR', 'FSSAI License',       5000.00, 12),
  ('C2', 'FSSAI License',       5000.00, 12),
  ('KR', 'Corporation License', 5200.00, 12),
  ('KR', 'Internet (ACT)',      3887.00,  7),
  ('KR', 'Pagarbook',           3000.00, 12),
  ('C2', 'Pagarbook',           3000.00, 12),
  ('KR', 'Diwali Bonus',       45000.00, 12),
  ('C2', 'Diwali Bonus',       15000.00, 12),
  ('KR', 'Yearly Trip',         6250.00, 12),
  ('C2', 'Yearly Trip',         2500.00, 12);

-- ============================================================
-- POS / BILLING
-- ============================================================

CREATE TABLE pos_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en    TEXT NOT NULL,
  name_ta    TEXT,
  branch     branch_code,  -- NULL = both
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pos_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID REFERENCES item_master(id),
  name_en         TEXT NOT NULL,
  name_ta         TEXT,
  category_id     UUID REFERENCES pos_categories(id),
  selling_price   NUMERIC(10,2) NOT NULL,
  image_url       TEXT,
  branch_kr       BOOLEAN NOT NULL DEFAULT TRUE,
  branch_c2       BOOLEAN NOT NULL DEFAULT TRUE,
  ml_per_serving  INTEGER,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pos_item_price_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pos_item_id     UUID NOT NULL REFERENCES pos_items(id),
  old_price       NUMERIC(10,2) NOT NULL,
  new_price       NUMERIC(10,2) NOT NULL,
  effective_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by      UUID REFERENCES employees(id)
);

CREATE TABLE pos_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch          branch_code NOT NULL,
  shift_number    INTEGER NOT NULL,
  daily_entry_id  UUID REFERENCES daily_entries(id),
  staff_id        UUID REFERENCES employees(id),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  is_closed       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE bills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch          branch_code NOT NULL,
  pos_session_id  UUID REFERENCES pos_sessions(id),
  staff_id        UUID REFERENCES employees(id),
  bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  bill_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_mode    payment_mode NOT NULL,
  postpaid_customer_id UUID,
  delivery_platform TEXT,  -- 'swiggy' or 'zomato'
  comp_type       TEXT,    -- 'staff' or 'others'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bill_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id         UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  pos_item_id     UUID NOT NULL REFERENCES pos_items(id),
  item_name       TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      NUMERIC(10,2) NOT NULL,  -- price AT TIME OF BILLING
  line_total      NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE cash_discrepancy (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pos_session_id    UUID NOT NULL REFERENCES pos_sessions(id),
  branch            branch_code NOT NULL,
  shift_number      INTEGER NOT NULL,
  staff_id          UUID REFERENCES employees(id),
  pos_cash_total    NUMERIC(10,2) NOT NULL,
  declared_cash     NUMERIC(10,2) NOT NULL,
  difference        NUMERIC(10,2) GENERATED ALWAYS AS (declared_cash - pos_cash_total) STORED,
  alert_level       TEXT NOT NULL,  -- 'green', 'amber', 'red'
  acknowledged      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- POST-PAID CUSTOMERS
-- ============================================================

CREATE TABLE postpaid_customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  contact     TEXT,
  branch      branch_code NOT NULL DEFAULT 'KR',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO postpaid_customers (name, branch) VALUES
  ('ITI', 'KR'), ('Ramco', 'KR'), ('Arun', 'KR'), ('Ajith', 'KR');

CREATE TABLE postpaid_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES postpaid_customers(id),
  payment_date    DATE NOT NULL,
  amount_received NUMERIC(10,2) NOT NULL,
  payment_method  TEXT,
  notes           TEXT,
  entered_by      UUID REFERENCES employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VENDOR PAYMENTS
-- ============================================================

CREATE TABLE vendor_payment_cycles_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  cycle_start     DATE NOT NULL,
  cycle_end       DATE NOT NULL,
  status          payment_cycle_status NOT NULL DEFAULT 'pending',
  system_total    NUMERIC(10,2),
  vendor_bill_amount NUMERIC(10,2),
  total_paid      NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_manual_bills (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_log_id         UUID NOT NULL REFERENCES vendor_payment_cycles_log(id),
  bill_date            DATE NOT NULL,
  amount               NUMERIC(10,2) NOT NULL,
  photo_url            TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_auto_calc_snapshot (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_log_id      UUID NOT NULL REFERENCES vendor_payment_cycles_log(id),
  item_name         TEXT NOT NULL,
  qty_supplied      NUMERIC(10,2),
  rate              NUMERIC(10,4),
  rate_effective_date DATE,
  line_total        NUMERIC(10,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  cycle_log_id    UUID REFERENCES vendor_payment_cycles_log(id),
  amount_paid     NUMERIC(10,2) NOT NULL,
  payment_method  payment_method,
  notes           TEXT,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_by         UUID REFERENCES employees(id)
);

CREATE TABLE paalkhoa_manual_orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_date            DATE NOT NULL,
  amount                NUMERIC(10,2) NOT NULL,
  clubbed_to_milk_cycle UUID REFERENCES vendor_payment_cycles_log(id),
  notes                 TEXT,
  entered_by            UUID REFERENCES employees(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ALERTS & TASKS
-- ============================================================

CREATE TABLE alert_rules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_event    TEXT NOT NULL,
  condition_json   JSONB DEFAULT '{}',
  recipients       JSONB NOT NULL DEFAULT '[]',
  -- [{phone, channel: 'whatsapp'|'sms'|'both', active: true}]
  message_template TEXT,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alert_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id       UUID REFERENCES alert_rules(id),
  trigger_event TEXT NOT NULL,
  recipient     TEXT NOT NULL,
  channel       alert_channel NOT NULL,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'sent',  -- sent, failed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_type      task_type NOT NULL DEFAULT 'manual',
  title          TEXT NOT NULL,
  description    TEXT,
  assigned_to    UUID REFERENCES employees(id),
  assigned_by    UUID REFERENCES employees(id),
  branch         branch_code,
  due_date       DATE,
  priority       task_priority NOT NULL DEFAULT 'normal',
  status         task_status NOT NULL DEFAULT 'pending',
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_recurrences (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_template_id   UUID NOT NULL REFERENCES tasks(id),
  frequency          TEXT NOT NULL,  -- 'daily', 'weekly', 'monthly', 'custom'
  custom_cron        TEXT,
  last_generated_at  TIMESTAMPTZ,
  next_due_date      DATE,
  active             BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- MAINTENANCE & BACKUP LOGS
-- ============================================================

CREATE TABLE maintenance_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_name       TEXT NOT NULL,
  trigger_type    TEXT NOT NULL DEFAULT 'auto',  -- 'auto', 'manual'
  outcome         TEXT NOT NULL DEFAULT 'success',
  error_message   TEXT,
  size_freed_mb   NUMERIC(10,2),
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE backup_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type  backup_type NOT NULL,
  status       TEXT NOT NULL DEFAULT 'success',
  size_mb      NUMERIC(10,2),
  file_path    TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PHASE 13-15 PLACEHOLDERS (schema created now, empty until needed)
-- ============================================================

CREATE TABLE attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES employees(id),
  branch       branch_code NOT NULL,
  work_date    DATE NOT NULL,
  time_in      TIMESTAMPTZ,
  time_out     TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'present',  -- present/absent/leave
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, work_date)
);

CREATE TABLE leave_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  days_per_year INTEGER,
  active      BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO leave_types (name, days_per_year) VALUES
  ('Casual Leave', 12), ('Sick Leave', 6), ('Earned Leave', 15);

CREATE TABLE leave_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id    UUID NOT NULL REFERENCES employees(id),
  leave_type_id  UUID NOT NULL REFERENCES leave_types(id),
  from_date      DATE NOT NULL,
  to_date        DATE NOT NULL,
  reason         TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending/approved/rejected
  reviewed_by    UUID REFERENCES employees(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE salary_structures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id),
  base_salary     NUMERIC(10,2) NOT NULL,
  hra             NUMERIC(10,2) DEFAULT 0,
  other_allowance NUMERIC(10,2) DEFAULT 0,
  effective_from  DATE NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE payroll_runs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch      branch_code NOT NULL,
  month_year  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',  -- draft/final
  total_amount NUMERIC(10,2),
  run_by      UUID REFERENCES employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch, month_year)
);

CREATE TABLE payslips (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id    UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id       UUID NOT NULL REFERENCES employees(id),
  gross_pay         NUMERIC(10,2) NOT NULL,
  total_deductions  NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_pay           NUMERIC(10,2) NOT NULL,
  paid_at           TIMESTAMPTZ,
  delivered_via_wa  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE payslip_deductions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payslip_id   UUID NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_daily_entries_branch_date ON daily_entries(branch, entry_date);
CREATE INDEX idx_bills_branch_date ON bills(branch, bill_date);
CREATE INDEX idx_bills_session ON bills(pos_session_id);
CREATE INDEX idx_expense_entries_branch_date ON expense_entries(branch, entry_date);
CREATE INDEX idx_upi_entries_branch_date ON upi_entries(branch, entry_date);
CREATE INDEX idx_snack_entries_daily ON snack_entries(daily_entry_id);
CREATE INDEX idx_stock_entries_daily ON stock_entries(daily_entry_id);
CREATE INDEX idx_alert_log_created ON alert_log(created_at);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_vendor_item_rates_effective ON vendor_item_rates(vendor_item_id, effective_from);

-- ============================================================
-- ANON ROLE (for PostgREST)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- PHONE CHANGE FUNCTION (SECURITY DEFINER — updates auth.users)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_employee_phone(
  p_employee_id UUID,
  p_new_phone    TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  UPDATE public.employees
    SET phone = p_new_phone, updated_at = NOW()
    WHERE id = p_employee_id;

  SELECT auth_user_id INTO v_auth_id
    FROM public.employees WHERE id = p_employee_id;

  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users
      SET email = p_new_phone || '@cafeos.local', updated_at = NOW()
      WHERE id = v_auth_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_employee_phone TO authenticated;
