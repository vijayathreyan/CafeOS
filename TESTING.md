# CafeOS — Playwright E2E Testing

## Quick Commands

```bash
# From the frontend/ directory:

# Run all tests
npx playwright test

# Run tests with visible list output
npx playwright test --reporter=list

# Run a specific spec file
npx playwright test auth
npx playwright test employees
npx playwright test staff-dashboard
npx playwright test navigation
npx playwright test roles

# Open the interactive visual UI runner
npx playwright test --ui

# Show the last test results with screenshots
npx playwright show-report
```

## Setup

1. Install Playwright (already done):
   ```bash
   cd frontend
   npm install --save-dev @playwright/test
   npx playwright install chromium
   ```

2. **Set real credentials before running tests.**
   Edit `frontend/tests/e2e/test-data.ts`:
   ```ts
   export const TEST_USERS = {
     owner: { phone: '9999999999', password: 'YOUR_REAL_OWNER_PASSWORD' },
     staff_kr: { phone: '9876543210', password: 'Staff@1234' },
     staff_c2: { phone: 'C2_STAFF_PHONE', password: 'C2_STAFF_PASSWORD' },
     supervisor: { phone: '9876543211', password: 'Sup@1234' },
   }
   ```

3. The app must be running at `http://localhost` (Docker stack up):
   ```bash
   docker compose up -d
   ```

## Test Files

| File | Coverage |
|------|----------|
| `tests/e2e/auth.spec.ts` | Login, logout, session persistence, protected routes |
| `tests/e2e/employees.spec.ts` | CRUD flow — create, edit, deactivate, reactivate, delete |
| `tests/e2e/staff-dashboard.spec.ts` | Shift cards, Tamil toggle, KR vs C2 differences |
| `tests/e2e/navigation.spec.ts` | Nav bar links, routing |
| `tests/e2e/roles.spec.ts` | Role-based access — owner, staff, supervisor |

## Config

- `frontend/playwright.config.ts` — base config
- `baseURL`: `http://localhost`
- Browser: Chromium only (desktop viewport)
- Timeout: 15 000 ms per test
- Retries: 1
- Screenshots: on failure
- Videos: on first retry
- Results: `frontend/tests/results/`

## Notes

- Tests run against the **live Docker stack** — they hit the real Supabase database.
- The employee CRUD tests create a temporary staff account (phone `980xxxxxxx`) and clean it up (delete) within the same run.
- Tests in `Employee CRUD flow` run serially — if the "create" step fails, subsequent steps are skipped.
- The `staff_c2` credential in `test-data.ts` is a placeholder — add a real C2 staff account to enable C2-specific tests.
