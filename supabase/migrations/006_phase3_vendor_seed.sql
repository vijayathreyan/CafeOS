-- ============================================================
-- CafeOS — Migration 006: Phase 3 Vendor Seed Data
-- Seeds all known vendors from UFW Requirements v3.6 §5A
-- Adds missing item_master entries for vendor-linked items
-- Runs seed only if vendors table is empty
-- ============================================================

DO $$
DECLARE
  -- Item IDs (loaded from item_master)
  v_coffee_id         UUID;
  v_tea_id            UUID;
  v_milk_id           UUID;
  v_paal_khoa_id      UUID;
  v_water_bottle_id   UUID;
  v_cream_bun_id      UUID;
  v_jam_bun_id        UUID;
  v_plain_bun_id      UUID;
  v_bun_butter_jam_id UUID;
  v_coconut_bun_id    UUID;
  v_medu_vada_id      UUID;
  v_onion_samosa_id   UUID;
  v_aloo_samosa_id    UUID;
  v_cutlet_id         UUID;
  v_elai_adai_id      UUID;
  v_kozhukattai_id    UUID;
  v_osmania_id        UUID;
  v_banana_cake_id    UUID;
  v_tea_cake_id       UUID;
  v_brownie_id        UUID;
  v_choco_lava_id     UUID;
  v_peanut_ladoo_id   UUID;
  v_dry_fruit_ladoo_id UUID;
  v_rava_ladoo_id     UUID;
  v_sweet_corn_id     UUID;

  -- Vendor IDs
  v_vada_id           UUID;
  v_siva_id           UUID;
  v_devi_id           UUID;
  v_cothas_id         UUID;
  v_swach_id          UUID;
  v_cookies_id        UUID;
  v_bisleri_id        UUID;
  v_corn_vendor_id    UUID;
  v_banana_vendor_id  UUID;
  v_home_bakers_id    UUID;
  v_sudheer_id        UUID;
  v_rajeshwari_id     UUID;
  v_kalingaraj_id     UUID;
  v_pioneer_id        UUID;

  -- Vendor item IDs (for rate linking)
  vi_id UUID;

BEGIN
  -- ─── STEP 1: Ensure required item_master entries exist ──────────────

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Coffee Powder', 'காபி பொடி', 'stock', 'beverages', true, true, 'kg'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Coffee Powder');
  SELECT id INTO v_coffee_id FROM item_master WHERE name_en = 'Coffee Powder' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Tea Powder', 'தேநீர் பொடி', 'stock', 'beverages', true, true, 'kg'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Tea Powder');
  SELECT id INTO v_tea_id FROM item_master WHERE name_en = 'Tea Powder' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Milk', 'பால்', 'stock', 'beverages', true, true, 'packet'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Milk');
  SELECT id INTO v_milk_id FROM item_master WHERE name_en = 'Milk' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Paal Khoa', 'பால் கோவா', 'vendor_supplied', 'snacks', true, false, 'box'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Paal Khoa');
  SELECT id INTO v_paal_khoa_id FROM item_master WHERE name_en = 'Paal Khoa' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Mineral Water Bottle', 'மினரல் வாட்டர்', 'vendor_supplied', 'beverages', true, false, 'piece'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Mineral Water Bottle');
  SELECT id INTO v_water_bottle_id FROM item_master WHERE name_en = 'Mineral Water Bottle' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Cream Bun', 'க்ரீம் பன்', 'vendor_supplied', 'bun', true, true, 'piece'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Cream Bun');
  SELECT id INTO v_cream_bun_id FROM item_master WHERE name_en = 'Cream Bun' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Jam Bun', 'ஜாம் பன்', 'vendor_supplied', 'bun', true, true, 'piece'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Jam Bun');
  SELECT id INTO v_jam_bun_id FROM item_master WHERE name_en = 'Jam Bun' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Plain Bun', 'பிளெயின் பன்', 'vendor_supplied', 'bun', true, true, 'piece'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Plain Bun');
  SELECT id INTO v_plain_bun_id FROM item_master WHERE name_en = 'Plain Bun' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Bun Butter Jam', 'பன் பட்டர் ஜாம்', 'vendor_supplied', 'bun', true, true, 'piece'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Bun Butter Jam');
  SELECT id INTO v_bun_butter_jam_id FROM item_master WHERE name_en = 'Bun Butter Jam' LIMIT 1;

  INSERT INTO item_master (name_en, name_ta, item_type, category, branch_kr, branch_c2, unit)
  SELECT 'Coconut Bun', 'தேங்காய் பன்', 'vendor_supplied', 'bun', true, true, 'piece'
  WHERE NOT EXISTS (SELECT 1 FROM item_master WHERE name_en = 'Coconut Bun');
  SELECT id INTO v_coconut_bun_id FROM item_master WHERE name_en = 'Coconut Bun' LIMIT 1;

  -- Load existing snack items (seeded in migration 003)
  SELECT id INTO v_medu_vada_id      FROM item_master WHERE name_en ILIKE '%Medu Vada%' OR name_en ILIKE '%Vada%' LIMIT 1;
  SELECT id INTO v_onion_samosa_id   FROM item_master WHERE name_en ILIKE '%Onion Samosa%' LIMIT 1;
  SELECT id INTO v_aloo_samosa_id    FROM item_master WHERE name_en ILIKE '%Aloo Samosa%' LIMIT 1;
  SELECT id INTO v_cutlet_id         FROM item_master WHERE name_en ILIKE '%Cutlet%' LIMIT 1;
  SELECT id INTO v_elai_adai_id      FROM item_master WHERE name_en ILIKE '%Elai Adai%' LIMIT 1;
  SELECT id INTO v_kozhukattai_id    FROM item_master WHERE name_en ILIKE '%Kolukattai%' OR name_en ILIKE '%Kozhukattai%' LIMIT 1;
  SELECT id INTO v_osmania_id        FROM item_master WHERE name_en ILIKE '%Osmania%' LIMIT 1;
  SELECT id INTO v_banana_cake_id    FROM item_master WHERE name_en ILIKE '%Banana Cake%' LIMIT 1;
  SELECT id INTO v_tea_cake_id       FROM item_master WHERE name_en ILIKE '%Tea Cake%' LIMIT 1;
  SELECT id INTO v_brownie_id        FROM item_master WHERE name_en ILIKE '%Brownie%' LIMIT 1;
  SELECT id INTO v_choco_lava_id     FROM item_master WHERE name_en ILIKE '%Lava%' LIMIT 1;

  -- Load weight-tracked items (seeded in migration 005)
  SELECT id INTO v_peanut_ladoo_id    FROM item_master WHERE name_en ILIKE '%Peanut Ladoo%' OR name_en ILIKE '%Groundnut Ladoo%' LIMIT 1;
  SELECT id INTO v_dry_fruit_ladoo_id FROM item_master WHERE name_en ILIKE '%Dry Fruit Ladoo%' LIMIT 1;
  SELECT id INTO v_rava_ladoo_id      FROM item_master WHERE name_en ILIKE '%Rava Ladoo%' LIMIT 1;
  SELECT id INTO v_sweet_corn_id      FROM item_master WHERE name_en ILIKE '%Sweet Corn%' LIMIT 1;

  -- ─── STEP 2: Seed vendors (only if table is empty) ──────────────────

  IF NOT EXISTS (SELECT 1 FROM vendors LIMIT 1) THEN

    -- ── Vada Vendor (Suresh) — Mon/Thu ────────────────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Vada Vendor', 'Suresh', '9952717228', 'individual', 'mon_thu', true)
    RETURNING id INTO v_vada_id;

    INSERT INTO vendor_bank_details (vendor_id, bank_name, ifsc_code, account_holder_name, payment_preference)
    VALUES (v_vada_id, 'Indian Bank', 'IDIB000L008', 'SURESH KUMAR', 'bank_transfer');

    IF v_medu_vada_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_vada_id, v_medu_vada_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 7.00, 10.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Siva Shankari — Mon/Thu ───────────────────────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Siva Shankari', 'Sivashankari', '8778033768', 'individual', 'mon_thu', true)
    RETURNING id INTO v_siva_id;

    INSERT INTO vendor_bank_details (vendor_id, bank_name, ifsc_code, account_holder_name, payment_preference)
    VALUES (v_siva_id, 'IOB', 'IOBA0000616', 'SIVA SHANKARI', 'bank_transfer');

    IF v_peanut_ladoo_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_siva_id, v_peanut_ladoo_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 7.00, 12.00, 'per_piece', CURRENT_DATE);
    END IF;

    IF v_dry_fruit_ladoo_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_siva_id, v_dry_fruit_ladoo_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 10.00, 15.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Devi S (Rava Ladoo) — Mon/Thu ─────────────────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Devi S', 'Devi S', '6381815645', 'individual', 'mon_thu', true)
    RETURNING id INTO v_devi_id;

    IF v_rava_ladoo_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_devi_id, v_rava_ladoo_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 8.00, 12.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Cothas Coffee (Krishna) — Mon/Thu ────────────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Cothas Coffee', 'Krishna', '9952377373', 'company', 'mon_thu', true)
    RETURNING id INTO v_cothas_id;

    INSERT INTO vendor_bank_details (vendor_id, bank_name, ifsc_code, account_holder_name, payment_preference)
    VALUES (v_cothas_id, 'IOB', 'IOBA0001745', 'COTHAS', 'bank_transfer');

    IF v_coffee_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_cothas_id, v_coffee_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 696.00, NULL, 'per_kg', CURRENT_DATE);
    END IF;

    -- ── Swach Tea (Tanya) — PREPAID ───────────────────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, is_prepaid, active)
    VALUES ('Swach Tea', 'Tanya', '7029682532', 'company', 'prepaid', true, true)
    RETURNING id INTO v_swach_id;

    IF v_tea_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_swach_id, v_tea_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 237.00, NULL, 'per_kg', CURRENT_DATE);
    END IF;

    -- ── Cookies / Osmania (Rajesh) — Mon/Thu ─────────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Cookies', 'Rajesh', '8610645149', 'individual', 'mon_thu', true)
    RETURNING id INTO v_cookies_id;

    IF v_osmania_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_cookies_id, v_osmania_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 2.00, 5.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Bisleri (Rithvik) — Mon/Thu (Manual Bill) ─────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Bisleri', 'Rithvik', '9994657397', 'company', 'mon_thu', true)
    RETURNING id INTO v_bisleri_id;

    IF v_water_bottle_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_bisleri_id, v_water_bottle_id, 'KR', 'manual', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 11.67, 20.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Sweet Corn (Sathish) — Mon/Thu ───────────────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Sweet Corn', 'Sathish', '7708345066', 'individual', 'mon_thu', true)
    RETURNING id INTO v_corn_vendor_id;

    IF v_sweet_corn_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_corn_vendor_id, v_sweet_corn_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 95.00, 25.00, 'per_kg', CURRENT_DATE);
    END IF;

    -- ── Banana Cake (Abdul) — Mon/Thu (Manual Bill) ───────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Banana Cake', 'Abdul', '9976778084', 'individual', 'mon_thu', true)
    RETURNING id INTO v_banana_vendor_id;

    IF v_banana_cake_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_banana_vendor_id, v_banana_cake_id, NULL, 'manual', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 12.00, 20.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Home Bakers (Jeevith) — Mon/Thu (Manual Bill) ─────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Home Bakers', 'Jeevith', '9363004848', 'individual', 'mon_thu', true)
    RETURNING id INTO v_home_bakers_id;

    IF v_tea_cake_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_home_bakers_id, v_tea_cake_id, NULL, 'manual', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 16.00, 30.00, 'per_piece', CURRENT_DATE);
    END IF;

    IF v_choco_lava_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_home_bakers_id, v_choco_lava_id, NULL, 'manual', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 33.00, 65.00, 'per_piece', CURRENT_DATE);
    END IF;

    IF v_brownie_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_home_bakers_id, v_brownie_id, NULL, 'manual', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 38.00, 65.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Sudheer (Elai Adai — KR only) — Mon/Thu ──────────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Sudheer', 'Sudheer', '9443819906', 'individual', 'mon_thu', true)
    RETURNING id INTO v_sudheer_id;

    INSERT INTO vendor_bank_details (vendor_id, bank_name, ifsc_code, account_holder_name, payment_preference)
    VALUES (v_sudheer_id, 'SBI', 'SBIN0003061', 'SUDHEER', 'bank_transfer');

    IF v_elai_adai_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_sudheer_id, v_elai_adai_id, 'KR', 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 18.00, 25.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Rajeshwari (Kozhukattai — KR only) — Mon/Thu ─────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, active)
    VALUES ('Rajeshwari', 'Rajeshwari', '9787945852', 'individual', 'mon_thu', true)
    RETURNING id INTO v_rajeshwari_id;

    INSERT INTO vendor_bank_details (vendor_id, bank_name, ifsc_code, account_holder_name, payment_preference)
    VALUES (v_rajeshwari_id, 'KVB', 'KVBL0001917', 'Rajeshwari', 'bank_transfer');

    IF v_kozhukattai_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_rajeshwari_id, v_kozhukattai_id, 'KR', 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from)
      VALUES (vi_id, 10.00, 15.00, 'per_piece', CURRENT_DATE);
    END IF;

    -- ── Kalingaraj (Milk + Paal Khoa) — 1st/11th/21st ─────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, payment_cycle_type, fixed_cycle_dates, active)
    VALUES ('Kalingaraj', 'Kalingaraj', NULL, 'fixed_dates', '{1,11,21}', true)
    RETURNING id INTO v_kalingaraj_id;

    IF v_milk_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_kalingaraj_id, v_milk_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from, notes)
      VALUES (vi_id, 0.00, NULL, 'per_litre', CURRENT_DATE, 'Rate pending — obtain from Kalingaraj before go-live');
    END IF;

    IF v_paal_khoa_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_kalingaraj_id, v_paal_khoa_id, 'KR', 'manual', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from, notes)
      VALUES (vi_id, 0.00, NULL, 'per_box', CURRENT_DATE, 'Rate pending — obtain from Kalingaraj before go-live');
    END IF;

    -- ── Pioneer Bakes (Muthu Kumar) — Same Day Cash ───────────────────
    INSERT INTO vendors (business_name, contact_name, whatsapp_number, business_type, payment_cycle_type, is_same_day_cash, active)
    VALUES ('Pioneer Bakes', 'Muthu Kumar', '9843217117', 'individual', 'same_day_cash', true, true)
    RETURNING id INTO v_pioneer_id;

    IF v_cream_bun_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_pioneer_id, v_cream_bun_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from, notes)
      VALUES (vi_id, 0.00, 20.00, 'per_piece', CURRENT_DATE, 'Cost price pending');
    END IF;

    IF v_jam_bun_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_pioneer_id, v_jam_bun_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from, notes)
      VALUES (vi_id, 0.00, 20.00, 'per_piece', CURRENT_DATE, 'Cost price pending');
    END IF;

    IF v_plain_bun_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_pioneer_id, v_plain_bun_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from, notes)
      VALUES (vi_id, 0.00, 10.00, 'per_piece', CURRENT_DATE, 'Cost price pending');
    END IF;

    IF v_bun_butter_jam_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_pioneer_id, v_bun_butter_jam_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from, notes)
      VALUES (vi_id, 0.00, 30.00, 'per_piece', CURRENT_DATE, 'Cost price pending');
    END IF;

    IF v_coconut_bun_id IS NOT NULL THEN
      INSERT INTO vendor_items (vendor_id, item_id, branch, calc_type, start_date, active)
      VALUES (v_pioneer_id, v_coconut_bun_id, NULL, 'auto', CURRENT_DATE, true)
      RETURNING id INTO vi_id;
      INSERT INTO vendor_item_rates (vendor_item_id, cost_price, selling_price, unit, effective_from, notes)
      VALUES (vi_id, 0.00, 20.00, 'per_piece', CURRENT_DATE, 'Cost price pending');
    END IF;

  END IF; -- end vendors check

END
$$;

-- ─── Register migration ───────────────────────────────────────────────────────

INSERT INTO migrations_log (migration_name, applied_by, notes)
VALUES (
  '006_phase3_vendor_seed',
  'Phase 3',
  'Vendor master seed data: all 14 known vendors from UFW v3.6 §5A. Adds item_master entries for coffee powder, tea powder, milk, paal khoa, mineral water bottle, bun items.'
);
