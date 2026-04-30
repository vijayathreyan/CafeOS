-- =====================================================================
-- 016_phase10_alerts_tasks.sql
-- Phase 10 — Alert Manager + Whatomate WhatsApp + Task Management
-- =====================================================================

-- ─── 1. Extend alert_rules ────────────────────────────────────────────────────

ALTER TABLE alert_rules
  ADD COLUMN IF NOT EXISTS rule_name        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phones TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS channel          TEXT NOT NULL DEFAULT 'whatsapp';

-- ─── 2. Extend alert_log ─────────────────────────────────────────────────────

ALTER TABLE alert_log
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS message_sent    TEXT,
  ADD COLUMN IF NOT EXISTS error_message   TEXT,
  ADD COLUMN IF NOT EXISTS reference_date  DATE;

-- Make channel nullable for Phase 10 entries that don't need the ENUM
-- (Phase 9 entries already have channel = 'whatsapp')
-- No change needed — existing channel column is alert_channel ENUM NOT NULL.
-- Phase 10 inserts will always supply channel = 'whatsapp'.

-- ─── 3. Extend tasks ─────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS overdue_alerted_at TIMESTAMPTZ;

-- ─── 4. Extend task_recurrences ──────────────────────────────────────────────

ALTER TABLE task_recurrences
  ADD COLUMN IF NOT EXISTS custom_days INTEGER;

-- ─── 5. Grant permissions ─────────────────────────────────────────────────────

GRANT ALL ON alert_rules TO anon, authenticated;
GRANT ALL ON alert_log   TO anon, authenticated;
GRANT ALL ON tasks       TO anon, authenticated;
GRANT ALL ON task_recurrences TO anon, authenticated;

-- ─── 6. Seed default alert rules (20 rules) ──────────────────────────────────
-- Idempotent: each rule inserted only if trigger_event not yet present.

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'supervisor_expense_submitted',
       'Supervisor Expense Submitted',
       'Fires when supervisor submits an expense entry',
       '⚡ {branch} — Supervisor expense ₹{amount} submitted on {date}. Category: {item_name}.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'supervisor_expense_submitted');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'vendor_payment_due_mon_thu',
       'Vendor Payment Due',
       'Fires every Monday and Thursday as a reminder to process vendor payments',
       '📅 Vendor payment cycle due today ({date}). Review and process payments in CafeOS.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'vendor_payment_due_mon_thu');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'reconciliation_amber',
       'Sales Reconciliation — Amber',
       'Fires when reconciliation gap is ₹200–₹499 (investigate)',
       '⚠ {branch} — {date} — Sales gap ₹{amount}. Predicted vs Reported difference. Review reconciliation.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'reconciliation_amber');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'reconciliation_red',
       'Sales Reconciliation — Red',
       'Fires when reconciliation gap is ₹500+ (urgent)',
       '🔴 URGENT {branch} — {date} — Sales gap ₹{amount}. Investigate immediately.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'reconciliation_red');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'postpaid_outstanding_overdue',
       'Post-Paid Customer Overdue',
       'Fires when a post-paid customer has not paid for over 30 days',
       '⚠ {customer_name} — Outstanding balance overdue. Last payment over 30 days ago. Review in CafeOS.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'postpaid_outstanding_overdue');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'cash_discrepancy_amber',
       'Cash Discrepancy — Amber',
       'Fires when cash discrepancy is amber level (review needed)',
       '⚠ {branch} Shift {item_name} — {staff_name}. Cash short ₹{amount}. Review discrepancy report.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'cash_discrepancy_amber');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'cash_discrepancy_red',
       'Cash Discrepancy — Red',
       'Fires when cash discrepancy is red level (urgent investigation)',
       '🔴 URGENT {branch} Shift {item_name} — {staff_name}. Cash short ₹{amount}. Investigate immediately.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'cash_discrepancy_red');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'double_alert',
       'Double Alert — Cash + Reconciliation',
       'Fires when both cash discrepancy AND sales reconciliation gap are flagged on the same day',
       '⚠⚠ {branch} — {date} — Cash discrepancy AND Sales gap both flagged for {staff_name}. Investigate immediately.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'double_alert');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'month_end_stock_not_submitted',
       'Month End Stock Not Submitted',
       'Fires near month-end when the closing stock entry has not been submitted',
       '📋 {branch} — Month end stock entry not yet submitted. Please complete before month end.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'month_end_stock_not_submitted');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'task_assigned',
       'Task Assigned',
       'Fires when a new task is assigned to a staff or supervisor member',
       '📌 New task assigned to you: {item_name}. Due: {date}. Check CafeOS Task Inbox.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'task_assigned');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'task_overdue',
       'Task Overdue',
       'Fires when a task passes its due date without being completed',
       '⏰ Task overdue: {item_name}. Was due {date}. Please update status in CafeOS.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'task_overdue');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'task_completed',
       'Task Completed',
       'Fires when a task is marked as completed',
       '✅ Task completed: {item_name} on {date} by {staff_name}.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'task_completed');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'cash_deposit_logged',
       'Cash Deposit Logged',
       'Fires when supervisor logs a cash deposit',
       '🏦 {branch} — Cash deposit ₹{amount} logged by supervisor on {date}.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'cash_deposit_logged');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'upi_not_entered_weekly',
       'UPI Entry Reminder',
       'Fires when UPI weekly totals have not been entered',
       '📊 UPI totals not yet entered for this week. Please enter from Yes Bank app in CafeOS.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'upi_not_entered_weekly');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'upi_cash_ratio_drop',
       'UPI/Cash Ratio Drop',
       'Fires when UPI percentage drops significantly below 7-day average',
       '⚠ {branch} — {date} — UPI percentage dropped significantly below 7-day average. Check UPI machine.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'upi_cash_ratio_drop');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'fssai_expiring',
       'FSSAI License Expiring',
       'Fires when FSSAI license is expiring within 30 days',
       '📋 {branch} — FSSAI license expiring in 30 days. Renew before expiry.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'fssai_expiring');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'employee_account_created',
       'Employee Account Created',
       'Fires when a new employee account is created — sends credentials',
       '👋 Welcome to CafeOS! Your login: Phone {item_name} · Temp password: {amount}. Visit {branch} to login.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'employee_account_created');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'vendor_payment_marked_paid',
       'Vendor Payment Confirmed',
       'Fires when a vendor payment is marked as paid',
       '✅ Payment of ₹{amount} confirmed to {vendor_name} on {date}.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'vendor_payment_marked_paid');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'milk_vendor_payment_due',
       'Milk Vendor Payment Due',
       'Fires on the 1st, 11th, and 21st of each month for Kalingaraj milk payment',
       '📅 Milk vendor (Kalingaraj) payment due today ({date}). Process on 1st, 11th, 21st cycle.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'milk_vendor_payment_due');

INSERT INTO alert_rules (trigger_event, rule_name, description, message_template, active, channel, recipient_phones)
SELECT 'swiggy_zomato_not_entered',
       'Swiggy/Zomato Payout Reminder',
       'Fires when the previous week delivery platform payouts have not been entered',
       '📊 {platform} payout for completed week not yet entered. Please update in CafeOS.',
       true, 'whatsapp', '{}'
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE trigger_event = 'swiggy_zomato_not_entered');

-- ─── 7. Seed system tasks (month-end stock) ───────────────────────────────────

DO $$
DECLARE
  task_kr UUID;
  task_c2 UUID;
  next_28th DATE;
BEGIN
  -- Compute next 28th
  IF EXTRACT(DAY FROM CURRENT_DATE) < 28 THEN
    next_28th := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '27 days';
  ELSE
    next_28th := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '27 days';
  END IF;

  -- KR system task
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE task_type = 'system' AND title = 'Submit month end stock' AND branch = 'KR') THEN
    INSERT INTO tasks (task_type, title, description, branch, priority, status)
    VALUES ('system', 'Submit month end stock',
            'Complete and submit the month end stock count for Kaappi Ready branch',
            'KR', 'normal', 'pending')
    RETURNING id INTO task_kr;

    INSERT INTO task_recurrences (task_template_id, frequency, next_due_date, active)
    VALUES (task_kr, 'monthly', next_28th, true);
  END IF;

  -- C2 system task
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE task_type = 'system' AND title = 'Submit month end stock' AND branch = 'C2') THEN
    INSERT INTO tasks (task_type, title, description, branch, priority, status)
    VALUES ('system', 'Submit month end stock',
            'Complete and submit the month end stock count for Coffee Mate C2 branch',
            'C2', 'normal', 'pending')
    RETURNING id INTO task_c2;

    INSERT INTO task_recurrences (task_template_id, frequency, next_due_date, active)
    VALUES (task_c2, 'monthly', next_28th, true);
  END IF;
END;
$$;

-- ─── 8. Register in migrations_log ────────────────────────────────────────────

INSERT INTO public.migrations_log (migration_name, applied_by, notes)
VALUES (
  '016_phase10_alerts_tasks',
  'Phase 10',
  'Extend alert_rules (rule_name, description, recipient_phones, channel); '
  'Extend alert_log (recipient_phone, message_sent, error_message, reference_date); '
  'Extend tasks (overdue_alerted_at); Extend task_recurrences (custom_days); '
  'Seed 20 default alert rules; Seed system tasks for month-end stock.'
);
