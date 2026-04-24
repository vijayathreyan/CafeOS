import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { TEST_USERS } from './test-data'

// Phase 8 — Monthly P&L Report + Daily Sales Summary
// All reports are owner-only. Tests verify navigation, page rendering,
// tab/filter controls, section structure, forms, and export buttons.

async function loginAsOwner(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
}

// ─────────────────────────────────────────────────────────────
// REPORTS HUB — Phase 8 tiles
// ─────────────────────────────────────────────────────────────

test.describe('Phase 8 — Reports Hub tiles', () => {
  test('Reports hub shows Monthly P&L tile as active', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h1:has-text("Reports")', { timeout: 10000 })
    const plTile = page.locator('h3:has-text("Monthly P&L")')
    await expect(plTile).toBeVisible()
  })

  test('Reports hub shows Daily Sales Summary tile as active', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h1:has-text("Reports")', { timeout: 10000 })
    const dsTile = page.locator('h3:has-text("Daily Sales Summary")')
    await expect(dsTile).toBeVisible()
  })

  test('Clicking Monthly P&L tile navigates to /reports/pl', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h3:has-text("Monthly P&L")', { timeout: 10000 })
    await page.locator('h3:has-text("Monthly P&L")').click()
    await page.waitForURL('**/reports/pl', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('P&L Report')
  })

  test('Clicking Daily Sales Summary tile navigates to /reports/daily-sales', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h3:has-text("Daily Sales Summary")', { timeout: 10000 })
    await page.locator('h3:has-text("Daily Sales Summary")').click()
    await page.waitForURL('**/reports/daily-sales', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Daily Sales Summary')
  })
})

// ─────────────────────────────────────────────────────────────
// SIDEBAR NAV
// ─────────────────────────────────────────────────────────────

test.describe('Phase 8 — Sidebar navigation', () => {
  test('Sidebar has P&L Report link', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await expect(page.locator('a[href="/reports/pl"]').first()).toBeVisible()
  })

  test('Sidebar P&L Report link navigates to /reports/pl', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await page.locator('a[href="/reports/pl"]').first().click()
    await page.waitForURL('**/reports/pl', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('P&L Report')
  })

  test('Sidebar has Daily Sales Summary link', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await expect(page.locator('a[href="/reports/daily-sales"]').first()).toBeVisible()
  })

  test('Sidebar Daily Sales link navigates to /reports/daily-sales', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    await page.locator('a[href="/reports/daily-sales"]').first().click()
    await page.waitForURL('**/reports/daily-sales', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Daily Sales Summary')
  })
})

// ─────────────────────────────────────────────────────────────
// ACCESS CONTROL
// ─────────────────────────────────────────────────────────────

test.describe('Phase 8 — Access control', () => {
  test('Non-owner cannot access /reports/pl', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
    await page.goto('/reports/pl')
    await expect(page).not.toHaveURL(/\/reports\/pl$/, { timeout: 5000 })
  })

  test('Non-owner cannot access /reports/daily-sales', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
    await page.goto('/reports/daily-sales')
    await expect(page).not.toHaveURL(/\/reports\/daily-sales$/, { timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────
// P&L REPORT — page structure
// ─────────────────────────────────────────────────────────────

test.describe('Phase 8 — P&L Report page', () => {
  test('P&L Report page renders with correct title', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await expect(page.locator('[data-testid="pl-report-page"]')).toBeVisible()
  })

  test('P&L Report has KPI row', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await expect(page.locator('[data-testid="kpi-row"]')).toBeVisible()
  })

  test('P&L Report has branch tabs KR / C2 / Combined', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await expect(page.locator('[data-testid="branch-tabs"]')).toBeVisible()
    await expect(page.locator('[data-testid="branch-kr"]')).toBeVisible()
    await expect(page.locator('[data-testid="branch-c2"]')).toBeVisible()
    await expect(page.locator('[data-testid="branch-combined"]')).toBeVisible()
  })

  test('P&L Report has month picker', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await expect(page.locator('[data-testid="month-picker"]')).toBeVisible()
  })

  test('P&L Report has PDF and Excel export buttons', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-excel"]')).toBeVisible()
  })

  test('P&L Report tab switch to C2 works', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await page.locator('[data-testid="branch-c2"]').click()
    await expect(page.locator('[data-testid="branch-c2"]')).toHaveAttribute('data-state', 'active')
  })

  test('P&L Report tab switch to Combined works', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await page.locator('[data-testid="branch-combined"]').click()
    await expect(page.locator('[data-testid="branch-combined"]')).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  test('P&L Report back button navigates to /reports', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await page.locator('button:has-text("Reports")').click()
    await page.waitForURL('**/reports', { timeout: 8000 })
  })
})

// ─────────────────────────────────────────────────────────────
// P&L REPORT — sections and salary form
// ─────────────────────────────────────────────────────────────

test.describe('Phase 8 — P&L Report sections', () => {
  test('P&L Report renders section 1 (Revenue) after data loads', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    // Wait for loading to finish (skeleton disappears)
    await page.waitForSelector('[data-testid="section-1"]', { timeout: 15000 })
    await expect(page.locator('[data-testid="section-1"]')).toBeVisible()
  })

  test('P&L Report renders section 4 (Salary) with inline form', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    await page.waitForSelector('[data-testid="section-4"]', { timeout: 15000 })
    await expect(page.locator('[data-testid="salary-form"]')).toBeVisible()
  })

  test('P&L Report KR salary sub-form is visible under section 4', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/pl')
    await page.waitForSelector('h1:has-text("P&L Report")', { timeout: 12000 })
    // Default branch is KR, so KR salary form should be visible
    await page.waitForSelector('[data-testid="salary-form-KR"]', { timeout: 15000 })
    await expect(page.locator('[data-testid="salary-form-KR"]')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// DAILY SALES SUMMARY — page structure
// ─────────────────────────────────────────────────────────────

test.describe('Phase 8 — Daily Sales Summary page', () => {
  test('Daily Sales Summary renders with correct title', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/daily-sales')
    await page.waitForSelector('h1:has-text("Daily Sales Summary")', { timeout: 12000 })
    await expect(page.locator('[data-testid="daily-sales-page"]')).toBeVisible()
  })

  test('Daily Sales Summary has branch tabs KR / C2 / Combined', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/daily-sales')
    await page.waitForSelector('h1:has-text("Daily Sales Summary")', { timeout: 12000 })
    await expect(page.locator('[data-testid="branch-tabs"]')).toBeVisible()
    await expect(page.locator('[data-testid="branch-kr"]')).toBeVisible()
    await expect(page.locator('[data-testid="branch-c2"]')).toBeVisible()
    await expect(page.locator('[data-testid="branch-combined"]')).toBeVisible()
  })

  test('Daily Sales Summary has month picker', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/daily-sales')
    await page.waitForSelector('h1:has-text("Daily Sales Summary")', { timeout: 12000 })
    await expect(page.locator('[data-testid="month-picker"]')).toBeVisible()
  })

  test('Daily Sales Summary has PDF and Excel export buttons', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/daily-sales')
    await page.waitForSelector('h1:has-text("Daily Sales Summary")', { timeout: 12000 })
    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-excel"]')).toBeVisible()
  })

  test('Daily Sales Summary tab switch to C2 works', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/daily-sales')
    await page.waitForSelector('h1:has-text("Daily Sales Summary")', { timeout: 12000 })
    await page.locator('[data-testid="branch-c2"]').click()
    await expect(page.locator('[data-testid="branch-c2"]')).toHaveAttribute('data-state', 'active')
  })

  test('Daily Sales Summary tab switch to Combined works', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/daily-sales')
    await page.waitForSelector('h1:has-text("Daily Sales Summary")', { timeout: 12000 })
    await page.locator('[data-testid="branch-combined"]').click()
    await expect(page.locator('[data-testid="branch-combined"]')).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  test('Daily Sales Summary back button navigates to /reports', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/daily-sales')
    await page.waitForSelector('h1:has-text("Daily Sales Summary")', { timeout: 12000 })
    await page.locator('button:has-text("Reports")').click()
    await page.waitForURL('**/reports', { timeout: 8000 })
  })

  test('Daily Sales Summary month total row is present after data loads', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports/daily-sales')
    await page.waitForSelector('h1:has-text("Daily Sales Summary")', { timeout: 12000 })
    await page.waitForSelector('[data-testid="month-total-row"]', { timeout: 15000 })
    await expect(page.locator('[data-testid="month-total-row"]')).toBeVisible()
  })
})
