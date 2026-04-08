# CafeOS — Project Context

> **Session Start:** At the start of every session read `CONTEXT.md`, `UFW_Requirements_v3.6_Final.docx`, and `STANDARDS.md`.

**Project:** Unlimited Food Works — Internal Operations Web Application
**Document Version:** v3.6 Final (March 2026)
**Build Phase:** Phase 2 complete
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

- **Theme:** Material Design 3 inspired, Google colour palette
- **Primary:** `#1A73E8` · **Secondary:** `#34A853` · **Warning:** `#FBBC04` · **Error:** `#EA4335`
- **Background:** `#F8F9FA` · **Surface:** `#FFFFFF` · **Border:** `#DADCE0`
- **Fonts:** Inter (English) + Noto Sans Tamil (Tamil) — both from Google Fonts
- **Min tap target:** 48×48px (mobile-first)
- **Layout:** Bottom nav on mobile, sidebar on desktop

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
│       └── 005_phase2_additions.sql   # branch/entry_date/entered_by on stock+expense; item_master + stock_item_config seeds
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
        │   ├── Layout.tsx        # App shell with TopBar + BottomNav
        │   ├── TopBar.tsx        # Header — branch chip + lang toggle + user
        │   ├── BottomNav.tsx     # Mobile navigation bar
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
            │   └── AdminSettings.tsx     # ★ Phase 2 — weight-per-unit config
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
`supervisor_expenses`, `supervisor_expense_shops`, `owner_manual_expenses`, `capital_expenditure`, `vasanth_float_topups`, `vasanth_float_balance`, `pl_salary_entries`, `fixed_expenses`

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
- `TopBar` — branch chip, language toggle (staff/supervisor only), user avatar
- `BottomNav` — role-aware navigation
- `Layout` — responsive shell (bottom nav mobile, sidebar desktop ready)

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
- **34 Playwright E2E tests** — all passing (99 total including Phase 1)

### ⚠️ PostgREST schema cache
After applying migration 005, restart `supabase-api` to reload the schema:
```bash
docker compose restart supabase-api
```

---

## What's NOT Built Yet (Phase 3 onwards)

| Phase | Scope |
|-------|-------|
| 3 | Vendor Onboarding (5 sections), rate history, Vendor Master, Item Master, bulk import, seed all vendor data |
| 4 | Owner UPI entry, Swiggy/Zomato entry, Supervisor cash deposit, Supervisor expense module, Owner Manual Expense, Salary entry, Vasanth Float |
| 5 | Vendor Payment module (Auto-Calculated + Manual Bill Entry), Post-Paid Customer module |
| 6 | Month End Closing Stock (3-page list) |
| 7 | Milk Report, Consumption Report, Wastage & Complimentary Report, Expense Report |
| 8 | Monthly P&L (fully automated), Daily Sales Summary |
| 9 | Sales Reconciliation engine (10 methods), Cash Discrepancy Report |
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
- Next migration for Phase 2: `004_phase2_additions.sql`
- Track all migrations in `migrations_log` table
- See `supabase/migrations/README.md` for full rules

### Testing
- Playwright E2E tests in `frontend/tests/e2e/`
- All 65 tests passing
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

*CafeOS v1.0 · Phase 1 Complete · March 2026*
*Requirements: UFW_Requirements_v3.6_Final.docx*
