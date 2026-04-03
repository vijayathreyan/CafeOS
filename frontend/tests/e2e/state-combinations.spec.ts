import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs, searchEmployee } from './helpers'

// One employee is created and shared across all three scenarios.
// Phone uses 00000 prefix so global-teardown can clean up on partial failures.
const SC_PHONE = `00000${Date.now().toString().slice(-5)}`
const SC_PASSWORD = 'Test@1234'
const SC_NAME_BASE = `E2E State ${Date.now()}`

// Mutable — updated after the edit-save scenario
let currentName = SC_NAME_BASE

async function goToOwnerUsers(page: import('@playwright/test').Page) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
  await page.goto('/users')
  await page.waitForURL('**/users', { timeout: 8000 })
  await page.waitForSelector('h1:has-text("Employees")', { timeout: 8000 })
}

test.describe.serial('State Combination Flows', () => {
  // ── Scenario 1: Create → Edit → Save → Verify changes persisted ──
  test('create employee → immediately edit → save → name change persists in list', async ({
    page,
  }) => {
    test.setTimeout(120000)

    // — Create —
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    await page.waitForSelector('h1:has-text("Employees")', { timeout: 8000 })
    await page.getByRole('button', { name: /Add Employee/ }).click()
    await page.waitForURL('**/users/new', { timeout: 8000 })
    await page.getByRole('heading', { name: /System Access/ }).waitFor({ timeout: 5000 })

    await page.locator('input').first().fill(SC_NAME_BASE)
    const phoneInput = page.locator('input[type="tel"]').first()
    await phoneInput.fill(SC_PHONE)
    await phoneInput.blur()
    await page.waitForResponse('**/rest/v1/**', { timeout: 10000 }).catch(() => null)
    await page.locator('input[type="checkbox"]').first().check()
    const pwdInputs = page.locator('input[type="password"]')
    await pwdInputs.nth(0).fill(SC_PASSWORD)
    await pwdInputs.nth(1).fill(SC_PASSWORD)
    await page.locator('button:has-text("Next")').click()
    await page.getByRole('heading', { name: /Personal/ }).waitFor({ timeout: 5000 })
    await page.locator('button:has-text("Bank Details")').click()
    await page.getByRole('heading', { name: /Bank/ }).waitFor({ timeout: 5000 })
    await page.locator('button[type="submit"]').click()
    await expect(page.locator('text=Employee Created')).toBeVisible({ timeout: 15000 })
    await page.waitForURL('**/users', { timeout: 8000 })
    // Bust React Query stale cache so the new employee appears
    await page.reload()
    await page.waitForLoadState('networkidle')

    // — Immediately Edit —
    await searchEmployee(page, SC_NAME_BASE)
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.waitForURL('**/users/**/edit', { timeout: 8000 })
    await page.getByRole('heading', { name: /System Access/ }).waitFor({ timeout: 5000 })

    const nameInput = page.locator('input').first()
    // Select-all + type() triggers react-hook-form onChange correctly.
    // clear() + fill() bypasses RHF's onChange so the save would use the old value.
    await nameInput.press('Control+a')
    currentName = SC_NAME_BASE + ' Edited'
    await nameInput.type(currentName)
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.locator('text=Saved successfully').first()).toBeVisible({ timeout: 8000 })

    // — Verify persisted: navigate back to list and search for new name —
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await searchEmployee(page, currentName)
    await expect(page.locator(`text=${currentName}`)).toBeVisible({ timeout: 8000 })
  })

  // ── Scenario 2: Deactivate → verify cannot login → Reactivate → verify can login ──
  test('deactivate employee → login blocked → reactivate → login succeeds', async ({ page }) => {
    test.setTimeout(30000)
    await goToOwnerUsers(page)
    await searchEmployee(page, currentName)
    await page.getByRole('button', { name: 'Deactivate' }).first().click()
    await expect(page.locator('text=Deactivate Employee')).toBeVisible({ timeout: 5000 })
    await page.locator('[role="alertdialog"]').getByRole('button', { name: 'Deactivate' }).click()
    await expect(page.locator('text=Inactive')).toBeVisible({ timeout: 8000 })
  })

  test('deactivated employee → login attempt → error shown, stays on /login', async ({ page }) => {
    await loginAs(page, { phone: SC_PHONE, password: SC_PASSWORD })
    await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('reactivate employee → login attempt → succeeds', async ({ page }) => {
    test.setTimeout(30000)
    await goToOwnerUsers(page)
    await searchEmployee(page, currentName)
    await page.getByRole('button', { name: 'Reactivate' }).first().click()
    await expect(page.locator('text=Reactivate Employee')).toBeVisible({ timeout: 5000 })
    await page.locator('[role="alertdialog"]').getByRole('button', { name: 'Reactivate' }).click()
    await expect(page.locator('text=Inactive')).not.toBeVisible({ timeout: 8000 })
  })

  test('reactivated employee → login succeeds → lands on staff dashboard', async ({ page }) => {
    await loginAs(page, { phone: SC_PHONE, password: SC_PASSWORD })
    await page.waitForURL(/\/(staff-dashboard|shift|branch-select)/, { timeout: 15000 })
    await expect(page).not.toHaveURL(/\/login/)
  })

  // ── Scenario 3: Delete → gone from active list → visible in deleted list ──
  test('delete employee → removed from active list → visible in deleted employees view', async ({
    page,
  }) => {
    test.setTimeout(30000)
    await goToOwnerUsers(page)
    await searchEmployee(page, currentName)
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
    await expect(page.locator('text=Delete Employee')).toBeVisible({ timeout: 5000 })
    await page
      .locator('[role="alertdialog"]')
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    // Confirm removed from active list
    await expect(page.locator(`text=${currentName}`)).not.toBeVisible({ timeout: 8000 })

    // Switch to deleted view and confirm it appears there
    await page.getByRole('button', { name: 'View Deleted Employees' }).click()
    await expect(page.locator(`text=${currentName}`)).toBeVisible({ timeout: 8000 })
  })
})
