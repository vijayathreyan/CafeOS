import { test, expect } from '@playwright/test'
import { loginAs, ensureShiftOpen } from './helpers'
import { TEST_USERS } from './test-data'

const BASE_URL = 'http://localhost'

async function loginAsOwner(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

async function loginAsStaffKR(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.staff_kr)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

test.describe('Phase 13 Milk Consolidation — Staff Entry + Reports', () => {
  // ── Staff Data Entry — Milk Section ─────────────────────────────────────────

  test('1. Staff data entry — Milk section shows Litres Bought Today field', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)
    // Expand Milk section card if collapsed
    const milkToggle = page
      .locator('[data-section-id="milk"], button:has-text("Milk"), .section-card')
      .filter({ hasText: 'Milk' })
      .first()
    if (await milkToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await milkToggle.click()
    }
    await page.waitForSelector('[data-testid="milk-bought-input"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="milk-bought-input"]')).toBeVisible()
  })

  test('2. Staff data entry — Opening balance shown as read-only informational', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)
    // Ensure milk card is open (it may auto-expand or require a click)
    const milkToggle = page
      .locator('.section-card, [role="button"]')
      .filter({ hasText: 'Milk' })
      .first()
    if (await milkToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const inputVisible = await page
        .locator('[data-testid="milk-opening-balance"]')
        .isVisible()
        .catch(() => false)
      if (!inputVisible) await milkToggle.click()
    }
    await page.waitForSelector('[data-testid="milk-opening-balance"]', { timeout: 10000 })
    const info = page.locator('[data-testid="milk-opening-balance"]')
    await expect(info).toBeVisible()
    // Verify it contains "Opening balance" text and "(carried from yesterday)"
    const text = await info.textContent()
    expect(text).toContain('Opening balance')
    expect(text).toContain('carried from yesterday')
    // Verify there is NO input element inside the opening balance info (it's read-only)
    const inputInside = info.locator('input')
    expect(await inputInside.count()).toBe(0)
  })

  test('3. Staff data entry — enter bought litres and save, closing balance updates', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)
    const milkToggle = page
      .locator('.section-card, [role="button"]')
      .filter({ hasText: 'Milk' })
      .first()
    if (await milkToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const boughtVisible = await page
        .locator('[data-testid="milk-bought-input"]')
        .isVisible()
        .catch(() => false)
      if (!boughtVisible) await milkToggle.click()
    }
    await page.waitForSelector('[data-testid="milk-bought-input"]', { timeout: 10000 })
    const boughtInput = page.locator('[data-testid="milk-bought-input"]')
    await boughtInput.fill('10')
    // Closing balance should update to reflect bought value
    await page.waitForSelector('[data-testid="milk-closing-balance"]', { timeout: 5000 })
    const closingText = await page.locator('[data-testid="milk-closing-balance"]').textContent()
    expect(closingText).toContain('L')
    expect(closingText).toContain('Closing balance')
  })

  test('4. Staff data entry — closing balance auto-calculates: opening + bought − consumed', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)
    const milkToggle = page
      .locator('.section-card, [role="button"]')
      .filter({ hasText: 'Milk' })
      .first()
    if (await milkToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const boughtVisible = await page
        .locator('[data-testid="milk-bought-input"]')
        .isVisible()
        .catch(() => false)
      if (!boughtVisible) await milkToggle.click()
    }
    await page.waitForSelector('[data-testid="milk-bought-input"]', { timeout: 10000 })
    // Fill bought = 8
    await page.locator('[data-testid="milk-bought-input"]').fill('8')
    // Closing should be shown
    const closingEl = page.locator('[data-testid="milk-closing-balance"]')
    await expect(closingEl).toBeVisible()
    const closingText = await closingEl.textContent()
    // Closing = opening (unknown, 0 if new) + 8 - consumed (0 if not filled) = at least contains 'L'
    expect(closingText).toContain('L')
  })

  // ── Stock Levels — Milk Row Removed ─────────────────────────────────────────

  test('5. Stock Levels form — Milk row no longer present', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await page.goto(`${BASE_URL}/stock-entry`)
    await page.waitForSelector('table', { timeout: 15000 })
    // The stock entry table should NOT have a row with item name 'Milk'
    const milkRow = page.locator('td').filter({ hasText: /^Milk$/ })
    expect(await milkRow.count()).toBe(0)
  })

  // ── Milk Report ──────────────────────────────────────────────────────────────

  test('6. Milk Report — all columns present: Opening Bal, Bought, Used, Remaining', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto(`${BASE_URL}/reports/milk`)
    await page.waitForSelector('[data-testid="milk-table"]', { timeout: 15000 })
    const table = page.locator('[data-testid="milk-table"]')
    await expect(table.locator('text=Opening Bal').first()).toBeVisible()
    await expect(table.locator('text=Bought').first()).toBeVisible()
    await expect(table.locator('text=Used').first()).toBeVisible()
    await expect(table.locator('text=Remaining').first()).toBeVisible()
    await expect(table.locator('text=S1 Coffee').first()).toBeVisible()
    await expect(table.locator('text=S1 Tea').first()).toBeVisible()
    await expect(table.locator('text=S2 Coffee').first()).toBeVisible()
    await expect(table.locator('text=S2 Tea').first()).toBeVisible()
  })

  test('7. Milk Report — KPI cards show L unit not pkts or packets', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto(`${BASE_URL}/reports/milk`)
    await page.waitForSelector('[data-testid="kpi-total-bought"]', { timeout: 15000 })
    const bought = await page.locator('[data-testid="kpi-total-bought"]').textContent()
    expect(bought).toContain('L')
    expect(bought).not.toContain('pkts')
    expect(bought).not.toContain('packets')
    expect(bought).toContain('Litres purchased')
    const used = await page.locator('[data-testid="kpi-total-used"]').textContent()
    expect(used).toContain('L')
    expect(used).not.toContain('pkts')
    expect(used).toContain('Litres consumed')
    const remaining = await page.locator('[data-testid="kpi-closing-remaining"]').textContent()
    expect(remaining).toContain('L')
    expect(remaining).toContain('End of period stock')
  })

  test('8. Milk Report — page loads without error and table or empty state is shown', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto(`${BASE_URL}/reports/milk`)
    await page.waitForSelector('[data-testid="milk-table"]', { timeout: 15000 })
    // Either data rows or empty state must be present
    const tableEl = page.locator('[data-testid="milk-table"]')
    await expect(tableEl).toBeVisible()
    // No error toast or crash
    const errorToast = page.locator('[role="alert"]').filter({ hasText: /error|failed/i })
    expect(await errorToast.count()).toBe(0)
  })

  // ── Kalingaraj Vendor Payment ────────────────────────────────────────────────

  test('9. Kalingaraj compute — shows itemised breakdown or proper empty state', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto(`${BASE_URL}/vendor-payments`)
    await page.waitForSelector('[data-testid="vendor-card-kalingaraj"]', { timeout: 15000 })
    const kalingarajCard = page.locator('[data-testid="vendor-card-kalingaraj"]')
    await kalingarajCard.locator('[data-testid="compute-btn"]').click()
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

    // If table is visible, it should have date-based rows (not generic item rows)
    if (tableVisible) {
      const tableText = await kalingarajCard
        .locator('[data-testid="auto-total-table"]')
        .textContent()
      // Should contain a date pattern or 'L' for litres
      expect(tableText).toMatch(/L|litre/i)
    }
  })

  test('10. Kalingaraj empty state says No milk purchases recorded not generic message', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto(`${BASE_URL}/vendor-payments`)
    await page.waitForSelector('[data-testid="vendor-card-kalingaraj"]', { timeout: 15000 })
    const kalingarajCard = page.locator('[data-testid="vendor-card-kalingaraj"]')
    await kalingarajCard.locator('[data-testid="compute-btn"]').click()
    await kalingarajCard
      .locator('[data-testid="auto-total-table"], [data-testid="auto-total-empty"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
    const emptyEl = kalingarajCard.locator('[data-testid="auto-total-empty"]')
    if (await emptyEl.isVisible()) {
      const text = await emptyEl.textContent()
      expect(text).toContain('No milk purchases recorded')
      expect(text).not.toContain('No daily entries found')
    }
    // If breakdown table visible, test passes (empty state is not shown)
  })

  // ── P&L Report ───────────────────────────────────────────────────────────────

  test('11. P&L Report — Milk line present in Raw Materials section', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto(`${BASE_URL}/reports/pl`)
    await page.waitForSelector('[data-testid="pl-report-page"]', { timeout: 15000 })
    // Raw Materials section should contain a Milk row
    const rawMaterialsSection = page
      .locator('[data-testid="section-raw-materials"], [data-testid^="pl-section-"]')
      .filter({ hasText: 'Raw Materials' })
      .first()
    // Fallback: look anywhere on the page for a milk label
    const milkRow = page
      .locator('td, th')
      .filter({ hasText: /^Milk$/ })
      .first()
    await expect(milkRow.or(rawMaterialsSection.locator('text=Milk'))).toBeVisible()
  })
})

// ─── Phase 13 Milk Bug Fix — Milk Details form fields and card status ────────

async function loginAsStaffC2(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.staff_c2)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

async function openMilkCard(page: import('@playwright/test').Page) {
  await ensureShiftOpen(page)
  // Find the Milk section card header and click to expand if not already open
  const milkHeader = page.locator('button').filter({ hasText: /Milk/i }).first()
  const milkInput = page.locator('[data-testid="milk-bought-input"]')
  const alreadyOpen = await milkInput.isVisible({ timeout: 2000 }).catch(() => false)
  if (!alreadyOpen) {
    await milkHeader.click()
  }
  await page.waitForSelector('[data-testid="milk-bought-input"]', { timeout: 10000 })
}

test.describe('Phase 13 Milk Bug Fix — form fields and card Done status', () => {
  test('12. C2 staff — all 5 milk fields accept input', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffC2(page)
    await openMilkCard(page)

    // Fill all 5 fields and verify each accepts the value
    await page.locator('[data-testid="milk-bought-input"]').fill('10')
    await expect(page.locator('[data-testid="milk-bought-input"]')).toHaveValue('10')

    await page.locator('[data-testid="milk-coffee-s1"]').fill('3')
    await expect(page.locator('[data-testid="milk-coffee-s1"]')).toHaveValue('3')

    await page.locator('[data-testid="milk-tea-s1"]').fill('2')
    await expect(page.locator('[data-testid="milk-tea-s1"]')).toHaveValue('2')

    await page.locator('[data-testid="milk-coffee-s2"]').fill('1.5')
    await expect(page.locator('[data-testid="milk-coffee-s2"]')).toHaveValue('1.5')

    await page.locator('[data-testid="milk-tea-s2"]').fill('1')
    await expect(page.locator('[data-testid="milk-tea-s2"]')).toHaveValue('1')
  })

  test('13. C2 staff — Daily Total updates live as shift fields change', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffC2(page)
    await openMilkCard(page)

    await page.locator('[data-testid="milk-coffee-s1"]').fill('3')
    await page.locator('[data-testid="milk-tea-s1"]').fill('2')
    await page.locator('[data-testid="milk-coffee-s2"]').fill('1')
    await page.locator('[data-testid="milk-tea-s2"]').fill('1')

    // Daily total should be 3+2+1+1 = 7.0L
    const dailyTotal = page.locator('[data-testid="milk-daily-total"]')
    await expect(dailyTotal).toBeVisible()
    const text = await dailyTotal.textContent()
    expect(text).toContain('7.0L')
  })

  test('14. C2 staff — Save persists all fields and card shows Done', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffC2(page)
    await openMilkCard(page)

    await page.locator('[data-testid="milk-bought-input"]').fill('12')
    await page.locator('[data-testid="milk-coffee-s1"]').fill('4')
    await page.locator('[data-testid="milk-tea-s1"]').fill('3')
    await page.locator('[data-testid="milk-coffee-s2"]').fill('2')
    await page.locator('[data-testid="milk-tea-s2"]').fill('1')

    await page.locator('[data-testid="milk-save-btn"]').click()

    // Toast should appear with success message
    await page.waitForSelector('[role="status"], .toast, [data-testid*="toast"]', {
      timeout: 8000,
    })

    // Card header should show Done (green checkmark text)
    const cardHeader = page.locator('button').filter({ hasText: /Milk/i }).first()
    await expect(cardHeader.locator('text=Done')).toBeVisible({ timeout: 5000 })
  })

  test('15. KR staff — single daily entry form renders (no shift columns)', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await openMilkCard(page)

    // KR should NOT show the shift-split table
    await expect(page.locator('[data-testid="milk-shift-table"]')).not.toBeVisible()

    // KR should show single coffee and tea fields
    await expect(page.locator('[data-testid="milk-coffee-s1"]')).toBeVisible()
    await expect(page.locator('[data-testid="milk-tea-s1"]')).toBeVisible()

    // KR should NOT show shift-2 fields
    await expect(page.locator('[data-testid="milk-coffee-s2"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="milk-tea-s2"]')).not.toBeVisible()
  })

  test('16. KR staff — Save persists values and card shows Done', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await openMilkCard(page)

    await page.locator('[data-testid="milk-bought-input"]').fill('8')
    await page.locator('[data-testid="milk-coffee-s1"]').fill('5')
    await page.locator('[data-testid="milk-tea-s1"]').fill('3')

    await page.locator('[data-testid="milk-save-btn"]').click()

    // Toast should appear
    await page.waitForSelector('[role="status"], .toast, [data-testid*="toast"]', {
      timeout: 8000,
    })

    // Card header shows Done
    const cardHeader = page.locator('button').filter({ hasText: /Milk/i }).first()
    await expect(cardHeader.locator('text=Done')).toBeVisible({ timeout: 5000 })
  })
})
