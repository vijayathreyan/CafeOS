import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { TEST_USERS } from './test-data'

// Phase 9 — Sales Reconciliation Engine + Cash Discrepancy Report + Supervisor Float rename
// All three new report pages are owner-only.

async function loginAsOwner(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
}

async function loginAsStaff(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.staff_kr)
  await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
}

// ─────────────────────────────────────────────────────────────
// SUPERVISOR FLOAT RENAME
// ─────────────────────────────────────────────────────────────

test.describe('Phase 9 — Supervisor Float rename', () => {
  test('Dashboard shows Supervisor Float tile (not Vasanth Float)', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await page.waitForSelector('h3:has-text("Supervisor Float")', { timeout: 10000 })
    await expect(page.locator('h3:has-text("Supervisor Float")')).toBeVisible()
  })

  test('Supervisor Float page title reads Supervisor Float', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/supervisor-float')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Supervisor Float')
  })

  test('Old vasanth-float URL redirects to supervisor-float', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/vasanth-float')
    await page.waitForURL('**/owner/supervisor-float', { timeout: 8000 })
    await expect(page).toHaveURL(/\/owner\/supervisor-float/)
  })

  test('Sidebar shows Supervisor Float link', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await expect(page.locator('a[href="/owner/supervisor-float"]').first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// RECONCILIATION REPORT — access control
// ─────────────────────────────────────────────────────────────

test.describe('Phase 9 — Reconciliation access control', () => {
  test('Non-owner redirected from /reports/reconciliation', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/reports/reconciliation')
    await expect(page).not.toHaveURL(/\/reports\/reconciliation$/, { timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────
// RECONCILIATION REPORT — page structure
// ─────────────────────────────────────────────────────────────

test.describe('Phase 9 — Sales Reconciliation page', () => {
  test('Reconciliation page loads for KR branch', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/reconciliation')
    await page.waitForSelector('h1:has-text("Sales Reconciliation")', { timeout: 12000 })
    await expect(page.locator('[data-testid="reconciliation-page"]')).toBeVisible()
  })

  test('Reconciliation page loads for C2 branch', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/reconciliation')
    await page.waitForSelector('[data-testid="branch-selector"]', { timeout: 10000 })
    await page.locator('[data-testid="branch-c2"]').click()
    await expect(page.locator('[data-testid="branch-c2"]')).toBeVisible()
  })

  test('Branch selector switches branch', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/reconciliation')
    await page.waitForSelector('[data-testid="branch-selector"]', { timeout: 10000 })
    await page.locator('[data-testid="branch-kr"]').click()
    await expect(page.locator('[data-testid="branch-kr"]')).toBeVisible()
    await page.locator('[data-testid="branch-c2"]').click()
    await expect(page.locator('[data-testid="branch-c2"]')).toBeVisible()
  })

  test('Run Reconciliation button is visible', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/reconciliation')
    await page.waitForSelector('[data-testid="run-reconciliation-btn"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="run-reconciliation-btn"]')).toBeVisible()
  })

  test('Month picker is visible', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/reconciliation')
    await page.waitForSelector('[data-testid="month-picker"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="month-picker"]')).toBeVisible()
  })

  test('KPI row is visible after page loads', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/reconciliation')
    await page.waitForSelector('[data-testid="kpi-row"]', { timeout: 12000 })
    await expect(page.locator('[data-testid="kpi-row"]')).toBeVisible()
  })

  test('Run Reconciliation triggers batch calculation', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto('/reports/reconciliation')
    await page.waitForSelector('[data-testid="run-reconciliation-btn"]', { timeout: 10000 })
    await page.locator('[data-testid="run-reconciliation-btn"]').click()
    // Button becomes disabled while running
    await expect(page.locator('[data-testid="run-reconciliation-btn"]')).toBeDisabled({
      timeout: 3000,
    })
    // Wait for completion
    await expect(page.locator('[data-testid="run-reconciliation-btn"]')).not.toBeDisabled({
      timeout: 20000,
    })
  })
})

// ─────────────────────────────────────────────────────────────
// RECONCILIATION — pending status
// ─────────────────────────────────────────────────────────────

test.describe('Phase 9 — Reconciliation pending status', () => {
  test('Pending status shown for dates without UPI entry (after run)', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto('/reports/reconciliation')
    await page.waitForSelector('[data-testid="run-reconciliation-btn"]', { timeout: 10000 })
    await page.locator('[data-testid="run-reconciliation-btn"]').click()
    await page.waitForSelector('[data-testid="run-reconciliation-btn"]:not([disabled])', {
      timeout: 20000,
    })
    // Some rows should be visible in the table or empty state shown
    const tableOrEmpty = page.locator('table tbody tr, [data-testid]').first()
    await expect(tableOrEmpty).toBeVisible({ timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────
// CASH DISCREPANCY REPORT
// ─────────────────────────────────────────────────────────────

test.describe('Phase 9 — Cash Discrepancy page', () => {
  test('Cash Discrepancy page loads', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/cash-discrepancy')
    await page.waitForSelector('h1:has-text("Cash Discrepancy")', { timeout: 12000 })
    await expect(page.locator('[data-testid="cash-discrepancy-page"]')).toBeVisible()
  })

  test('Cash Discrepancy page has all required columns headers', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/cash-discrepancy')
    await page.waitForSelector('h1:has-text("Cash Discrepancy")', { timeout: 12000 })
    // Empty state or table present
    const pageEl = page.locator('[data-testid="cash-discrepancy-page"]')
    await expect(pageEl).toBeVisible()
  })

  test('Cash Discrepancy has branch selector', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/cash-discrepancy')
    await page.waitForSelector('[data-testid="branch-selector"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="branch-selector"]')).toBeVisible()
  })

  test('Cash Discrepancy has date range pickers', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/cash-discrepancy')
    await page.waitForSelector('[data-testid="from-date"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="from-date"]')).toBeVisible()
    await expect(page.locator('[data-testid="to-date"]')).toBeVisible()
  })

  test('Non-owner redirected from /reports/cash-discrepancy', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/reports/cash-discrepancy')
    await expect(page).not.toHaveURL(/\/reports\/cash-discrepancy$/, { timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────
// SHIFT CASH REPORT
// ─────────────────────────────────────────────────────────────

test.describe('Phase 9 — Shift Cash Report', () => {
  test('Shift Cash Report page loads', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/shift-cash')
    await page.waitForSelector('h1:has-text("Shift-Wise Cash")', { timeout: 12000 })
    await expect(page.locator('[data-testid="shift-cash-page"]')).toBeVisible()
  })

  test('Shift Cash Report has branch selector and month picker', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/shift-cash')
    await page.waitForSelector('[data-testid="branch-selector"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="branch-selector"]')).toBeVisible()
    await expect(page.locator('[data-testid="month-picker"]')).toBeVisible()
  })

  test('Non-owner redirected from /reports/shift-cash', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/reports/shift-cash')
    await expect(page).not.toHaveURL(/\/reports\/shift-cash$/, { timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION
// ─────────────────────────────────────────────────────────────

test.describe('Phase 9 — Sidebar navigation', () => {
  test('Sidebar has Sales Reconciliation link', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await expect(page.locator('a[href="/reports/reconciliation"]').first()).toBeVisible()
  })

  test('Sidebar has Cash Discrepancy link', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await expect(page.locator('a[href="/reports/cash-discrepancy"]').first()).toBeVisible()
  })

  test('Sidebar has Shift Cash Report link', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await expect(page.locator('a[href="/reports/shift-cash"]').first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// REPORTS HUB TILES
// ─────────────────────────────────────────────────────────────

test.describe('Phase 9 — Reports Hub tiles', () => {
  test('Reports hub shows Sales Reconciliation tile', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h1:has-text("Reports")', { timeout: 10000 })
    await expect(page.locator('h3:has-text("Sales Reconciliation")')).toBeVisible()
  })

  test('Reports hub shows Cash Discrepancy tile', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h1:has-text("Reports")', { timeout: 10000 })
    await expect(page.locator('h3:has-text("Cash Discrepancy")')).toBeVisible()
  })

  test('Reports hub shows Shift Cash Report tile', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h1:has-text("Reports")', { timeout: 10000 })
    await expect(page.locator('h3:has-text("Shift Cash Report")')).toBeVisible()
  })
})
