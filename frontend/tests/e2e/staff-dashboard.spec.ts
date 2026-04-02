import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs, ensureShiftOpen } from './helpers'

// KR snack items from SnacksCard.tsx KR_SNACKS array
const KR_SNACK_ITEMS = [
  'Medu Vada',
  'Onion Samosa',
  'Aloo Samosa',
  'Cutlet',
  'Elai Adai',
  'Kozhukattai',
  'Bajji',
  'Masala Bonda',
  'Cauliflower 65',
  'Chinese Bonda',
]

// Tamil names for select KR items (from SnacksCard.tsx)
const KR_SNACK_ITEMS_TAMIL = [
  'மேது வடை',
  'வெங்காய சமோசா',
  'பஜ்ஜி',
]

test.describe('Staff Dashboard — KR', () => {
  test('staff login → lands on /staff-dashboard', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/staff-dashboard/)
  })

  test('correct branch name shown in header', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    // TopBar shows activeBranch as a Badge — KR → "Kaappi Ready"
    await expect(page.locator('text=Kaappi Ready').first()).toBeVisible()
  })

  test('all 6 cards visible: Snacks, Cash Deposit, Milk Details, Assets, Post-Paid Sales, Notes', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    // All 6 section card titles visible
    await expect(page.locator('text=Snacks')).toBeVisible()
    await expect(page.locator('text=Cash Deposit')).toBeVisible()
    await expect(page.locator('text=Milk Details')).toBeVisible()
    await expect(page.locator('text=Assets')).toBeVisible()
    await expect(page.locator('text=Post-Paid Sales')).toBeVisible()
    await expect(page.locator('text=Notes')).toBeVisible()
  })

  test('open Snacks card → all KR items listed', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    // Click the Snacks card header to expand it
    await page.locator('text=Snacks').first().click()
    // Wait for the table to appear
    await page.waitForSelector('table', { timeout: 8000 })
    // All 10 KR items must be listed
    for (const item of KR_SNACK_ITEMS) {
      await expect(page.locator(`text=${item}`)).toBeVisible()
    }
  })

  test('number input → tap field → empty, no 0 merging', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    await page.locator('text=Snacks').first().click()
    await page.waitForSelector('table', { timeout: 8000 })
    // First number input in the snacks table
    const numInput = page.locator('input[type="number"]').first()
    await numInput.click()
    // onFocus calls e.target.select() — field value is '' (empty) when qty=0
    // (value={item.qty || ''} renders '' for 0)
    // After clicking, selection is active — typing a digit should replace, not append to "0"
    await numInput.type('5')
    await expect(numInput).toHaveValue('5') // No "05" merging
  })

  test('Tamil toggle → labels switch to Tamil instantly', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    await page.locator('text=Snacks').first().click()
    await page.waitForSelector('table', { timeout: 8000 })
    // Tamil toggle button shows "தமிழ்" when language is English
    await page.locator('button:has-text("தமிழ்")').click()
    // After toggle, at least one Tamil snack name must appear
    await expect(page.locator(`text=${KR_SNACK_ITEMS_TAMIL[0]}`)).toBeVisible({ timeout: 5000 })
  })

  test('Tamil item names show correctly', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    await page.locator('text=Snacks').first().click()
    await page.waitForSelector('table', { timeout: 8000 })
    // Switch to Tamil
    await page.locator('button:has-text("தமிழ்")').click()
    // Verify several Tamil names are correct
    for (const ta of KR_SNACK_ITEMS_TAMIL) {
      await expect(page.locator(`text=${ta}`)).toBeVisible({ timeout: 5000 })
    }
  })

  test('switch back to English → English labels restored', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    await page.locator('text=Snacks').first().click()
    await page.waitForSelector('table', { timeout: 8000 })
    // Toggle to Tamil
    await page.locator('button:has-text("தமிழ்")').click()
    await expect(page.locator(`text=${KR_SNACK_ITEMS_TAMIL[0]}`)).toBeVisible({ timeout: 5000 })
    // Toggle back to English — button now shows "EN"
    await page.locator('button:has-text("EN")').click()
    // English names must reappear
    await expect(page.locator(`text=${KR_SNACK_ITEMS[0]}`)).toBeVisible({ timeout: 5000 })
    // Tamil names must be gone
    await expect(page.locator(`text=${KR_SNACK_ITEMS_TAMIL[0]}`)).not.toBeVisible()
  })

  test('no revenue or sales totals visible anywhere', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    const bodyText = await page.locator('body').innerText()
    // Verify no shift total / day total / revenue labels are shown to staff
    expect(bodyText).not.toMatch(/Shift Total/i)
    expect(bodyText).not.toMatch(/Day Total/i)
    expect(bodyText).not.toMatch(/Revenue/i)
    expect(bodyText).not.toMatch(/Sales Total/i)
  })

  test('Close Shift button disabled when sections incomplete', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    // Without filling any section, Close Shift must be disabled
    const closeBtn = page.locator('button:has-text("Close Shift")')
    await expect(closeBtn).toBeDisabled()
  })
})

test.describe('Staff Dashboard — C2', () => {
  test('C2 staff login → Post-Paid Sales card NOT visible', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_c2)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)
    // Post-Paid card is KR-only — must NOT appear for C2 staff
    await expect(page.locator('text=Post-Paid Sales')).not.toBeVisible()
  })
})
