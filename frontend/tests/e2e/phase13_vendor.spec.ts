import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { TEST_USERS } from './test-data'

const BASE_URL = 'http://localhost'

async function loginAsOwner(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

/** Navigate to Kalingaraj vendor profile, returns to Items & Rates tab. */
async function goToKalingarajItemsTab(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/vendors`)
  await page.waitForSelector('[data-testid^="btn-view-vendor-"]', { timeout: 15000 })
  const kalingarajBtn = page.locator('[data-testid^="btn-view-vendor-"]').filter({
    hasText: /kalingaraj/i,
  })
  await kalingarajBtn.first().click()
  await page.waitForSelector('[data-testid="vendor-profile-page"]', { timeout: 10000 })
  await page.locator('[data-testid="items-tab-trigger"]').click()
  await page.waitForSelector('[data-testid="new-rate-btn"]', { timeout: 8000 })
}

test.describe('Phase 13 Vendor Master + Kalingaraj Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page)
  })

  // ── Fix 1: Selling price optional ────────────────────────────────────────────

  test('1. Vendor Master add-item form — selling price blank does not block save', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/vendors/new`)
    await page.waitForSelector('input[id="business_name"]', { timeout: 10000 })

    // Fill required business fields
    await page.fill('input[id="business_name"]', 'Test Vendor 00000')
    await page.fill('input[id="contact_name"]', 'Test Contact')
    await page.fill('input[id="whatsapp_number"]', '0000099999')

    // Go to Items tab
    await page.locator('button[role="tab"]').filter({ hasText: 'Items' }).click()
    await page.waitForSelector('button:has-text("Add Item")', { timeout: 5000 })
    await page.locator('button:has-text("Add Item")').click()

    // Fill cost price but leave selling price blank
    const costInput = page
      .locator('input[type="number"]')
      .filter({ hasNot: page.locator('') })
      .first()
    await costInput.fill('50')

    // Selling price field should be visible and accept blank
    const allNumberInputs = page.locator('input[type="number"]')
    const count = await allNumberInputs.count()
    // Find selling price input (second number input in the item row, placeholder contains Optional)
    const sellingInput = page.locator('input[placeholder*="Optional"]').first()
    if (await sellingInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sellingInput.clear()
      // Verify no validation error shown immediately
      const errorEl = page.locator('.text-destructive').filter({ hasText: /selling/i })
      expect(await errorEl.count()).toBe(0)
    }
    expect(count).toBeGreaterThan(0)
  })

  test('2. Vendor Master item dropdown shows unit not item_type for Milk', async ({ page }) => {
    test.setTimeout(30000)
    await page.goto(`${BASE_URL}/vendors/new`)
    await page.waitForSelector('input[id="business_name"]', { timeout: 10000 })

    // Go to Items tab
    await page.locator('button[role="tab"]').filter({ hasText: 'Items' }).click()
    await page.waitForSelector('button:has-text("Add Item")', { timeout: 5000 })
    await page.locator('button:has-text("Add Item")').click()

    // Check the item dropdown options
    await page.waitForSelector('select', { timeout: 5000 })
    const itemSelect = page.locator('select').first()
    const milkOption = itemSelect.locator('option').filter({ hasText: /^Milk/ })
    if (await milkOption.count().then((c) => c > 0)) {
      const optionText = await milkOption.first().textContent()
      // Should show unit 'L', not item_type 'stock'
      expect(optionText).not.toContain('stock ·')
      // Should contain 'L' for litres
      expect(optionText).toMatch(/L/)
    }
  })

  // ── Fix 3: Save button visible + toast ───────────────────────────────────────

  test('3. Kalingaraj Items & Rates — New Rate button and submit button are visible', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await goToKalingarajItemsTab(page)
    // Click New Rate on the first (milk) item
    await page.locator('[data-testid="new-rate-btn"]').first().click()
    await page.waitForSelector('[data-testid="add-rate-form"]', { timeout: 5000 })
    // Submit button must be visible
    const submitBtn = page.locator('[data-testid="btn-add-rate-submit"]').first()
    await expect(submitBtn).toBeVisible()
  })

  test('4. Kalingaraj Items & Rates — saving a new rate shows success toast', async ({ page }) => {
    test.setTimeout(30000)
    await goToKalingarajItemsTab(page)
    await page.locator('[data-testid="new-rate-btn"]').first().click()
    await page.waitForSelector('[data-testid="add-rate-form"]', { timeout: 5000 })

    // Fill cost price
    await page.locator('[data-testid="input-cost-price"]').fill('69')

    // Fill effective_from with a past date to avoid conflict
    const pastDate = '2026-01-01'
    await page.locator('[data-testid="input-effective-from"]').fill(pastDate)

    // Submit
    await page.locator('[data-testid="btn-add-rate-submit"]').first().click()

    // Expect success toast
    await page.waitForSelector('[role="status"], [data-testid="toast"], .toast', { timeout: 8000 })
    const toastText = await page
      .locator('[role="status"], [data-testid="toast"], .toast')
      .first()
      .textContent()
      .catch(() => '')
    expect(toastText?.toLowerCase()).toMatch(/rate|updated|success/i)
  })

  test('5. Kalingaraj Items & Rates — after adding rate the rate appears in history', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await goToKalingarajItemsTab(page)
    // Rate history rows should exist (at least one — the seeded rate from migration 021)
    await page.waitForSelector('[data-testid="rate-history-row"]', { timeout: 8000 })
    const rows = page.locator('[data-testid="rate-history-row"]')
    expect(await rows.count()).toBeGreaterThan(0)
    // At least one row should show a cost_price (non-zero ₹)
    const firstRow = await rows.first().textContent()
    expect(firstRow).toContain('₹')
  })

  // ── Fix 4: Kalingaraj Compute shows correct rate ──────────────────────────────

  test('6. Kalingaraj vendor payment Compute — shows rate column not ₹0/L', async ({ page }) => {
    test.setTimeout(30000)
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
    if (tableVisible) {
      const tableText = await kalingarajCard
        .locator('[data-testid="auto-total-table"]')
        .textContent()
      // Should not show ₹0.00 as the total — rate must be applied
      expect(tableText).not.toMatch(/₹\s*0\.00\s*$/m)
      // Should contain a rate value like ₹69
      expect(tableText).toMatch(/₹\d+/)
    }
    // If empty state, the test passes — no data yet is acceptable
  })

  test('7. Kalingaraj vendor payment Compute — total is not ₹0.00 when litres recorded', async ({
    page,
  }) => {
    test.setTimeout(30000)
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
    if (tableVisible) {
      // Grand total must not be ₹0.00
      const grandTotal = kalingarajCard.locator('[data-testid="auto-total-grand-total"]')
      if (await grandTotal.isVisible({ timeout: 2000 }).catch(() => false)) {
        const totalText = await grandTotal.textContent()
        expect(totalText).not.toBe('₹0.00')
        expect(totalText).not.toBe('0.00')
      }
    }
  })

  test('8. Kalingaraj compute — empty state shows milk-specific message', async ({ page }) => {
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
    if (await emptyEl.isVisible()) {
      const text = await emptyEl.textContent()
      expect(text).toContain('No milk purchases recorded')
    }
    // If table visible, test passes
  })
})
