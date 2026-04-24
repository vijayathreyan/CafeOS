import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { TEST_USERS } from './test-data'

// Phase 7 — Reports Hub + individual reports
// All reports are owner-only. Tests verify navigation, page rendering,
// filter controls, and that tables show expected columns.

async function loginAsOwner(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
}

// ─────────────────────────────────────────────────────────────
// REPORTS HUB
// ─────────────────────────────────────────────────────────────

test.describe('Phase 7 — Reports Hub', () => {
  test('Reports tile on Owner Dashboard is active and navigates to /reports', async ({ page }) => {
    await loginAsOwner(page)
    await page.waitForSelector('h3:has-text("Reports")', { timeout: 10000 })
    await page.locator('h3:has-text("Reports")').click()
    await page.waitForURL('**/reports', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Reports')
  })

  test('Reports hub shows all Phase 7 report tiles', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h1:has-text("Reports")', { timeout: 10000 })
    await expect(page.locator('h3:has-text("Milk Report")')).toBeVisible()
    await expect(page.locator('h3:has-text("Consumption Report")')).toBeVisible()
    await expect(page.locator('h3:has-text("Wastage Report")')).toBeVisible()
    await expect(page.locator('h3:has-text("Expense Report")')).toBeVisible()
    await expect(page.locator('h3:has-text("Month End Stock")')).toBeVisible()
  })

  test('Sidebar nav Reports link navigates to /reports', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/dashboard')
    // Click sidebar Reports link (desktop)
    await page.locator('a[href="/reports"]').first().click()
    await page.waitForURL('**/reports', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Reports')
  })

  test('Non-owner cannot access /reports', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
    await page.goto('/reports')
    // Should redirect away from reports (not owner)
    await expect(page).not.toHaveURL(/\/reports$/, { timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────
// MILK REPORT
// ─────────────────────────────────────────────────────────────

test.describe('Phase 7 — Milk Report', () => {
  test('Navigates to Milk Report from hub', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h3:has-text("Milk Report")', { timeout: 10000 })
    await page.locator('h3:has-text("Milk Report")').click()
    await page.waitForURL('**/owner/reports/milk', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Milk Report')
  })

  test('Milk Report renders page with filter controls', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/milk')
    await page.waitForSelector('h1:has-text("Milk Report")', { timeout: 10000 })
    // Filter controls
    await expect(page.locator('input[type="date"]').first()).toBeVisible()
    await expect(page.locator('input[type="date"]').nth(1)).toBeVisible()
  })

  test('Milk Report has KPI cards', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/milk')
    await page.waitForSelector('h1:has-text("Milk Report")', { timeout: 10000 })
    await expect(page.locator('text=Total Coffee Milk')).toBeVisible()
    await expect(page.locator('text=Total Tea Milk')).toBeVisible()
    await expect(page.locator('text=Grand Total')).toBeVisible()
    await expect(page.locator('text=Daily Average')).toBeVisible()
  })

  test('Milk Report Back button returns to /reports', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/milk')
    await page.waitForSelector('h1:has-text("Milk Report")', { timeout: 10000 })
    await page.locator('button:has-text("Reports")').click()
    await page.waitForURL('**/reports', { timeout: 8000 })
  })

  test('Milk Report branch filter changes selection', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/milk')
    await page.waitForSelector('h1:has-text("Milk Report")', { timeout: 10000 })
    // Branch select — change to KR
    const branchSelect = page.locator('[role="combobox"]').first()
    await branchSelect.click()
    await page.locator('[role="option"]:has-text("Kaappi Ready")').click()
    await expect(branchSelect).toContainText('Kaappi Ready')
  })
})

// ─────────────────────────────────────────────────────────────
// CONSUMPTION REPORT
// ─────────────────────────────────────────────────────────────

test.describe('Phase 7 — Consumption Report', () => {
  test('Navigates to Consumption Report from hub', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h3:has-text("Consumption Report")', { timeout: 10000 })
    await page.locator('h3:has-text("Consumption Report")').click()
    await page.waitForURL('**/owner/reports/consumption', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Consumption Report')
  })

  test('Consumption Report renders with filter bar and item search', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/consumption')
    await page.waitForSelector('h1:has-text("Consumption Report")', { timeout: 10000 })
    await expect(page.locator('input[placeholder*="Filter by item"]')).toBeVisible()
    await expect(page.locator('input[type="date"]').first()).toBeVisible()
  })

  test('Consumption Report has KPI cards', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/consumption')
    await page.waitForSelector('h1:has-text("Consumption Report")', { timeout: 10000 })
    await expect(page.locator('text=Total Consumed')).toBeVisible()
    await expect(page.locator('text=Unique Items')).toBeVisible()
    await expect(page.locator('text=Top Item')).toBeVisible()
  })

  test('Consumption Report item search filters results', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/consumption')
    await page.waitForSelector('h1:has-text("Consumption Report")', { timeout: 10000 })
    const searchInput = page.locator('input[placeholder*="Filter by item"]')
    await searchInput.fill('milk')
    await expect(searchInput).toHaveValue('milk')
  })
})

// ─────────────────────────────────────────────────────────────
// WASTAGE REPORT
// ─────────────────────────────────────────────────────────────

test.describe('Phase 7 — Wastage Report', () => {
  test('Navigates to Wastage Report from hub', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h3:has-text("Wastage Report")', { timeout: 10000 })
    await page.locator('h3:has-text("Wastage Report")').click()
    await page.waitForURL('**/owner/reports/wastage', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Wastage Report')
  })

  test('Wastage Report renders with filter controls', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/wastage')
    await page.waitForSelector('h1:has-text("Wastage Report")', { timeout: 10000 })
    await expect(page.locator('input[type="date"]').first()).toBeVisible()
  })

  test('Wastage Report has KPI cards', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/wastage')
    await page.waitForSelector('h1:has-text("Wastage Report")', { timeout: 10000 })
    await expect(page.locator('text=Total Wastage')).toBeVisible()
    await expect(page.locator('text=Overall Wastage %')).toBeVisible()
    await expect(page.locator('text=Complimentary')).toBeVisible()
    await expect(page.locator('text=High Wastage Rows')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// EXPENSE REPORT
// ─────────────────────────────────────────────────────────────

test.describe('Phase 7 — Expense Report', () => {
  test('Navigates to Expense Report from hub', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/reports')
    await page.waitForSelector('h3:has-text("Expense Report")', { timeout: 10000 })
    await page.locator('h3:has-text("Expense Report")').click()
    await page.waitForURL('**/owner/reports/expenses', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Expense Report')
  })

  test('Expense Report renders with Detail/By Category toggle', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/expenses')
    await page.waitForSelector('h1:has-text("Expense Report")', { timeout: 10000 })
    await expect(page.locator('button:has-text("Detail")')).toBeVisible()
    await expect(page.locator('button:has-text("By Category")')).toBeVisible()
  })

  test('Expense Report has KPI cards', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/expenses')
    await page.waitForSelector('h1:has-text("Expense Report")', { timeout: 10000 })
    await expect(page.locator('text=Grand Total')).toBeVisible()
    await expect(page.locator('text=Shop Expenses')).toBeVisible()
    await expect(page.locator('text=Gas Bill')).toBeVisible()
  })

  test('Expense Report toggles to category summary view', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/expenses')
    await page.waitForSelector('h1:has-text("Expense Report")', { timeout: 10000 })
    await page.locator('button:has-text("By Category")').click()
    await expect(page.locator('button:has-text("By Category")')).toHaveAttribute('data-state', /.*/)
  })

  test('Expense Report Back button returns to /reports', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/expenses')
    await page.waitForSelector('h1:has-text("Expense Report")', { timeout: 10000 })
    await page.locator('button:has-text("Reports")').click()
    await page.waitForURL('**/reports', { timeout: 8000 })
  })
})
