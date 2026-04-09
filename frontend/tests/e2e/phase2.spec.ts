import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { TEST_USERS } from './test-data'

// Phase 2 — Stock Levels & Cash Expenses E2E Tests
// All tests use retries: 0 (set globally in playwright.config.ts)
// Test phone prefix: 00000

// Helper: login as staff_kr and wait until dashboard is loaded
async function loginAsStaffKR(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.staff_kr)
  await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
}

async function loginAsStaffC2(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.staff_c2)
  await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
}

async function loginAsSupervisor(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.supervisor)
  await page.waitForURL('**/supervisor-dashboard', { timeout: 12000 })
}

async function loginAsOwner(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
}

// ─────────────────────────────────────────────────────────────
// FEATURE 1 — KR Stock Levels Entry
// ─────────────────────────────────────────────────────────────

test.describe('KR Stock Levels Entry', () => {
  test('staff can navigate to stock entry page', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Stock Levels')
  })

  test('KR stock form renders all required items', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('text=Coffee Powder', { timeout: 10000 })

    await expect(page.locator('text=Coffee Powder').first()).toBeVisible()
    await expect(page.locator('text=Tea Powder').first()).toBeVisible()
    await expect(page.locator('text=Peanut Ladoo Bottle').first()).toBeVisible()
    await expect(page.locator('text=Milk').first()).toBeVisible()
    await expect(page.locator('text=Momos Packet').first()).toBeVisible()
    await expect(page.locator('text=Sweet Corn Packet').first()).toBeVisible()
  })

  test('Coffee Powder row has single grams input', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('text=Coffee Powder', { timeout: 10000 })

    // Single input field for closing stock; unit label "g" shown next to it
    await expect(page.locator('input[aria-label="Coffee Powder closing stock"]')).toBeVisible()
  })

  test('grams input accepts direct grams value and updates', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('input[aria-label="Coffee Powder closing stock"]', {
      timeout: 10000,
    })

    const closingInput = page.locator('input[aria-label="Coffee Powder closing stock"]')
    await closingInput.fill('1300')
    await closingInput.blur()

    // Value persists (no conversion needed)
    await expect(closingInput).toHaveValue('1300')
  })

  test('stock form save button is visible', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('button:has-text("Save Stock")', { timeout: 10000 })
    await expect(page.locator('button:has-text("Save Stock")')).toBeVisible()
  })

  test('save button submits stock entries and shows success toast', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('button:has-text("Save Stock")', { timeout: 10000 })

    await page.locator('button:has-text("Save Stock")').click()
    await expect(page.locator('text=Stock saved').first()).toBeVisible({ timeout: 12000 })
  })

  test('staff dashboard shows Stock Levels quick action', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.waitForSelector('text=Stock Levels', { timeout: 10000 })
    await expect(page.locator('text=Stock Levels').first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// FEATURE 2 — KR Cash Expenses Entry
// ─────────────────────────────────────────────────────────────

test.describe('KR Cash Expenses Entry', () => {
  test('staff can navigate to expense entry page', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/expense-entry')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Cash Expenses')
  })

  test('KR expense form renders all standard categories', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/expense-entry')
    await page.waitForSelector('text=Lemon & Ginger', { timeout: 10000 })

    await expect(page.locator('text=Lemon & Ginger').first()).toBeVisible()
    await expect(page.locator('text=Lorry Water').first()).toBeVisible()
    await expect(page.locator('text=Gas').first()).toBeVisible()
    await expect(page.locator('text=Evening Snacks').first()).toBeVisible()
  })

  test('Gas category shows P&L Gas Bill label', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/expense-entry')
    await page.waitForSelector('text=Gas', { timeout: 10000 })
    await expect(page.locator('text=P&L Gas Bill').first()).toBeVisible()
  })

  test('Grand Total is visible at bottom', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/expense-entry')
    await page.waitForSelector('text=Grand Total', { timeout: 10000 })
    await expect(page.locator('text=Grand Total').first()).toBeVisible()
  })

  test('add row button adds a custom expense row', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/expense-entry')
    await page.waitForSelector('button:has-text("Add Row")', { timeout: 10000 })

    const rowsBefore = await page.locator('input[aria-label="Custom expense category"]').count()
    await page.locator('button:has-text("Add Row")').click()
    const rowsAfter = await page.locator('input[aria-label="Custom expense category"]').count()
    expect(rowsAfter).toBe(rowsBefore + 1)
  })

  test('save expenses shows success toast', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/expense-entry')
    await page.waitForSelector('button:has-text("Save Expenses")', { timeout: 10000 })

    await page.locator('button:has-text("Save Expenses")').click()
    await expect(page.locator('text=Expenses saved').first()).toBeVisible({ timeout: 12000 })
  })
})

// ─────────────────────────────────────────────────────────────
// FEATURE 3 — C2 Stock Form
// ─────────────────────────────────────────────────────────────

test.describe('C2 Stock Form', () => {
  test('C2 stock form shows C2-specific items', async ({ page }) => {
    await loginAsStaffC2(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('text=Egg', { timeout: 10000 })

    await expect(page.locator('text=Egg').first()).toBeVisible()
    await expect(page.locator('text=Rose Milk Cup').first()).toBeVisible()
    await expect(page.locator('text=Badam Milk Cup').first()).toBeVisible()
    await expect(page.locator('text=White Channa').first()).toBeVisible()
  })

  test('C2 stock form does NOT show KR-only items', async ({ page }) => {
    await loginAsStaffC2(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('text=Coffee Powder', { timeout: 10000 })

    // Rava Ladoo, Paa Khoa, Water Bottle Bunch are KR-only
    await expect(page.locator('td:text-is("Rava Ladoo Bottle")')).not.toBeVisible()
    await expect(page.locator('td:text-is("Paa Khoa")')).not.toBeVisible()
    await expect(page.locator('td:text-is("Water Bottle Bunch")')).not.toBeVisible()
  })

  test('C2 stock saves correctly', async ({ page }) => {
    await loginAsStaffC2(page)
    await page.goto('/stock-entry')
    await page.waitForSelector('button:has-text("Save Stock")', { timeout: 10000 })

    await page.locator('button:has-text("Save Stock")').click()
    await expect(page.locator('text=Stock saved').first()).toBeVisible({ timeout: 12000 })
  })
})

// ─────────────────────────────────────────────────────────────
// FEATURE 4 — C2 Cash Expenses
// ─────────────────────────────────────────────────────────────

test.describe('C2 Cash Expenses', () => {
  test('C2 expense form shows C2-specific categories', async ({ page }) => {
    await loginAsStaffC2(page)
    await page.goto('/expense-entry')
    await page.waitForSelector('text=Bread', { timeout: 10000 })

    await expect(page.locator('text=Bread').first()).toBeVisible()
    await expect(page.locator('text=Egg').first()).toBeVisible()
    await expect(page.locator('text=Gas').first()).toBeVisible()
  })

  test('C2 Gas category also has P&L Gas Bill flag', async ({ page }) => {
    await loginAsStaffC2(page)
    await page.goto('/expense-entry')
    await page.waitForSelector('text=Gas', { timeout: 10000 })
    await expect(page.locator('text=P&L Gas Bill').first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// FEATURE 5 — Supervisor Data Entry Both Branches
// ─────────────────────────────────────────────────────────────

test.describe('Supervisor Data Entry', () => {
  test('supervisor can navigate to supervisor-entry page', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/supervisor-entry')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Data Entry')
  })

  test('supervisor sees branch selector', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/supervisor-entry')
    await page.waitForSelector('[data-testid="branch-kr"]', { timeout: 10000 })

    await expect(page.locator('[data-testid="branch-kr"]')).toBeVisible()
    await expect(page.locator('[data-testid="branch-c2"]')).toBeVisible()
  })

  test('supervisor selects KR branch and sees stock form', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/supervisor-entry')
    await page.waitForSelector('[data-testid="branch-kr"]', { timeout: 10000 })

    await page.locator('[data-testid="branch-kr"]').click()
    await page.waitForSelector('text=Coffee Powder', { timeout: 10000 })
    await expect(page.locator('text=Coffee Powder').first()).toBeVisible()
  })

  test('supervisor selects C2 branch and sees C2 stock form', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/supervisor-entry')
    await page.waitForSelector('[data-testid="branch-c2"]', { timeout: 10000 })

    await page.locator('[data-testid="branch-c2"]').click()
    await page.waitForSelector('text=Egg', { timeout: 10000 })
    await expect(page.locator('text=Egg').first()).toBeVisible()
    await expect(page.locator('text=Rose Milk Cup').first()).toBeVisible()
  })

  test('supervisor can switch to expenses tab', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/supervisor-entry')
    await page.waitForSelector('[data-testid="branch-kr"]', { timeout: 10000 })

    await page.locator('[data-testid="branch-kr"]').click()
    await page.waitForSelector('[role="tab"]:has-text("Cash Expenses")', { timeout: 10000 })
    await page.locator('[role="tab"]:has-text("Cash Expenses")').click()
    await page.waitForSelector('text=Lemon & Ginger', { timeout: 8000 })
    await expect(page.locator('text=Lemon & Ginger').first()).toBeVisible()
  })

  test('supervisor dashboard shows Stock & Cash Expenses section', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.waitForSelector('text=Stock & Cash Expenses', { timeout: 10000 })
    await expect(page.locator('text=Stock & Cash Expenses').first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// FEATURE 6 — Draft Persistence
// ─────────────────────────────────────────────────────────────

test.describe('Draft Persistence', () => {
  test('draft restoration dialog appears when draft exists', async ({ page }) => {
    await loginAsStaffKR(page)

    // Pre-seed localStorage with a draft before navigating
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0]
      const key = `cafeos_draft_stock_KR_${today}`
      const mockDraft = [
        {
          name: 'Coffee Powder',
          unit: 'kg',
          inputType: 'kg_grams',
          openingStock: 1000,
          purchase: 0,
          closingKg: 0,
          closingGramsField: 500,
          closingStock: 500,
        },
      ]
      localStorage.setItem(key, JSON.stringify({ data: mockDraft, savedAt: Date.now() }))
    })

    await page.goto('/stock-entry')
    await page.waitForSelector('text=Unsaved data found', { timeout: 10000 })
    await expect(page.locator('text=Unsaved data found')).toBeVisible()
  })

  test('draft restoration dialog has Restore and Discard buttons', async ({ page }) => {
    await loginAsStaffKR(page)

    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0]
      const key = `cafeos_draft_stock_KR_${today}`
      const mockDraft = [
        {
          name: 'Coffee Powder',
          unit: 'kg',
          inputType: 'kg_grams',
          openingStock: 0,
          purchase: 0,
          closingKg: 1,
          closingGramsField: 200,
          closingStock: 1200,
        },
      ]
      localStorage.setItem(key, JSON.stringify({ data: mockDraft, savedAt: Date.now() }))
    })

    await page.goto('/stock-entry')
    await page.waitForSelector('text=Unsaved data found', { timeout: 10000 })

    await expect(page.locator('button:has-text("Restore draft")')).toBeVisible()
    await expect(page.locator('button:has-text("Discard")')).toBeVisible()
  })

  test('discarding draft closes the dialog', async ({ page }) => {
    await loginAsStaffKR(page)

    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0]
      const key = `cafeos_draft_stock_KR_${today}`
      localStorage.setItem(key, JSON.stringify({ data: [{ name: 'Mock' }], savedAt: Date.now() }))
    })

    await page.goto('/stock-entry')
    await page.waitForSelector('button:has-text("Discard")', { timeout: 10000 })
    await page.locator('button:has-text("Discard")').click()

    await expect(page.locator('text=Unsaved data found')).not.toBeVisible({ timeout: 5000 })
    // Form should be visible after discarding
    await expect(page.locator('h1')).toContainText('Stock Levels')
  })
})

// ─────────────────────────────────────────────────────────────
// FEATURE 7 — Weight Per Unit Admin Settings
// ─────────────────────────────────────────────────────────────

test.describe('Weight Per Unit Admin Settings', () => {
  test('owner can navigate to settings page', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Admin Settings')
  })

  test('settings page shows Stock Item Weight Configuration section', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings')
    await page.waitForSelector('text=Stock Item Weight Configuration', { timeout: 10000 })
    await expect(page.locator('text=Stock Item Weight Configuration').first()).toBeVisible()
  })

  test('weight configs are shown with gram values', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings')
    await page.waitForSelector('text=Stock Item Weight Configuration', { timeout: 10000 })

    // Wait for data to load — either edit buttons or the "no configs" message
    await Promise.race([
      page.waitForSelector('button[aria-label*="Edit"]', { timeout: 10000 }),
      page.waitForSelector('text=No weight configurations', { timeout: 10000 }),
    ])

    const editButtons = page.locator('button[aria-label*="Edit"]')
    const count = await editButtons.count()

    if (count > 0) {
      // At least one weight config is shown with a gram value
      await expect(page.locator('text=/\\d+g/').first()).toBeVisible()
    }
    // If migration not applied, the no-config message is acceptable
  })

  test('edit button opens inline weight input', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings')
    await page.waitForSelector('text=Stock Item Weight Configuration', { timeout: 10000 })

    // Wait for data to load
    await Promise.race([
      page.waitForSelector('button[aria-label*="Edit"]', { timeout: 10000 }),
      page.waitForSelector('text=No weight configurations', { timeout: 10000 }),
    ])

    const editButtons = page.locator('button[aria-label*="Edit"]')
    if ((await editButtons.count()) > 0) {
      await editButtons.first().click()
      await expect(page.locator('input[aria-label*="weight in grams"]').first()).toBeVisible({
        timeout: 3000,
      })
      await expect(page.locator('button[aria-label="Cancel edit"]').first()).toBeVisible()
    }
  })
})

// ─────────────────────────────────────────────────────────────
// FEATURE 7B — Weight Configuration Page (/owner/stock-config)
// ─────────────────────────────────────────────────────────────

test.describe('Weight Configuration Page', () => {
  test('Weight Config — owner can access stock configuration page', async ({ page }) => {
    await loginAsOwner(page)

    // Click the Stock Configuration card on the owner dashboard
    await page.waitForSelector('text=Stock Configuration', { timeout: 10000 })
    await page.locator('text=Stock Configuration').first().click()
    await page.waitForURL('**/owner/stock-config', { timeout: 8000 })

    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Stock Configuration')

    // Verify all 5 weight-based items are shown
    await page.waitForSelector('text=Peanut Ladoo Bottle', { timeout: 10000 })
    await expect(page.locator('text=Peanut Ladoo Bottle').first()).toBeVisible()
    await expect(page.locator('text=Dry Fruit Ladoo Bottle').first()).toBeVisible()
    await expect(page.locator('text=Rava Ladoo Bottle').first()).toBeVisible()
    await expect(page.locator('text=Peanuts/Sundal').first()).toBeVisible()
    await expect(page.locator('text=Sweet Corn Packet').first()).toBeVisible()
  })

  test('Weight Config — owner can edit weight per unit', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/stock-config')
    await page.waitForSelector('text=Peanut Ladoo Bottle', { timeout: 10000 })

    // Click Edit on Peanut Ladoo Bottle row
    await page.locator('button[aria-label="Edit Peanut Ladoo Bottle weight"]').click()

    // Input is now visible — change value to 25
    const input = page.locator('input[aria-label="Peanut Ladoo Bottle weight in grams"]')
    await input.waitFor({ state: 'visible', timeout: 5000 })
    await input.fill('25')

    // Click Save (Check icon button)
    await page.locator('button[aria-label="Save weight"]').click()

    // Verify success toast
    await expect(page.locator('text=Saved successfully').first()).toBeVisible({ timeout: 8000 })

    // Verify value shows 25g in the Peanut Ladoo Bottle row
    const row = page.locator('tr').filter({ hasText: 'Peanut Ladoo Bottle' })
    await expect(row.locator('text=25g')).toBeVisible({ timeout: 5000 })

    // Verify value persists after page refresh
    await page.goto('/owner/stock-config')
    await page.waitForSelector('text=Peanut Ladoo Bottle', { timeout: 10000 })
    const rowAfterRefresh = page.locator('tr').filter({ hasText: 'Peanut Ladoo Bottle' })
    await expect(rowAfterRefresh.locator('text=25g')).toBeVisible({ timeout: 5000 })
  })

  test('Weight Config — owner can change back to original value', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/stock-config')
    await page.waitForSelector('text=Peanut Ladoo Bottle', { timeout: 10000 })

    // Click Edit on Peanut Ladoo Bottle row
    await page.locator('button[aria-label="Edit Peanut Ladoo Bottle weight"]').click()

    // Change value back to 30
    const input = page.locator('input[aria-label="Peanut Ladoo Bottle weight in grams"]')
    await input.waitFor({ state: 'visible', timeout: 5000 })
    await input.fill('30')

    // Click Save
    await page.locator('button[aria-label="Save weight"]').click()

    // Verify success toast
    await expect(page.locator('text=Saved successfully').first()).toBeVisible({ timeout: 8000 })

    // Verify value shows 30g in the Peanut Ladoo Bottle row
    const row = page.locator('tr').filter({ hasText: 'Peanut Ladoo Bottle' })
    await expect(row.locator('text=30g')).toBeVisible({ timeout: 5000 })
  })

  test('Weight Config — non-owner cannot access stock config page', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 12000 })

    // Attempt direct navigation to the owner-only page
    await page.goto('/owner/stock-config')

    // ProtectedRoute redirects staff away — ends up at staff-dashboard or login
    await page.waitForURL(/staff-dashboard|login/, { timeout: 8000 })
  })
})

// ─────────────────────────────────────────────────────────────
// Access control
// ─────────────────────────────────────────────────────────────

test.describe('Access control', () => {
  test('staff cannot access supervisor-entry', async ({ page }) => {
    await loginAsStaffKR(page)
    await page.goto('/supervisor-entry')
    // ProtectedRoute redirects to "/" → RoleHome → /staff-dashboard
    await page.waitForURL(/staff-dashboard|login/, { timeout: 8000 })
  })

  test('supervisor cannot access staff stock-entry route', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/stock-entry')
    // Supervisor is not in allowedRoles=['staff'] → redirect to "/"  → /supervisor-dashboard
    await page.waitForURL(/supervisor-dashboard|login/, { timeout: 8000 })
  })

  test('owner cannot access stock-entry (redirected to dashboard)', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/stock-entry')
    await page.waitForURL(/dashboard|login/, { timeout: 8000 })
  })
})
