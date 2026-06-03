import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { TEST_USERS } from './test-data'

const BASE_URL = 'http://localhost'

async function loginAsOwner(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

test.describe('Phase 13B — Milk Report Litres + Kalingaraj Compute + Rate History', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page)
  })

  // ── Milk Report KPI units ────────────────────────────────────────────────────

  test('1. Milk Report KPI cards show L unit not pkts', async ({ page }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/reports/milk`)
    await page.waitForSelector('[data-testid="kpi-total-bought"]', { timeout: 15000 })
    const bought = await page.locator('[data-testid="kpi-total-bought"]').textContent()
    expect(bought).toContain('L')
    expect(bought).not.toContain('pkts')
    const used = await page.locator('[data-testid="kpi-total-used"]').textContent()
    expect(used).toContain('L')
    expect(used).not.toContain('pkts')
    const remaining = await page.locator('[data-testid="kpi-closing-remaining"]').textContent()
    expect(remaining).toContain('L')
    expect(remaining).not.toContain('pkts')
  })

  test('2. Milk Report Bought KPI subtitle says Litres purchased', async ({ page }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/reports/milk`)
    await page.waitForSelector('[data-testid="kpi-total-bought"]', { timeout: 15000 })
    const bought = await page.locator('[data-testid="kpi-total-bought"]').textContent()
    expect(bought).toContain('Litres purchased')
    expect(bought).not.toContain('Packets')
    const used = await page.locator('[data-testid="kpi-total-used"]').textContent()
    expect(used).toContain('Litres consumed')
    expect(used).not.toContain('Packets')
  })

  test('3. Milk Report table shows Opening Bal, Bought, Used, Remaining columns', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/reports/milk`)
    await page.waitForSelector('[data-testid="milk-table"]', { timeout: 15000 })
    const table = page.locator('[data-testid="milk-table"]')
    await expect(table.locator('text=Opening Bal').first()).toBeVisible()
    await expect(table.locator('text=Bought').first()).toBeVisible()
    await expect(table.locator('text=Used').first()).toBeVisible()
    await expect(table.locator('text=Remaining').first()).toBeVisible()
  })

  // ── Kalingaraj Vendor Payment ────────────────────────────────────────────────

  test('4. Kalingaraj vendor payment — Compute button visible', async ({ page }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/vendor-payments`)
    await page.waitForSelector('[data-testid="vendor-card-kalingaraj"]', { timeout: 15000 })
    await expect(
      page.locator('[data-testid="vendor-card-kalingaraj"]').locator('[data-testid="compute-btn"]')
    ).toBeVisible()
  })

  test('5. Kalingaraj compute shows breakdown or empty state after click', async ({ page }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/vendor-payments`)
    await page.waitForSelector('[data-testid="vendor-card-kalingaraj"]', { timeout: 15000 })
    const kalingarajCard = page.locator('[data-testid="vendor-card-kalingaraj"]')
    await kalingarajCard.locator('[data-testid="compute-btn"]').click()
    // Wait for table or empty state within the Kalingaraj card
    await kalingarajCard
      .locator('[data-testid="auto-total-table"], [data-testid="auto-total-empty"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
    const tableVisible = await kalingarajCard
      .locator('[data-testid="auto-total-table"]')
      .isVisible()
    const emptyVisible = await kalingarajCard
      .locator('[data-testid="auto-total-empty"]')
      .isVisible()
    expect(tableVisible || emptyVisible).toBeTruthy()
  })

  test('6. Kalingaraj empty state shows milk-specific message not generic', async ({ page }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/vendor-payments`)
    await page.waitForSelector('[data-testid="vendor-card-kalingaraj"]', { timeout: 15000 })
    const kalingarajCard = page.locator('[data-testid="vendor-card-kalingaraj"]')
    await kalingarajCard.locator('[data-testid="compute-btn"]').click()
    await kalingarajCard
      .locator('[data-testid="auto-total-table"], [data-testid="auto-total-empty"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
    const emptyEl = kalingarajCard.locator('[data-testid="auto-total-empty"]')
    const emptyVisible = await emptyEl.isVisible()
    if (emptyVisible) {
      const text = await emptyEl.textContent()
      expect(text).toContain('No milk purchases recorded')
      expect(text).not.toContain('No daily entries found')
    }
    // If breakdown table is visible, empty state is not shown — test passes
  })

  // ── Vendor Master → Kalingaraj Rate History ──────────────────────────────────

  test('7. Vendor Master → Kalingaraj → rate history visible with effective from date', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/vendors`)
    await page.waitForSelector('[data-testid="btn-view-vendor-kalingaraj"]', { timeout: 15000 })
    await page.locator('[data-testid="btn-view-vendor-kalingaraj"]').click()
    await page.waitForSelector('[data-testid="vendor-profile-page"]', { timeout: 10000 })
    // Navigate to Items & Rates tab
    await page.locator('[data-testid="items-tab-trigger"]').click()
    // Rate history row should be visible (seeded from migration 006)
    await page.waitForSelector('[data-testid="rate-history-row"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="rate-history-row"]').first()).toBeVisible()
    // Check it contains an effective-from date
    const rateText = await page.locator('[data-testid="rate-history-row"]').first().textContent()
    expect(rateText).toMatch(/\d{4}-\d{2}-\d{2}|From|per_litre|current/i)
  })

  test('8. Vendor Master → Kalingaraj → add new rate → saves with effective_from date', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/vendors`)
    await page.waitForSelector('[data-testid="btn-view-vendor-kalingaraj"]', { timeout: 15000 })
    await page.locator('[data-testid="btn-view-vendor-kalingaraj"]').click()
    await page.waitForSelector('[data-testid="vendor-profile-page"]', { timeout: 10000 })
    // Navigate to Items & Rates tab
    await page.locator('[data-testid="items-tab-trigger"]').click()
    await page.waitForSelector('[data-testid="new-rate-btn"]', { timeout: 10000 })
    // Click New Rate on the first item (Milk)
    await page.locator('[data-testid="new-rate-btn"]').first().click()
    await page.waitForSelector('[data-testid="add-rate-form"]', { timeout: 5000 })
    // Fill in a new rate using the specific cost_price testid
    await page.locator('[data-testid="input-cost-price"]').fill('28')
    // Set effective from date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    await page.locator('[data-testid="input-effective-from"]').fill(tomorrowStr)
    // Submit
    await page.locator('[data-testid="btn-add-rate-submit"]').click()
    // Wait for toast success
    await page.waitForSelector('[role="status"], [data-sonner-toast], .toast', { timeout: 10000 })
    const toastVisible =
      (await page.locator('[role="status"]').count()) > 0 ||
      (await page.locator('[data-sonner-toast]').count()) > 0 ||
      (await page.locator('.toast').count()) > 0
    expect(toastVisible).toBeTruthy()
    // New rate row should now be visible
    await page.waitForSelector('[data-testid="rate-history-row"]', { timeout: 10000 })
    const rateCount = await page.locator('[data-testid="rate-history-row"]').count()
    expect(rateCount).toBeGreaterThanOrEqual(2)
  })
})
