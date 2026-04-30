# CafeOS — Project Context

> **Session Start:** At the start of every session read `CONTEXT.md`, `UFW_Requirements_v3.6_Final.docx`, and `STANDARDS.md`.

**Project:** Unlimited Food Works — Internal Operations Web Application
**Document Version:** v3.6 Final (March 2026)
**Build Phase:** Phase 9 complete (Sales Reconciliation Engine + Cash Discrepancy + Supervisor Float rename)
**Owner:** Vijay Athreyan (vijayathreyan) & Jhanani (co-owners)
**Repository:** https://github.com/vijayathreyan/CafeOS

---

## What Is This?

CafeOS replaces all manual paper-based workflows at two coffee shop branches of **Unlimited Food Works** with a fully digital system. Everything runs on a single Docker Compose stack on one Linux home server — one command to start everything.

### Branches

| Code | Name | Location | Key Differences |
|------|------|----------|----------------|
| KR | Kaappi Ready | RS Puram, Coimbatore | Has Elai Adai, Kozhukattai, Post-Paid customers (ITI/Ramco/Arun/Ajith), Swiggy/Zomato |
| C2 | Coffee Mate C2 | Kovundampalayam (GPM) | Has Egg, Rose Milk, Badam Milk, White Channa. No Elai Adai/Kozhukattai. Momos inactive. |

### Known Staff

| Name | Role | Branch |
|------|------|--------|
| Praveen | Staff | C2 |
| Silambarasan | Staff | C2 |
| Kanchana | Staff | KR |
| Parvathi | Staff | KR |
| Vasanth | Supervisor | Both |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS (Material Design 3) |
| PWA | Service Worker + Web App Manifest (offline support) |
| i18n | react-i18next — English + Tamil, instant toggle |
| State | React Context + React Query |
| Backend/DB | Supabase self-hosted (PostgreSQL 15 + PostgREST + GoTrue + Storage) |
| Auth | Supabase GoTrue — JWT, 8-hour sessions |
| File Storage | Supabase Storage on Docker volume |
| WhatsApp Alerts | Whatomate + Meta WhatsApp Business Cloud API |
| SMS Alerts | Fast2SMS REST API |
| Containers | Docker Compose — 7 services |
| Reverse Proxy | Nginx |
| OS | Ubuntu Server 22.04 LTS |

### Docker Services

1. `postgres` — PostgreSQL 15 database
2. `supabase-api` — PostgREST API
3. `supabase-auth` — GoTrue JWT authentication
4. `supabase-storage` — File storage (bill photos, docs, images)
5. `app` — React PWA (built + served via Nginx)
6. `nginx` — Reverse proxy, single entry point (port 80/443)
7. `whatomate` — WhatsApp Business API alerts

---

## Design System

- **Theme:** Refined operational excellence — Linear.app meets Notion meets premium Indian fintech
- **Primary:** `#1A73E8` (Google Blue) · **Secondary:** `#34A853` · **Warning:** `#F29900` · **Error:** `#D93025`
- **Background:** `#F6F8FC` (brand-bg) · **Surface:** `#FFFFFF` · **Border:** `#E8EAED` (gray-200)
- **Fonts:** Plus Jakarta Sans (display/headings) + Inter (body/UI) + JetBrains Mono (amounts/codes) + Noto Sans Tamil
- **Design tokens:** Full CSS custom property system in `src/index.css` — never hardcode values
- **Foundation components:** `PageContainer`, `PageHeader`, `SectionCard`, `StatusBadge`, `EmptyState`, `DataTable`, `AmountDisplay`, `KPICard`, `LoadingSkeletons`
- **Min tap target:** 48×48px (mobile-first)
- **Layout:** Bottom nav on mobile, 220px sidebar on desktop (owner); AppHeader+BottomNav (staff/supervisor)
- **Design system complete:** April 2026 — see STANDARDS.md Design System section for component usage rules

---

## User Roles & Access

| Role | Who | Access |
|------|-----|--------|
| **Staff** | Shop staff per branch | Own branch only — data entry, shift cards, task inbox (receive) |
| **Supervisor** | Vasanth (both branches) | Both branches — expenses, cash deposit, task assignment |
| **Owner** | Vijay + Jhanani (shared login) | Everything — all reports, settings, vendor payments, user management |

**RLS disabled** — access enforced at React app level (RBAC on every route).

---

## Folder Structure

```
CafeOS/
├── docker-compose.yml          # All 7 Docker services
├── .env.example                # Environment variables template
├── .gitignore
├── CONTEXT.md                  # This file
│
├── nginx/
│   └── nginx.conf              # Reverse proxy configuration
│
├── supabase/
│   └── migrations/
│       ├── 001_complete_schema.sql  # ALL database tables (Phases 1–16)
│       ├── 002_add_deleted_at.sql   # Soft-delete: adds deleted_at to employees
│       ├── 003_snack_tamil_names.sql  # Inserts snack items into item_master with Tamil names; links snack_entries.item_id
│       ├── 005_phase2_additions.sql   # branch/entry_date/entered_by on stock+expense; item_master + stock_item_config seeds
│       ├── 006_phase3_vendor_seed.sql  # seeds all 14 UFW vendors with items and rates
│       ├── 007_item_master_enhancements.sql  # selling_price, is_pos_item, is_snack_item, reconciliation_method columns
│       ├── 008_item_master_active_price.sql  # active_kr, active_c2 columns on item_master
│       ├── 009_phase4_owner_entries.sql  # notes column on pl_salary_entries
│       └── 010_phase5_additions.sql  # alert thresholds on item_master; last_purchased_date on stock_entries; vendor payment improvements
│
├── scripts/
│   ├── backup_daily.sh         # pg_dump cron (2am daily)
│   ├── backup_weekly.sh        # Docker volume backup (Sunday 3am)
│   ├── monthly_maintenance.sh  # Alert log cleanup + REINDEX (1st monthly)
│   ├── disk_check.sh           # Disk usage check (6am daily)
│   └── setup_crons.sh          # Install all cron jobs on server
│
└── frontend/
    ├── Dockerfile
    ├── package.json             # React 18 + Vite + Tailwind
    ├── vite.config.ts           # PWA plugin configured
    ├── tailwind.config.js       # Google MD3 colour palette
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx              # Routes + role-based navigation
        ├── index.css            # Tailwind + global styles
        │
        ├── i18n/
        │   ├── i18n.ts
        │   ├── en.json          # English translations
        │   └── ta.json          # Tamil translations
        │
        ├── lib/
        │   ├── supabase.ts      # Supabase client + AppUser type
        │   ├── offlineQueue.ts  # localStorage queue + auto-sync
        │   └── dailyEntry.ts    # getOrCreateDailyEntry utility
        │
        ├── contexts/
        │   ├── AuthContext.tsx   # Auth state, login/logout, session
        │   └── LanguageContext.tsx  # EN/Tamil toggle
        │
        ├── types/
        │   ├── stock.ts          # StockFormRow, StockEntryRecord, StockItemConfig
        │   └── expense.ts        # ExpenseFormRow, ExpenseEntryRecord
        │
        ├── hooks/
        │   ├── useStockEntries.ts       # fetch + save stock entries
        │   ├── useExpenseEntries.ts     # fetch + save expense entries
        │   └── useStockItemConfig.ts    # fetch + update weight-per-unit config
        │
        ├── components/
        │   ├── Layout.tsx        # Role-aware shell: OwnerLayout (owner) or AppHeader+BottomNav (staff/supervisor)
        │   ├── TopBar.tsx        # Legacy header — retained but no longer used in Layout
        │   ├── BottomNav.tsx     # Mobile navigation bar (staff/supervisor only)
        │   ├── layouts/
        │   │   ├── OwnerLayout.tsx   # Owner: 240px sidebar (desktop lg+), Sheet drawer (mobile), nav groups
        │   │   └── AppHeader.tsx     # Staff/supervisor: 56px top bar, home button + lang toggle + avatar
        │   ├── StatusChip.tsx    # Done/Pending/Warning/Error/Grey chips
        │   ├── ProtectedRoute.tsx  # Role-based route guard
        │   ├── StockForm.tsx     # ★ Phase 2 — branch-aware stock entry table
        │   ├── ExpenseForm.tsx   # ★ Phase 2 — branch-aware expense entry
        │   ├── KgGramsInput.tsx  # Dual kg+grams input with auto-convert
        │   ├── DraftRestorationDialog.tsx  # Dialog on draft detection
        │   └── ui/
        │       └── skeleton.tsx  # Loading skeleton
        │
        └── pages/
            ├── Login.tsx          # Login + first-login password change
            ├── BranchSelect.tsx   # Multi-branch selector
            ├── PlaceholderPage.tsx
            │
            ├── staff/
            │   ├── StaffDashboard.tsx
            │   ├── ShiftDashboard.tsx    # ★ Main Phase 1 feature
            │   ├── ShiftCloseModal.tsx   # 3-step closure (no amounts shown)
            │   ├── StockEntry.tsx        # ★ Phase 2 — /stock-entry
            │   ├── ExpenseEntry.tsx      # ★ Phase 2 — /expense-entry
            │   └── cards/
            │       ├── SnacksCard.tsx    # Qty/Prepared + Sold/Wastage/Comp
            │       ├── CashCard.tsx      # Denomination count (Shift 1+2)
            │       ├── MilkCard.tsx      # Coffee+Tea milk per shift
            │       ├── AssetsCard.tsx    # 4 glass types Current/New/Broken
            │       ├── PostPaidCard.tsx  # KR only — ITI/Ramco/Arun/Ajith
            │       └── NotesCard.tsx
            │
            ├── supervisor/
            │   ├── SupervisorDashboard.tsx
            │   └── SupervisorEntry.tsx   # ★ Phase 2 — branch selector + tabs
            │
            ├── owner/
            │   ├── OwnerDashboard.tsx
            │   ├── UserManagement.tsx    # List + filter employees
            │   ├── EmployeeOnboarding.tsx  # 6-section form
            │   ├── AdminSettings.tsx     # ★ Phase 2 — weight-per-unit config
            │   ├── StockConfig.tsx       # ★ Phase 2 — /owner/stock-config
            │   ├── VendorMaster.tsx      # ★ Phase 3 — /vendors
            │   ├── VendorOnboarding.tsx  # ★ Phase 3 — /vendors/new + /vendors/:id/edit
            │   ├── VendorProfile.tsx     # ★ Phase 3 — /vendors/:id
            │   └── ItemMasterPage.tsx    # ★ Phase 3 — /items
            │
            └── shared/
                └── TaskInbox.tsx
```

---

## Database Schema

The single migration file `001_complete_schema.sql` creates **all tables across all 16 phases** so the schema is complete from day one. Key table groups:

### Core Daily Operations
`daily_entries`, `snack_entries`, `cash_entries`, `milk_entries`, `asset_entries`, `postpaid_entries`, `stock_entries`, `expense_entries`, `month_end_stock`

### POS / Billing (Phase 12)
`pos_items`, `pos_categories`, `pos_sessions`, `bills`, `bill_items`, `cash_discrepancy`, `pos_item_price_history`

### Vendor & Payments (Phase 3–5)
`vendors`, `vendor_items`, `vendor_item_rates`, `vendor_bank_details`, `vendor_payment_cycles_log`, `vendor_payments`, `paalkhoa_manual_orders`

### Expenses (Phase 4)
`supervisor_expenses`, `supervisor_expense_shops`, `owner_manual_expenses`, `capital_expenditure`, `supervisor_float_topups`, `supervisor_float_balance`, `pl_salary_entries`, `fixed_expenses`

### People
`employees`, `employee_documents`, `employee_identity`, `employee_emergency_contacts`, `employee_bank_details`, `postpaid_customers`, `postpaid_payments`

### UPI + Delivery
`upi_entries`, `delivery_platform_entries`, `cash_deposits`

### Alerts & Tasks
`alert_rules`, `alert_log`, `tasks`, `task_recurrences`

### Maintenance & Config
`maintenance_log`, `backup_log`, `branches`

### Phase 13–15 Placeholders (schema only, empty until needed)
`attendance`, `leave_types`, `leave_requests`, `salary_structures`, `payroll_runs`, `payslips`, `payslip_deductions`

---

## What Was Built in Phase 1

### ✅ Infrastructure
- `docker-compose.yml` — all 7 services configured
- `nginx/nginx.conf` — reverse proxy routing all services
- `.env.example` — complete environment variables template
- Automated backup scripts (daily pg_dump + weekly Docker volume)
- Cron job setup script (`setup_crons.sh`)
- Monthly maintenance script (log cleanup + REINDEX)

### ✅ Database
- Complete PostgreSQL schema — all tables across Phases 1–16
- All ENUMs, indexes, foreign keys
- Auto-generate triggers (employee_id EMP-001, vendor_code VEN-001)
- Seeded data: branches, postpaid_customers (ITI/Ramco/Arun/Ajith), supervisor_expense_shops (DMart, Kasthuri), fixed_expenses (all monthly amounts), leave_types
- pgcrypto configured for encrypted fields (Aadhaar, bank account numbers)
- anon + authenticated roles for PostgREST

### ✅ React App
- Vite + React 18 + TypeScript + Tailwind CSS
- Material Design 3 colour palette baked into Tailwind config
- Inter + Noto Sans Tamil Google Fonts
- PWA configured (vite-plugin-pwa, manifest, service worker, offline cache)

### ✅ Auth + RBAC
- Supabase GoTrue integration with 8-hour sessions
- 3-role system: Staff / Supervisor / Owner
- Branch access filtering — staff only see their branch
- First-login password change flow
- Multi-branch selector (for Vasanth)
- ProtectedRoute component with role guards
- JWT persisted in localStorage

### ✅ i18n — English + Tamil
- react-i18next configured
- Complete EN translation JSON
- Complete Tamil (ta) translation JSON
- Instant toggle without page reload, no data loss
- Tamil font auto-applied when Tamil is active
- Language persisted to localStorage

### ✅ Employee Onboarding (6 sections)
1. System Access — name, phone, role, branch access, language, join date, employee ID
2. Personal Details — DOB, gender, blood group, email, full address, Google Maps URL
3. Identity Documents — Aadhaar (encrypted), front/back upload, college ID
4. Emergency Contact — name, relationship, phone
5. Work Background — experience, reference
6. Bank Details — bank, account (encrypted), IFSC, UPI ID

Employee ID auto-generated (EMP-001, EMP-002...), can be overridden.
WhatsApp credential delivery on creation (hook ready — requires alert module Phase 10).

### ✅ User Management
- List view with role/branch/search filters
- Edit all fields, deactivate (blocks login, data retained), reset password
- Branch access changeable at any time (permanent transfer + temporary extra duty)

### ✅ KR Staff Data Entry Dashboard
- Card-based layout — any card in any order
- **Snacks Card** — Qty (vendor items) or Prepared (made-in-shop) + Sold/Wastage/Comp columns. Warning shown if totals mismatch. Full KR snack list seeded.
- **Cash Card** — Shift 1 + Shift 2 denomination entry (₹500/200/100/50/20/10). Auto-calculated totals. Grand total prominent.
- **Milk Card** — Coffee Milk + Tea Milk per shift (Shift 1 + Shift 2). Daily total auto-calculated.
- **Assets Card** — Tea Glass Small/Big, Dawara Set, Black Tea Glass × Current/New/Broken.
- **Post-Paid Card** (KR only) — ITI/Ramco/Arun/Ajith × Shift 1/Shift 2 amounts.
- **Notes Card** — optional free text.
- **Shift Close Flow** — 3-step: review (bill counts only, NO rupee amounts) → cash declaration → confirmation. Staff never see what system expected — discrepancy computed silently.

### ✅ Offline Queue + Auto-Sync
- `offlineQueue.ts` — localStorage-based action queue with UUID deduplication
- Auto-flush on reconnect (`online` event listener)
- Draft save every 30 seconds per card
- Server draft save every 60 seconds

### ✅ Supporting Components
- `StatusChip` — Done/Pending/Warning/Error/Grey with icons
- `OwnerLayout` — persistent sidebar (240px, lg+) with nav groups: Core (Dashboard/Employees/Tasks/Reports/Settings) + Owner (Vendor Payments/Post-paid Customers/Item Master/Vendor Master/Expenses/Data Entry/Supervisor Float); Sheet drawer on mobile with hamburger (`data-testid="sidebar-hamburger"`); `data-testid="owner-sidebar"` on the desktop aside
- `AppHeader` — 56px top bar for staff/supervisor: home button (`data-testid="app-header-home"`) → role-based URL, centered logo (`pointer-events-none`), language toggle, avatar dropdown
- `BottomNav` — mobile nav for staff/supervisor only (owner uses sidebar)
- `Layout` — role-aware: owner gets `<OwnerLayout>`, others get `<AppHeader> + <BottomNav>`
- All owner sub-pages: back buttons removed (sidebar handles navigation)

---

## What Was Built in Phase 2

### ✅ Migration 005 — stock_entries / expense_entries schema additions
- Added `branch`, `entry_date`, `entered_by`, `entered_by_role` columns to `stock_entries` and `expense_entries`
- Seeded `item_master` with 6 weight-tracked items (Peanut/DryFruit/Rava Ladoo Bottles, Sundal, Sweet Corn, White Channa)
- Seeded `stock_item_config` with default weights per unit; history preserved via `weight_per_unit_effective_from`

### ✅ KR + C2 Stock Levels Entry
- `StockForm` component — shared, branch-aware (23 KR items / 22 C2 items)
- Coffee Powder + Tea Powder: `KgGramsInput` dual-field with auto-convert and total-grams display
- Opening / Purchase / Closing columns; Used column computed from `opening + purchase − closing`
- Routes: `/stock-entry` (staff only), `/supervisor-entry` (supervisor, includes branch selector + Tabs)

### ✅ KR + C2 Cash Expenses Entry
- `ExpenseForm` component — branch-aware categories (16 KR / 12 C2)
- Gas row flagged `is_gas=true` → flows to P&L Gas Bill
- Ad-hoc rows via "+ Add Row"; Shop / Gas / Grand totals auto-calculated
- Route: `/expense-entry` (staff only)

### ✅ Supervisor Data Entry — both branches
- `SupervisorEntry` page — branch selector (KR / C2 buttons) → Tabs (Stock Levels + Cash Expenses)
- Reuses `StockForm` and `ExpenseForm` with `enteredByRole="supervisor"`

### ✅ Draft Persistence
- `saveDraft` / `loadDraft` / `clearDraft` from `offlineQueue.ts`
- Auto-save every 30 s via `setInterval` + `rowsRef` pattern (avoids react-hooks/refs lint)
- `DraftRestorationDialog` (shadcn Dialog, non-dismissible) shown on page load when draft exists

### ✅ Weight-Based Item Admin Settings
- `AdminSettings` page at `/settings` (owner only)
- Inline edit per item: Pencil → Input (g) + Check/X buttons
- Deduplication: shows latest active config per item; each save inserts new history row

### ✅ Supporting
- `KgGramsInput` component — dual number inputs with kg auto-carry
- `Skeleton` shadcn component
- `getOrCreateDailyEntry` utility (`lib/dailyEntry.ts`)
- `useStockEntries`, `useSaveStockEntries`, `useExpenseEntries`, `useSaveExpenseEntries`, `useStockItemConfig`, `useUpdateStockItemConfig` hooks
- `StockEntry.tsx`, `ExpenseEntry.tsx` staff pages
- BottomNav updated: staff gets Stock + Expenses links; supervisor gets combined entry link
- StaffDashboard + SupervisorDashboard quick-action cards added
- `StockConfig.tsx` — `/owner/stock-config` page with shadcn Table, inline edit, toast on save
- "Stock Configuration" card added to OwnerDashboard (ready, no phase badge)
- **38 Playwright E2E tests** — all passing (103 total including Phase 1)

### ⚠️ PostgREST schema cache
After applying migration 005, restart `supabase-api` to reload the schema:
```bash
docker compose restart supabase-api
```

---

## What Was Built in Phase 3

### ✅ Migration 006 — Vendor seed data
- Seeds all 14 known UFW vendors (§5A) with bank details, vendor_items, and opening rates
- Adds missing item_master entries: Coffee Powder, Tea Powder, Milk, Paal Khoa, Mineral Water Bottle, bun varieties, etc.
- Guards: runs only if vendors table is empty; uses WHERE NOT EXISTS for items

### ✅ Vendor Onboarding Form (`/vendors/new`, `/vendors/:id/edit`)
- 4-tab form: Business, Contact, Items, Bank
- Business: name, vendor_code (auto-generated via DB trigger), business_type, GSTIN, payment cycle radio (mon_thu / fixed_dates / prepaid / same_day_cash)
- Contact: contact_name, WhatsApp (10-digit regex), alternate phone, email, address (Textarea), Google Maps URL
- Items: useFieldArray with per-row item dropdown, KR/C2 branch, auto/manual calc, cost price, selling price, unit, effective_from, notes
- Bank: payment_preference, bank details, UPI ID, payment notes
- Edit mode: pre-fills all fields from useVendor hook; useParams for id
- Validation: zod + zodResolver; react-hook-form v7

### ✅ Vendor Master List (`/vendors`)
- Search + filter (active/inactive/all, payment cycle type)
- Vendor cards: business name, code, contact with clickable phone, item tags with branch badge, cycle label
- Actions: Edit, Deactivate/Reactivate (shadcn AlertDialog confirm), View Profile
- Bulk Import: CSV template download + CSV file upload with per-row insert + duplicate check
- "Manage Item Master" button links to /items
- "Vendor Master" card added to OwnerDashboard (ready, no phase badge)

### ✅ Vendor Profile (`/vendors/:id`)
- Tabbed view: Business, Contact, Items & Rates, Bank
- Items tab: VendorItemCard per item — branch label, calc_type badge, rate history sorted descending (current rate highlighted)
- Inline Add Rate form (zodResolver) per item card
- Inline Add Item form for linking new items
- Deactivate item with confirm dialog
- Bank tab: Eye/EyeOff reveal button before showing sensitive bank fields

### ✅ Item Master CRUD (`/items`)
- Table view: Name EN, Tamil, Type, Unit, KR toggle, C2 toggle, Active toggle (confirm), Edit
- Search + item type filter
- ItemFormDialog (shadcn Dialog): create/edit with zodResolver; duplicate name_en check on create
- Back button navigates to /vendors

### ✅ Supporting
- `frontend/src/types/vendor.ts` — all vendor-related TypeScript types
- `frontend/src/components/ui/textarea.tsx` — shadcn Textarea component
- `useVendors`, `useVendor`, `useNextVendorCode`, `useCreateVendor`, `useUpdateVendor`, `useToggleVendorActive` hooks
- `useAddVendorItem`, `useDeactivateVendorItem` hooks
- `useAddVendorItemRate` hook
- `useItemMaster`, `useCreateItem`, `useUpdateItem`, `useToggleItemActive`, `useToggleItemBranch` hooks
- Installed: zod ^4.x, @hookform/resolvers ^5.x
- Phase 3 E2E tests in `tests/e2e/phase3.spec.ts`

---

## What Was Built in Phase 4

### ✅ Migration 009 — pl_salary_entries notes column
- Added `notes TEXT` column to `pl_salary_entries` (was missing from 001_complete_schema.sql)

### ✅ TypeScript Types (`frontend/src/types/phase4.ts`)
- All Phase 4 interfaces: `UPIEntry`, `DeliveryPlatformEntry`, `CashDeposit`, `CashDepositRow`, `SupervisorExpense`, `OwnerManualExpense`, `SupervisorFloatBalance`, `FloatTransaction`, `PLSalaryEntry` (deprecated aliases `VasanthFloatBalance` / `VasanthFloatTopup` kept for backward compat)
- `PL_CATEGORY_MAP` — routes ExpenseType → P&L category string
- `EXPENSE_TYPE_LABELS` — UI labels for expense types
- `STAFF_BY_BRANCH` — hardcoded staff lists for KR (Kanchana, Parvathi, Vasanth) and C2 (Praveen, Silambarasan)

### ✅ Custom Hooks
- `useUPIEntries` — fetch/upsert UPI entries by week; `getMondayOfWeek`, `addDaysToDate` utilities
- `useDeliveryPayouts` — CRUD for Swiggy/Zomato delivery payouts
- `useCashDeposit` — supervisor cash deposit history and creation
- `useSupervisorExpenses` — supervisor expense CRUD with auto float deduction
- `useOwnerExpenseView` — owner view of all supervisor expenses with filters
- `useManualExpenses` — owner manual expense CRUD; capital purchase dual-insert to `capital_expenditure`
- `useSupervisorFloat` — float balance, merged history (topups + deductions), add funds
- `useSalaryEntries` — monthly salary entry per branch with upsert

### ✅ Owner Entry Modules
- **Data Entry Hub** (`/owner/data-entry`) — navigation tiles to UPI Entry, Delivery Payouts, Salary Entry
- **UPI Entry** (`/owner/upi-entry`) — 14-row table (7 days × 2 branches), week navigation, null vs 0 distinction
- **Delivery Payouts** (`/owner/delivery-payouts`) — Swiggy/Zomato payout CRUD with dialog form
- **Salary Entry** (`/owner/salary-entry`) — staff salary entry by branch/month with DB pre-fill

### ✅ Owner Expenses Modules
- **Expenses Hub** (`/owner/expenses`) — navigation to HO Expenses, Manual Expenses, Cash Deposits
- **HO Expenses** (`/owner/ho-expenses`) — owner view of supervisor expenses with summary cards + filters
- **Manual Expenses** (`/owner/manual-expenses`) — CRUD form; auto pl_category; receipt photo upload; capital dual-insert
- **Cash Deposits View** (`/owner/deposits`) — deposit history with branch/date filters; challan photo viewer

### ✅ Supervisor Float
- **Float Page** (`/owner/supervisor-float`) — current balance display, this-month stats, Add Funds dialog, transaction history (URL /owner/vasanth-float redirects → /owner/supervisor-float)

### ✅ Supervisor Modules
- **Cash Deposit** (`/supervisor/cash-deposit`) — challan photo upload, row entry, hard-block validation (rows must match challan amount exactly), success screen
- **Supervisor Expenses** (`/supervisor/expenses`) — expense entry with shop/branch/photo; auto-deducts from Vasanth float; last-7-days list

### ✅ Navigation Updates
- Owner Dashboard: added Data Entry, Expenses, Supervisor Float tiles
- Supervisor Dashboard: replaced inline forms with navigation tiles to `/supervisor/expenses` and `/supervisor/cash-deposit`

### ✅ Testing
- 38 Phase 4 Playwright E2E tests in `tests/e2e/phase4.spec.ts`
- All tests passing (103 Phase 1–3 + 38 Phase 4 = 141+ total)

---

## Phase 10 Alert Manager — Required Implementation Notes

When Phase 10 is built, the Alert Manager MUST implement:

1. **Purchase date alert**: For each item with `alert_days_threshold` set in `item_master`,
   compare today's date with `last_purchased_date` in `stock_entries`.
   If `(today - last_purchased_date) > alert_days_threshold` → fire owner alert via WhatsApp/SMS.

2. **Wastage threshold alert**: For each daily snack entry, calculate:
   `wastage_percent = (wastage_qty / (qty_supplied or prepared)) × 100`
   If `wastage_percent > wastage_threshold_percent` from `item_master` → fire owner alert.

3. **POS billing date alert (Phase 12)**: When POS is live, also track `last_billed_date`
   per item from `bills` table for vendor snack items. If not billed for
   `alert_days_threshold` days → fire owner alert for direct vendor snack items.

4. **Post-paid customer overdue alert**: For each `postpaid_customer` where outstanding > 0
   and `days_since_last_payment > 30` → fire owner alert. Threshold configurable per customer
   (Phase 11 Admin Settings).

---

## What Was Built in Phase 5

### ✅ Migration 010 — Phase 5 schema additions
- Added `alert_days_threshold INTEGER DEFAULT NULL` to `item_master`
- Added `wastage_threshold_percent DECIMAL(5,2) DEFAULT 5.00` to `item_master`
- Added `last_purchased_date DATE` to `stock_entries` with auto-set trigger (fires when purchase > 0)
- Added `cycle_type VARCHAR(50)` and `notes TEXT` to `vendor_payment_cycles_log`
- Added `vendor_id UUID` to `vendor_manual_bills` (for direct vendor reference)
- Added `owner_note TEXT` to `vendor_auto_calc_snapshot`

### ✅ TypeScript Types (`frontend/src/types/phase5.ts`)
- `VendorPaymentCycleLog`, `VendorManualBill`, `VendorAutoCalcSnapshot`, `VendorPaymentRecord`
- `PostPaidCustomer`, `PostPaidPayment`, `PostPaidCreditEntry`, `PostPaidBalance`
- `MarkVendorPaidPayload`, `AddVendorBillPayload`, `RecordPostPaidPaymentPayload`
- `CyclePeriod`, `getMonThuCycle()`, `getFixedDateCycle()` — cycle date helpers
- `SECTION_A_VENDORS`, `SECTION_B_VENDORS` — vendor classification lists

### ✅ Vendor Payment Hooks (`frontend/src/hooks/useVendorPayments.ts`)
- `useVendorCycleLogs` — cycle logs for a date range
- `useVendorManualBillsForCycle` — manual bills for a vendor within a cycle
- `useVendorPaymentHistory` — full payment history per vendor
- `useVendorAutoTotal` — computes system total from snack/milk entries × vendor rates
- `useMarkVendorPaid` — creates/updates cycle log and records vendor_payments entry
- `useAddVendorBill` — adds manual bill to vendor_manual_bills
- `useUpsertCycleLog` — creates or updates a cycle log without marking paid

### ✅ Post-Paid Hooks (`frontend/src/hooks/usePostPaidCustomers.ts`)
- `usePostPaidCustomers` — active customer list
- `usePostPaidBalances` — outstanding balance computed per customer from entries and payments
- `usePostPaidHistory` — credit entries + payment history with running balance
- `useRecordPostPaidPayment` — records payment, invalidates balance cache

### ✅ Vendor Payments Page (`/owner/vendor-payments`)
- Two-section layout: Section A (auto-calculated) + Section B (manual bill entry)
- Section A vendors: Kalingaraj (fixed 1st/11th/21st), snack vendors (Mon/Thu)
- Section B vendors: Momos, Pioneer / KR Franchisor
- Per-vendor card: contact info, cycle period, status badge (Paid/Pending)
- Section A: Auto-total panel with item breakdown table; "Compute" button fetches from daily entries
- Section B: Bill list for cycle, Add Bill dialog
- Mark as Paid dialog: vendor bill amount input, system-vs-bill difference shown in amber
- Payment History dialog per vendor
- Pending count badge in header
- Cycle period info cards (Mon/Thu + fixed dates)

### ✅ Post-Paid Customers Page (`/owner/postpaid-customers`)
- Running balance per customer (total credit, total paid, outstanding)
- Outstanding shown in red; settled in green
- Days since last payment auto-calculated; overdue (>30 days) flagged in red
- Record Payment dialog: date, amount, method, notes
- Customer history dialog: merged credit + payment timeline with running balance
- Summary cards: total outstanding + overdue count

### ✅ Item Master Additions — Alerts & Thresholds section
- New "Alerts & Thresholds" form section in Item Master edit/create dialog
- "Purchase Alert" field: alert_days_threshold (integer, optional)
- "Wastage Alert Threshold %" field: wastage_threshold_percent (decimal, default 5%)
- Both fields in all item types
- TypeScript interfaces and hook mutations updated
- `ItemMaster` type updated with new fields in `frontend/src/types/vendor.ts`

### ✅ Navigation Updates
- Owner Dashboard: "Vendor Payments" tile enabled (route: /owner/vendor-payments)
- Owner Dashboard: "Post-Paid Customers" tile added and enabled (route: /owner/postpaid-customers)
- App.tsx: routes registered for both pages

### ✅ Testing
- Phase 5 Playwright E2E tests in `tests/e2e/phase5.spec.ts`
- All tests passing (141 Phase 1–4 + Phase 5 = 179+ total)

---

## What Was Built in Phase 6

### ✅ Migration 011 — Month End Closing Stock schema + seed
- `month_end_stock` — header row per branch/month/year (draft / submitted)
- `month_end_stock_items` — line-item rows with generated `total_units` and `cost` columns
- `month_end_stock_config` — 50 standard items seeded across 3 sections

### ✅ TypeScript Types (`frontend/src/types/phase6.ts`)
- `MonthEndStockEntry`, `MonthEndStockItem`, `MonthEndStockConfig`, `StockItemRow`
- `MonthEndStockHistoryRecord`, `SaveMonthEndStockPayload`
- `monthName()`, `branchLabel()`, `STOCK_SECTIONS` constants

### ✅ Custom Hooks
- `useMonthEndStock` — fetch header entry; `useMonthEndStockSavedItems` — fetch item rows
- `useMonthEndStockItems` — config items combined with prev-month rates + saved values
- `useSaveMonthEndStockDraft` — upsert draft; `useSubmitMonthEndStock` — submit + alert; `useUnlockMonthEndStock` — reopen for editing
- `useMonthEndStockHistory` — all submissions with filters; `useMonthEndStockEntryItems` — read-only item view

### ✅ Month End Stock Entry Page (`/owner/month-end-stock`)
- Month/Year/Branch selector with period label ("April 2026 · Kaappi Ready")
- Status banner: Green (Submitted) / Amber (Draft) / Blue (No entry)
- Search filter + category filter (Beverages / Packaging / Spices / All)
- Item count indicator ("Showing X of 50 items")
- Three-section item table: Open Units, Packed Units, Total (auto), Rate, Cost (auto)
- Rate highlighted amber when changed from previous month
- 4 ad-hoc blank rows in Section 3
- Section totals + overall total (AmountDisplay xl)
- Auto-save to localStorage every 30s (draft_month_end_{branch}_{year}_{month})
- Draft restoration Dialog on page load
- Save Draft button → database upsert
- Submit button → AlertDialog with total, then status → submitted
- "Request Edit" / Unlock flow for owner correction
- "Generate Reminder Task" button creates task in tasks table

### ✅ Month End Stock History Page (`/owner/month-end-stock/history`)
- DataTable of all past submissions with filters (branch, year, status)
- View dialog: full item list read-only with AmountDisplay
- StatusBadge: Draft / Submitted

### ✅ Navigation
- Owner sidebar: "Month End Stock" under Owner group (BookOpen icon)
- Owner Dashboard tile: "Month End Stock" / "Monthly closing stock entry"
- Routes: `/owner/month-end-stock` and `/owner/month-end-stock/history` (owner-only)

### ✅ E2E Tests
- `tests/e2e/phase6.spec.ts` — 31 tests covering navigation, item list, search, calculations, draft save, submit flow, history, branch switching
- Note: owner login tests depend on Docker server being healthy (pre-existing server auth issue unrelated to Phase 6 code)

---

## What Was Built in Phase 7

### ✅ Reports Hub (`/reports`)
- Replaced PlaceholderPage with ReportsHub — grid of report tiles (same card design as OwnerDashboard)
- Owner Dashboard "Reports" tile now active (was Phase 7–9 placeholder)
- Sidebar nav "Reports" link now leads to real hub
- Tiles: Month End Stock (existing), Milk, Consumption, Wastage, Expense (all live); P&L, Daily Sales (activated in Phase 8)

### ✅ TypeScript Types (`frontend/src/types/phase7.ts`)
- `ReportFilters`, `MilkReportRow`, `ConsumptionReportRow`, `WastageReportRow`, `ExpenseReportRow`
- Utility functions: `todayISO()`, `firstOfMonthISO()`, `formatDate()`, `branchLabel()`

### ✅ Report Hooks (`frontend/src/hooks/useReports.ts`)
- `useMilkReport` — 2-step query: daily_entries IDs → milk_entries; aggregates by date+branch per shift
- `useConsumptionReport` — stock_entries direct query (has branch/entry_date); consumption = opening + purchase − closing; optional item name filter
- `useWastageReport` — 2-step query: daily_entries IDs → snack_entries; wastage % computed
- `useExpenseReport` — expense_entries direct query; gas flag preserved

### ✅ Shared Filter Bar (`frontend/src/components/ReportFilterBar.tsx`)
- Branch selector (All / KR / C2), From date, To date, row count, extra slot

### ✅ Milk Report (`/owner/reports/milk`)
- KPI cards: Total Coffee Milk, Total Tea Milk, Grand Total, Daily Average
- Table: Date, Branch, S1 Coffee, S1 Tea, S2 Coffee, S2 Tea, Coffee Total, Tea Total, Day Total (all in litres)
- Default filter: current month to today

### ✅ Consumption Report (`/owner/reports/consumption`)
- KPI cards: Total Consumed, Unique Items, Top Item by volume
- Table: Date, Branch, Item, Unit, Opening, Purchase (+green if >0), Closing, Consumed (red if negative)
- Extra filter: item name search box

### ✅ Wastage Report (`/owner/reports/wastage`)
- KPI cards: Total Wastage, Overall Wastage %, Complimentary, High Wastage Rows (≥10%)
- Table: Date, Branch, Item, Supplied, Sold, Wastage (red), Comp (amber), Wastage % (colour-coded: green <10%, amber 10–19%, red ≥20%)

### ✅ Expense Report (`/owner/reports/expenses`)
- KPI cards: Grand Total, Shop Expenses, Gas Bill (with P&L note), Categories
- Detail view: Date, Branch, Category (GAS badge for gas entries), Amount
- By Category view: Category, Total Amount, % of Total — sorted by total descending
- Toggle button switches between Detail and By Category views

### ✅ E2E Tests (`tests/e2e/phase7.spec.ts`)
- 20 tests across Hub, Milk, Consumption, Wastage, Expense report pages

---

## What Was Built in Phase 8

### ✅ Migration 014 — `pl_monthly_overrides`
- New table: `pl_monthly_overrides` — per-branch, per-month EB bill override (branch, month DATE, eb_bill_amount, notes, updated_by)
- UNIQUE(branch, month) constraint; index on branch+month
- GRANT ALL to anon + authenticated

### ✅ TypeScript Types (`frontend/src/types/phase8.ts`)
- `PLBranch` ('KR' | 'C2' | 'Combined'), `PLLineItem`, `PLSection`, `PLReportData`, `PLMonthlyOverride`
- `DailySalesSummaryRow`, `DailySalesSummaryTotals`
- Helpers: `monthToYYYYMM()`, `monthToFirstDay()`, `monthToLastDay()`, `prevMonthDate()`, `datesInMonth()`, `fmtInr()`, `plBranchLabel()`

### ✅ P&L Report Hook (`frontend/src/hooks/usePLReport.ts`)
- `usePLReport({ branch, month })` — assembles all 5 P&L sections with current + previous month comparison
- Section 1 — Fixed Expenses: from `fixed_expenses` table; falls back to hardcoded defaults if table empty
- Section 2 — Raw Materials: opening stock (prev month_end_stock), KR HO expenses (Pioneer vendor payments), milk cost (litres purchased × rate), coffee/tea cost (grams consumed × cost_per_gram), shop expenses, momos, closing stock deducted
- Section 3 — Bills: water bill (owner_manual_expenses), gas bill (expense_entries is_gas=true), EB bill (pl_monthly_overrides)
- Section 4 — Salary: from `pl_salary_entries`
- Section 5 — Revenue: Swiggy/Zomato (delivery_platform_entries, KR only), shop sales (cash + expenses + UPI + postpaid)
- Capital purchases shown separately (not in Total Expenses)
- Combined view merges KR + C2 branch data

### ✅ Daily Sales Summary Hook (`frontend/src/hooks/useDailySalesSummary.ts`)
- `useDailySalesSummary(branch, month)` — one row per date+branch for the full month
- Aggregates: cash_in_hand, cash_expenses, UPI (null = not entered = show "—"), ITI/Ramco/Arun/Ajith postpaid (KR only), sales_from_collection, total_shop_sales, cash_deposited
- Billed Sales column reserved for Phase 12 (POS), shows "—"
- Month totals object with UPI missing-day count

### ✅ EB Bill Override Hook (`frontend/src/hooks/usePLMonthlyOverride.ts`)
- `usePLMonthlyOverride(branch, month)` — fetches single override
- `usePLMonthlyOverrideBoth(month)` — fetches KR + C2 in parallel (Combined view)
- `useSavePLOverride()` — upsert mutation with cache invalidation

### ✅ Monthly P&L Page (`/reports/pl`)
- KPI cards: Total Sales, Total Expenses, Gross Profit, Net Profit
- Branch tabs (KR / C2 / Combined) + month picker
- 5 section tables with Line Item / Current Month / Previous Month / Variance columns
- Section 4 (Salary) has inline salary entry form embedded below the table (per branch)
- EB Bill inline entry card below sections
- Capital Purchases section (when present)
- Summary footer with Gross/Net Profit highlighted
- Fixed-cost fallback amber notice if DB has no fixed_expenses rows
- PDF export (jsPDF + autotable) and Excel export (xlsx)
- Route: `/reports/pl` — owner only

### ✅ Daily Sales Summary Page (`/reports/daily-sales`)
- KPI cards: Total Shop Sales, Total UPI (missing-day warning), Total Post-Paid, Cash Deposited
- Branch tabs + month picker; Combined view adds Branch column
- Full scrollable table with 14 columns; UPI null shown as "—" with tooltip
- Month Total row pinned at bottom
- PDF export (landscape jsPDF) and Excel export
- Legend note: Billed Sales available after Phase 12 (POS)
- Route: `/reports/daily-sales` — owner only

### ✅ Navigation Updates
- ReportsHub: Monthly P&L and Daily Sales Summary tiles activated (`ready: true`)
- OwnerLayout sidebar: "P&L Report" and "Daily Sales Summary" links added under Reports group

### ✅ E2E Tests (`tests/e2e/phase8.spec.ts`)
- 29 tests — all passing
- Coverage: Hub tile visibility + click navigation, sidebar links, access control (staff blocked), P&L page structure + branch tabs + salary form + EB bill, Daily Sales page structure + month total row

---

## What Was Built in Phase 9

### ✅ Migration 015 — Phase 9 schema additions
- RENAME TABLE `vasanth_float_topups` → `supervisor_float_topups`
- RENAME TABLE `vasanth_float_balance` → `supervisor_float_balance`
- CREATE TABLE `reconciliation_results` (branch, entry_date UNIQUE, predicted_sales, reported_sales, difference, status CHECK IN ('pending','reconciled','amber','red'), item_breakdown JSONB, calculated_at)
- ALTER TABLE `cash_discrepancy`: pos_session_id made nullable; added shift_date DATE, staff_name TEXT, expected_cash NUMERIC, acknowledged_by TEXT, acknowledged_at TIMESTAMPTZ
- ALTER TABLE `alert_log`: added branch TEXT, entry_date DATE, delivery_status TEXT NOT NULL DEFAULT 'pending'

### ✅ Vasanth Float → Supervisor Float Rename (everywhere)
- DB tables renamed in migration 015
- `useSupervisorFloat` hook replaces `useVasanthFloat`
- `SupervisorFloatBalance` / `SupervisorFloatTopup` types in phase4.ts (deprecated aliases kept)
- All UI labels, routes, sidebar, dashboard, tests updated
- /owner/vasanth-float redirects → /owner/supervisor-float

### ✅ TypeScript Types (`frontend/src/types/phase9.ts`)
- `ReconciliationStatus` ('pending'|'reconciled'|'amber'|'red'), `AlertLevel` ('green'|'amber'|'red')
- `ItemPrediction`, `ReconciliationResult`, `CashDiscrepancy`, `ShiftCashDayRow`
- Utilities: `fmtRs()`, `fmtDate()`, `monthStart()`, `monthEnd()`

### ✅ Reconciliation Engine (`frontend/src/lib/reconciliation.ts`)
- 10 pure prediction functions: `predictConsumedLitres`, `predictReceivedWastageDiff`, `predictStockBalance`, `predictConsumedPieces`, `predictPackOfBottle`, `predictRemainingWeightBottle`, `predictRemainingWeightPeanut`, `predictRemainingCups`, `predictBigBoxOpened`, `predictPreparationStaff`
- `runAllPredictions(data)` — runs all 10, deduplicates by itemName, sums estimates
- `getReconciliationStatus(difference)` — amber ≥ ₹200, red ≥ ₹500
- Thresholds: `RECON_AMBER_THRESHOLD = 200`, `RECON_RED_THRESHOLD = 500`

### ✅ Double Alert Logic (`frontend/src/lib/doubleAlert.ts`)
- `checkDoubleAlert(branch, date)` — fires if BOTH reconciliation AND cash discrepancy are amber/red on same branch+date
- Inserts into `alert_log` with trigger_event='double_alert', channel='whatsapp', delivery_status='pending' (Phase 10 will dispatch)

### ✅ Custom Hooks
- `useReconciliationResults(branch, month, session)` — fetch from reconciliation_results
- `useRunBatchReconciliation()` — iterates all days in month, fetches day data, runs predictions, upserts results, calls checkDoubleAlert on flagged days
- `useCashDiscrepancy(branch, fromDate, toDate, session)` — fetch with date range + branch filter
- `useUnacknowledgedRedCount(session)` — count of unacknowledged red flags
- `useAcknowledgeDiscrepancy()` — marks record acknowledged with acknowledgedBy + timestamp

### ✅ Reconciliation Report (`/reports/reconciliation`, owner only)
- Branch selector (KR/C2), month picker, Run Reconciliation button
- KPI row: Total Predicted, Total Reported, Total Gap, Days Flagged
- Expandable DrillDownRow table with per-item breakdown panel
- recharts LineChart: Predicted vs Reported monthly trend
- data-testid attributes on all key elements

### ✅ Cash Discrepancy Report (`/reports/cash-discrepancy`, owner only)
- Branch selector (all/KR/C2), date range pickers, staff filter dropdown
- KPI row: Total Short, Total Over, Net Variance, Unacknowledged Flags
- Acknowledge button per red-flag row (owner acknowledgment workflow)
- recharts BarChart: discrepancy by staff member (green = over, red = short)
- Empty state: "data available after POS (Phase 12)"
- data-testid on all interactive elements

### ✅ Shift Cash Report (`/reports/shift-cash`, owner only)
- Branch selector, month picker
- Expandable DayShiftRow with full denomination breakdown table (₹500/200/100/50/20/10)
- AlertTriangle mismatch indicator when deposited ≠ net expected
- recharts BarChart: UPI % vs Cash % stacked per day

### ✅ Navigation Updates
- OwnerLayout sidebar: 3 new Report links — Sales Reconciliation, Cash Discrepancy, Shift Cash Report
- ReportsHub: 3 new tiles with ready:true
- App.tsx: 3 new owner-only routes + /owner/vasanth-float redirect

### ✅ recharts installed
- recharts 3.8.1 (installed with --legacy-peer-deps --strict-ssl=false due to corporate SSL)

### ✅ E2E Tests (`tests/e2e/phase9.spec.ts`)
- 26 tests: Supervisor Float rename (4), Reconciliation access + page structure (8), Cash Discrepancy (5), Shift Cash (3), Sidebar nav (3), Reports Hub tiles (3)

---

## What's NOT Built Yet (Phase 10 onwards)

| Phase | Scope |
|-------|-------|
| 10 | Alert Manager (22 triggers, dual channel WhatsApp+SMS), Task Inbox (full), Whatomate integration |
| 11 | Admin Settings full CRUD, Maintenance section, PDF exports, Mobile optimisation |
| 12 | POS / Billing PWA — KR 15" split + C2 7" bottom sheet, 5 payment modes, shift-wise sales |
| 13–14 | Attendance + Payroll (schema ready, activates in ~2 years) |
| 15 | Metabase BI — add container, connect to existing Postgres |

---

## Getting Started

### Development
```bash
cd frontend
npm install
npm run dev
```

### Production (server)
```bash
cp .env.example .env
# Fill in all values in .env
docker compose up -d
# Run migrations
docker exec cafeos_postgres psql -U postgres cafeos -f /docker-entrypoint-initdb.d/001_complete_schema.sql
# Install cron jobs
chmod +x scripts/*.sh && ./scripts/setup_crons.sh
```

### GitHub
```
Repository: https://github.com/vijayathreyan/CafeOS
Branch: main
```

---

## Key Business Rules (Reference)

- **Staff never see rupee totals** — cash totals, shift totals, day totals are hidden from staff at all times
- **No time restriction on data entry** — any staff, any time, any section
- **After shift close, entry is locked** — only owner can unlock for correction
- **Auto-save**: localStorage every 30s, server draft every 60s — data never lost
- **Offline**: Full app shell cached by service worker, offline queue auto-syncs on reconnect
- **Gas category** → flows to P&L Gas Bill line (not Shop Expenses), both branches
- **Milk P&L** = litres BOUGHT × cost price (not litres consumed)
- **Coffee/Tea P&L** = daily grams consumed × rate per gram (rate ÷ 1000)
- **UPI shows "—"** (dash) for days not yet entered — never zero if not entered
- **Shift-wise sales** — owner-only visibility. Staff never see shift or day totals.
- **RLS disabled** — all access control at React app level

---

## Tooling & Standards

### Code Quality
- ESLint configured — no-any, no-unused-vars enforced
- Prettier configured — single quotes, no semi, 100 char width
- Husky pre-commit hook — blocks commits that fail lint
- Run manually: `npm run lint`, `npm run format`

### Environment Validation
- All VITE_ env vars validated at startup in `src/lib/env.ts`
- Missing env vars throw clear error message with variable name
- Import env from `src/lib/env.ts` — never use `import.meta.env` directly

### Database Migrations
- Numbered sequentially: 000, 001, 002...
- NEVER modify existing migration files
- Next migration for Phase 10: `016_phase10_additions.sql`
- Track all migrations in `migrations_log` table
- See `supabase/migrations/README.md` for full rules

### Testing
- Playwright E2E tests in `frontend/tests/e2e/`
- All ~240 tests passing (208 Phase 1–8 + 26 Phase 9)
- Test data uses `00000` prefix — auto-cleaned before/after each run
- Protected accounts never deleted: `9999999999`, `9876543210`, `8888888888`, `9876543211`
- Run: `npx playwright test`
- Report: `npx playwright show-report`

### JSDoc Standard
- All hooks and lib functions have JSDoc comments
- Components do not need JSDoc

### Phase 2 Coding Standards
Every component built in Phase 2 onwards must follow:
- shadcn/ui for all UI components
- React Query (`useQuery`, `useMutation`) for all data fetching
- `react-hook-form` + zod for all forms
- Custom hooks pattern — no data fetching in components directly
- TypeScript strict — no `any` types
- One component per file
- JSDoc on all hooks and utilities

---

*CafeOS v1.0 · Phase 9 Complete · April 2026*
*Requirements: UFW_Requirements_v3.6_Final.docx*
