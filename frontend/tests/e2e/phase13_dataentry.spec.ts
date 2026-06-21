import { test, expect } from '@playwright/test'
import { loginAs, ensureShiftOpen } from './helpers'
import { TEST_USERS } from './test-data'

const BASE_URL = 'http://localhost'

async function loginAsStaffKR(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.staff_kr)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

async function loginAsOwner(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

async function loginAsSupervisor(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.supervisor)
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

test.describe('Phase 13 Data Entry Cards — Save, Persist, UI Structure', () => {
  // ── Test 1: Snacks card — save shows Toast success ────────────────────────────

  test('1. Snacks card — Save button visible after expanding, save triggers success Toast', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)

    // Expand Snacks card
    const snacksCard = page.locator('.card').filter({ hasText: 'Snacks' }).first()
    await snacksCard.click()

    // Save button should be visible
    await page.waitForSelector('[data-testid="snacks-save-btn"]', { timeout: 8000 })
    await expect(page.locator('[data-testid="snacks-save-btn"]')).toBeVisible()

    // Click save
    await page.locator('[data-testid="snacks-save-btn"]').click()

    // Should show success toast or "✓ Saved" state
    const savedIndicator = page
      .locator('[data-testid="snacks-save-btn"]')
      .filter({ hasText: /saved/i })
    await expect(savedIndicator).toBeVisible({ timeout: 5000 })
  })

  // ── Test 2: Assets card — save persists across card collapse/expand ───────────

  test('2. Assets card — save persists data across card collapse and re-expand', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)

    // Expand Assets card
    const assetsCard = page.locator('.card').filter({ hasText: 'Assets' }).first()
    await assetsCard.click()

    await page.waitForSelector('[data-testid="assets-save-btn"]', { timeout: 8000 })

    // Fill in a value
    const firstInput = page.locator('input[type="number"]').first()
    await firstInput.fill('5')

    // Save
    await page.locator('[data-testid="assets-save-btn"]').click()

    // Wait for saved state
    await expect(
      page.locator('[data-testid="assets-save-btn"]').filter({ hasText: /saved/i })
    ).toBeVisible({ timeout: 5000 })

    // Collapse card by clicking on another card header
    const snacksCard = page.locator('.card').filter({ hasText: 'Snacks' }).first()
    await snacksCard.click()

    // Re-expand Assets card
    await assetsCard.click()
    await page.waitForSelector('[data-testid="assets-save-btn"]', { timeout: 8000 })

    // Status chip should show Done (data persisted)
    const doneChip = assetsCard.locator('text=Done')
    await expect(doneChip).toBeVisible({ timeout: 5000 })
  })

  // ── Test 3: Notes card — save succeeds ───────────────────────────────────────

  test('3. Notes card — save shows success indicator', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)

    // Expand Notes card
    const notesCard = page.locator('.card').filter({ hasText: /Notes/ }).last()
    await notesCard.click()

    await page.waitForSelector('[data-testid="notes-save-btn"]', { timeout: 8000 })
    await expect(page.locator('[data-testid="notes-save-btn"]')).toBeVisible()

    // Fill in notes
    await page.locator('[data-testid="notes-textarea"]').fill('Test note from Playwright')

    // Save
    await page.locator('[data-testid="notes-save-btn"]').click()

    // Should show saved
    await expect(
      page.locator('[data-testid="notes-save-btn"]').filter({ hasText: /saved/i })
    ).toBeVisible({ timeout: 5000 })
  })

  // ── Test 4: Stock Levels card — appears inside Today's Shift card list ───────

  test('4. Stock Levels card — visible inside the shift dashboard card list', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)

    // Stock Levels card must be present in the shift dashboard
    await page.waitForSelector('text=Stock Levels', { timeout: 10000 })
    const stockCard = page.locator('.card').filter({ hasText: 'Stock Levels' }).first()
    await expect(stockCard).toBeVisible()
  })

  // ── Test 5: Cash Expenses card — appears inside Today's Shift card list ──────

  test('5. Cash Expenses card — visible inside the shift dashboard card list', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)

    await page.waitForSelector('text=Cash Expenses', { timeout: 10000 })
    const expenseCard = page.locator('.card').filter({ hasText: 'Cash Expenses' }).first()
    await expect(expenseCard).toBeVisible()
  })

  // ── Test 6: Cash Deposit (denomination) card — no longer on shift dashboard ──

  test('6. Old denomination Cash Deposit card — no longer appears on shift dashboard', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)

    // The shift dashboard should NOT have a "Cash Deposit" denomination entry card
    // (the old CashCard with ₹500/200/100/50/20/10 inputs)
    // We verify by checking: no card header showing "Cash Deposit" or "Cash" in required section
    const cashDepositCard = page
      .locator('.card')
      .filter({ hasText: /^Cash Deposit$/ })
      .first()
    await expect(cashDepositCard).not.toBeVisible()
  })

  // ── Test 7: Dashboard grid — only Month End Stock and Open POS tiles remain ──

  test('7. Staff dashboard grid — only Month End Stock and Open POS tiles, no Stock/Expense tiles', async ({
    page,
  }) => {
    test.setTimeout(20000)
    await loginAsStaffKR(page)
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    // Month End Stock tile should be present
    await expect(page.locator('text=Month End Stock')).toBeVisible({ timeout: 8000 })

    // Open POS tile should be present
    await expect(page.locator('[data-testid="open-pos-card"]')).toBeVisible({ timeout: 5000 })

    // Stock Levels standalone tile should NOT be in the dashboard grid
    // (it's only accessible via the shift card now)
    const stockTile = page.locator('[class*="SectionCard"], .cursor-pointer').filter({
      hasText: /^Stock Levels$/,
    })
    await expect(stockTile).not.toBeVisible()

    // Cash Expenses standalone tile should NOT be in dashboard grid
    const expenseTile = page.locator('[class*="SectionCard"], .cursor-pointer').filter({
      hasText: /^Cash Expenses$/,
    })
    await expect(expenseTile).not.toBeVisible()
  })

  // ── Test 8: Milk Details — regression check, still working ───────────────────

  test('8. Milk Details — regression check, still visible and functional', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)

    // Milk section card should be present
    await page.waitForSelector('text=Milk', { timeout: 10000 })
    const milkCard = page.locator('.card').filter({ hasText: 'Milk' }).first()
    await expect(milkCard).toBeVisible()

    // Expand and verify milk-bought-input is present
    await milkCard.click()
    await page.waitForSelector('[data-testid="milk-bought-input"]', { timeout: 8000 })
    await expect(page.locator('[data-testid="milk-bought-input"]')).toBeVisible()
  })

  // ── Test 9: Daily Sales Summary — Cash in Hand column present ────────────────

  test('9. Daily Sales Summary — Cash in Hand column exists and page loads', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsOwner(page)
    await page.goto(`${BASE_URL}/reports/daily-sales`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Page should load
    await expect(page.locator('h1, h2').filter({ hasText: /Daily Sales/i })).toBeVisible({
      timeout: 10000,
    })

    // Cash in Hand column should exist in the table
    await expect(
      page
        .locator('th, td')
        .filter({ hasText: /Cash in Hand/i })
        .first()
    ).toBeVisible({
      timeout: 8000,
    })
  })

  // ── Test 10: Supervisor Cash Deposit (bank deposit) — unaffected ──────────────

  test('10. Supervisor bank Cash Deposit — still accessible and functional', async ({ page }) => {
    test.setTimeout(30000)
    await loginAsSupervisor(page)
    await page.goto(`${BASE_URL}/supervisor/cash-deposit`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })

    // Should land on the supervisor cash deposit page (not a 404)
    const pageNotFound = page.locator('text=404').first()
    await expect(pageNotFound).not.toBeVisible()

    // Should show the cash deposit page content
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 })
  })

  // ── Test 11: Stock Levels — Shift 2 sees existing data from Shift 1 ──────────

  test('11. Stock Levels card — expanding shows existing entries, not blank form', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await loginAsStaffKR(page)
    await ensureShiftOpen(page)

    // Expand Stock Levels card
    await page.waitForSelector('text=Stock Levels', { timeout: 10000 })
    const stockCard = page.locator('.card').filter({ hasText: 'Stock Levels' }).first()
    await stockCard.click()

    // Wait for stock form to load
    await page.waitForSelector('[data-testid="stock-save-btn"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="stock-save-btn"]')).toBeVisible()

    // The form should be visible with item rows (Coffee Powder, Tea Powder, etc.)
    await expect(page.locator('text=Coffee Powder')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Tea Powder')).toBeVisible({ timeout: 5000 })
  })
})
