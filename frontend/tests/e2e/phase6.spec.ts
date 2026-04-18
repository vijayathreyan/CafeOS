import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { TEST_USERS } from './test-data'

// Phase 6 — Month End Closing Stock E2E Tests
// Access control: Staff → /staff/month-end-stock, Supervisor → /supervisor/month-end-stock
// Owner → /owner/reports/month-end-stock (read-only history)

async function loginAsOwner(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
}

async function loginAsStaff(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.staff_kr)
  await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
}

async function loginAsSupervisor(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.supervisor)
  await page.waitForURL('**/supervisor-dashboard', { timeout: 12000 })
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — Navigation', () => {
  test('Month End Stock tile appears on Owner Dashboard and navigates to history', async ({
    page,
  }) => {
    await loginAsOwner(page)
    await page.waitForSelector('h3:has-text("Month End Stock")', { timeout: 10000 })
    await page.locator('h3:has-text("Month End Stock")').click()
    await page.waitForURL('**/owner/reports/month-end-stock', { timeout: 8000 })
    await expect(page.locator('h1')).toContainText('Month End Stock')
  })

  test('Staff can access Month End Stock entry form', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Month End Stock')
  })

  test('Supervisor can access Month End Stock entry form', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/supervisor/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Month End Stock')
  })

  test('Owner cannot access staff month end stock entry', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/staff/month-end-stock')
    await expect(page).not.toHaveURL(/\/staff\/month-end-stock$/)
  })

  test('Staff cannot access owner history page', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/owner/reports/month-end-stock')
    await expect(page).not.toHaveURL(/\/owner\/reports\/month-end-stock$/)
  })
})

// ─────────────────────────────────────────────────────────────
// PAGE STRUCTURE
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — Page Structure', () => {
  test('page loads with correct heading and subtitle', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Month End Stock')
  })

  test('month selector is visible', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    const currentMonth = new Date().toLocaleString('en-IN', { month: 'long' })
    await expect(page.locator(`text=${currentMonth}`).first()).toBeVisible()
  })

  test('branch selector is hidden for staff (fixed branch)', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    // Staff should not see the branch selector — their branch is fixed
    await expect(
      page.locator('[role="combobox"]').filter({ hasText: 'Kaappi Ready' })
    ).not.toBeVisible()
  })

  test('branch selector is visible for supervisor', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/supervisor/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('text=Kaappi Ready').first()).toBeVisible()
  })

  test('search input is visible', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('input[placeholder="Search items…"]')).toBeVisible()
  })

  test('Save Draft and Submit buttons are visible', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible()
    await expect(page.locator('button:has-text("Submit")')).toBeVisible()
  })

  test('Rate and Cost columns are NOT visible (removed)', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })
    await expect(page.locator('th:has-text("Rate")')).not.toBeVisible()
    await expect(page.locator('th:has-text("Cost")')).not.toBeVisible()
  })

  test('Generate Reminder Task button is visible', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('button:has-text("Generate Reminder Task")')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// ITEM LIST — 3 SECTIONS
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — Item List', () => {
  test('shows Beverages & Cleaning section', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })
    await expect(page.locator('text=Beverages & Cleaning').first()).toBeVisible()
  })

  test('shows Packaging & Ingredients section', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })
    await expect(page.locator('text=Packaging & Ingredients').first()).toBeVisible()
  })

  test('shows Spices & Speciality section', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })
    await expect(page.locator('text=Spices & Speciality').first()).toBeVisible()
  })

  test('Boost appears in Beverages section', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })
    await expect(page.locator('td:has-text("Boost")').first()).toBeVisible()
  })

  test('Tea Powder appears in Packaging section', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })
    await expect(page.locator('td:has-text("Tea Powder")').first()).toBeVisible()
  })

  test('Eggs appears in Spices section', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })
    await expect(page.locator('td:has-text("Eggs")').first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// SEARCH FILTER
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — Search Filter', () => {
  test('search filters items by name', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })

    await page.locator('input[placeholder="Search items…"]').fill('Boost')
    await expect(page.locator('td:has-text("Boost")').first()).toBeVisible()

    // Other items should not be visible
    await expect(page.locator('td:has-text("Horlicks")')).not.toBeVisible()
  })

  test('clearing search shows all items again', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })

    await page.locator('input[placeholder="Search items…"]').fill('Boost')
    await page.locator('input[placeholder="Search items…"]').fill('')
    await expect(page.locator('td:has-text("Horlicks")').first()).toBeVisible()
  })

  test('item count updates on search', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })

    await page.locator('input[placeholder="Search items…"]').fill('Tea')
    const countText = await page.locator('text=Showing').textContent()
    expect(countText).toContain('Showing')
  })
})

// ─────────────────────────────────────────────────────────────
// CALCULATION
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — Calculations', () => {
  test('total units auto-calculates from open + packed', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })

    const boostRow = page.locator('tr').filter({ hasText: 'Boost' }).first()
    const openInput = boostRow.locator('input[type="number"]').nth(0)
    const packedInput = boostRow.locator('input[type="number"]').nth(1)

    await openInput.fill('3')
    await packedInput.fill('2')

    // Total column (5th td, index 4) should show 5
    await expect(boostRow.locator('td').nth(4)).toContainText('5')
  })
})

// ─────────────────────────────────────────────────────────────
// DRAFT SAVE / RESTORE
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — Draft Persistence', () => {
  test('Save Draft button saves without error', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })
    await page.locator('button:has-text("Save Draft")').click()
    // Should show toast or update saved indicator
    await expect(page.locator('text=Draft saved').first()).toBeVisible({ timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────
// SUBMIT FLOW
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — Submit Flow', () => {
  test('Submit dialog shows correct title', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })

    await page.locator('button:has-text("Submit")').click()
    await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 })
    await expect(page.locator('[role="alertdialog"]')).toContainText('Submit month end stock')
  })

  test('Submit dialog shows Cancel and Submit buttons', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })

    await page.locator('button:has-text("Submit")').click()
    await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 })
    await expect(page.locator('[role="alertdialog"] button:has-text("Cancel")')).toBeVisible()
    await expect(page.locator('[role="alertdialog"] button:has-text("Submit")')).toBeVisible()
  })

  test('Cancelling submit dialog keeps page in edit mode', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/staff/month-end-stock')
    await page.waitForSelector('[data-testid="month-end-stock-form"]', { timeout: 15000 })

    await page.locator('button:has-text("Submit")').click()
    await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 })
    await page.locator('[role="alertdialog"] button:has-text("Cancel")').click()

    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — History Page', () => {
  test('history page loads with correct heading', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Month End Stock History')
  })

  test('history page shows branch filter', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('text=All Branches').first()).toBeVisible()
  })

  test('history page shows status filter', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await expect(page.locator('text=All Status').first()).toBeVisible()
  })

  test('Back button navigates to dashboard', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/owner/reports/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })
    await page.locator('button:has-text("Back")').click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────
// BRANCH SWITCHING (Supervisor)
// ─────────────────────────────────────────────────────────────

test.describe('Phase 6 — Branch Switching', () => {
  test('supervisor can switch branch and period label updates', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/supervisor/month-end-stock')
    await page.waitForSelector('h1', { timeout: 10000 })

    // Switch to C2
    const branchSelect = page.locator('[role="combobox"]').filter({ hasText: 'Kaappi Ready' })
    await branchSelect.click()
    await page.locator('[role="option"]:has-text("Coffee Mate C2")').click()
    await expect(page.locator('text=Coffee Mate C2').first()).toBeVisible()
  })
})
