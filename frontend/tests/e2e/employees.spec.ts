import { test, expect, type Page } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs, searchEmployee } from './helpers'

// Unique test employee — created and torn down within this run
const EMP_NAME = `E2E Staff ${Date.now()}`
const EMP_PHONE = `980${Date.now().toString().slice(-7)}`
const EMP_PASSWORD = 'Test@1234'

async function goToUsers(page: Page) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
  await page.goto('/users')
  await page.waitForURL('**/users', { timeout: 8000 })
  await page.waitForSelector('h1:has-text("Employees")', { timeout: 8000 })
}

async function goToNewEmployee(page: Page) {
  await goToUsers(page)
  await page.getByRole('button', { name: /Add Employee/ }).click()
  await page.waitForURL('**/users/new', { timeout: 8000 })
  // Use heading role to avoid strict-mode conflict with the tab button "1. System Access"
  await page.getByRole('heading', { name: /System Access/ }).waitFor({ timeout: 5000 })
}

test.describe('Employee Management', () => {
  test('employee list loads on /users without refresh', async ({ page }) => {
    await goToUsers(page)
    await expect(page.locator('h1:has-text("Employees")')).toBeVisible()
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })

  test('Add Employee button opens form', async ({ page }) => {
    await goToUsers(page)
    await page.getByRole('button', { name: /Add Employee/ }).click()
    await page.waitForURL('**/users/new', { timeout: 8000 })
    // Verify the section 1 heading (h2), not the tab button
    await expect(page.getByRole('heading', { name: /System Access/ })).toBeVisible()
    await expect(page.locator('text=Full Name')).toBeVisible()
  })

  test('submit empty Section 1 → validation errors on all mandatory fields', async ({ page }) => {
    await goToNewEmployee(page)
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.locator('text=Full name is required')).toBeVisible()
    await expect(page.locator('text=Phone number is required')).toBeVisible()
    await expect(page.locator('text=Select at least one branch')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
    await expect(page.locator('text=Please confirm the password')).toBeVisible()
  })

  test('duplicate phone number → inline error shown on blur', async ({ page }) => {
    await goToNewEmployee(page)
    const phoneInput = page.locator('input[type="tel"]').first()
    await phoneInput.fill(TEST_USERS.owner.phone)
    await phoneInput.blur()
    await expect(page.locator('text=This phone number is already registered')).toBeVisible({
      timeout: 8000,
    })
  })

  test('mismatched passwords → error shown', async ({ page }) => {
    await goToNewEmployee(page)
    await page.locator('input').first().fill('Test Staff Mismatch')
    const phoneInput = page.locator('input[type="tel"]').first()
    await phoneInput.fill('9800100099')
    await phoneInput.blur()
    await page.waitForResponse('**/rest/v1/**', { timeout: 10000 }).catch(() => null)
    await page.locator('input[type="checkbox"]').first().check()
    const pwdInputs = page.locator('input[type="password"]')
    await pwdInputs.nth(0).fill('Test@1234')
    await pwdInputs.nth(1).fill('Different@456')
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  // ── Serial CRUD flow — longer timeout because it walks through a 6-section form ──
  test.describe.serial('Employee CRUD flow', () => {
    test('complete valid form → employee created → appears in list', async ({ page }) => {
      // This test navigates through 6 form sections — needs more than the 15s default
      test.setTimeout(90000)
      await goToNewEmployee(page)

      // Section 1 — System Access
      await page.locator('input').first().fill(EMP_NAME)
      const phoneInput = page.locator('input[type="tel"]').first()
      await phoneInput.fill(EMP_PHONE)
      await phoneInput.blur()
      await page.waitForResponse('**/rest/v1/**', { timeout: 10000 }).catch(() => null)
      await page.locator('input[type="checkbox"]').first().check() // KR branch
      const pwdInputs = page.locator('input[type="password"]')
      await pwdInputs.nth(0).fill(EMP_PASSWORD)
      await pwdInputs.nth(1).fill(EMP_PASSWORD)
      // Click Next and wait for section 2 heading to confirm navigation
      await page.locator('button:has-text("Next")').click()
      await page.getByRole('heading', { name: /Personal/ }).waitFor({ timeout: 5000 })

      // Sections 2–5: use section tab buttons (outside the form) to jump to section 6
      // This is more reliable than repeated Next clicks
      await page.locator('button:has-text("Bank Details")').click()
      await page.getByRole('heading', { name: /Bank/ }).waitFor({ timeout: 5000 })

      // Section 6 — Submit
      await page.locator('button[type="submit"]').click()
      // Wait for success page or error message (handles both supabaseAdmin configured/not)
      await expect(
        page.locator('text=Employee Created').or(page.locator('.text-destructive').first())
      ).toBeVisible({ timeout: 15000 })
      await expect(page.locator('text=Employee Created')).toBeVisible({ timeout: 3000 })

      // Auto-redirects to /users after 1.5s
      await page.waitForURL('**/users', { timeout: 8000 })
      // Reload to bust the 30s React Query stale cache so new employee appears
      await page.reload()
      await page.waitForLoadState('networkidle')
      await searchEmployee(page, EMP_NAME)
      await expect(page.locator(`text=${EMP_NAME}`)).toBeVisible({ timeout: 8000 })
    })

    test('edit employee → form opens with pre-filled data', async ({ page }) => {
      test.setTimeout(30000)
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      await page.getByRole('button', { name: 'Edit' }).first().click()
      await page.waitForURL('**/users/**/edit', { timeout: 8000 })
      await page.getByRole('heading', { name: /System Access/ }).waitFor({ timeout: 5000 })
      const nameInput = page.locator('input').first()
      await expect(nameInput).toHaveValue(new RegExp(EMP_NAME))
    })

    test('save Section 1 changes → success toast shown', async ({ page }) => {
      test.setTimeout(30000)
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      await page.getByRole('button', { name: 'Edit' }).first().click()
      await page.waitForURL('**/users/**/edit', { timeout: 8000 })
      await page.getByRole('heading', { name: /System Access/ }).waitFor({ timeout: 5000 })
      const nameInput = page.locator('input').first()
      await nameInput.press('End')
      await nameInput.type(' ')
      await page.getByRole('button', { name: 'Save Changes' }).click()
      await expect(page.locator('text=Saved successfully').first()).toBeVisible({ timeout: 8000 })
    })

    test('deactivate → shadcn AlertDialog shown → confirm → status changes to Inactive', async ({
      page,
    }) => {
      test.setTimeout(30000)
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      await page.getByRole('button', { name: 'Deactivate' }).first().click()
      await expect(page.locator('text=Deactivate Employee')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[role="alertdialog"]')).toBeVisible()
      await page.locator('[role="alertdialog"]').getByRole('button', { name: 'Deactivate' }).click()
      await expect(page.locator('text=Inactive')).toBeVisible({ timeout: 8000 })
    })

    test('deactivated user cannot login', async ({ page }) => {
      await loginAs(page, { phone: EMP_PHONE, password: EMP_PASSWORD })
      await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 10000 })
      await expect(page).toHaveURL(/\/login/)
    })

    test('reactivate → confirm → status changes to Active', async ({ page }) => {
      test.setTimeout(30000)
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      await page.getByRole('button', { name: 'Reactivate' }).first().click()
      await expect(page.locator('text=Reactivate Employee')).toBeVisible({ timeout: 5000 })
      await page.locator('[role="alertdialog"]').getByRole('button', { name: 'Reactivate' }).click()
      await expect(page.locator('text=Inactive')).not.toBeVisible({ timeout: 8000 })
    })

    test('reactivated user can login', async ({ page }) => {
      await loginAs(page, { phone: EMP_PHONE, password: EMP_PASSWORD })
      await page.waitForURL(/\/(staff-dashboard|shift|branch-select)/, { timeout: 15000 })
      await expect(page).not.toHaveURL(/\/login/)
    })

    test('delete → confirm → employee removed from active list', async ({ page }) => {
      test.setTimeout(30000)
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
      await expect(page.locator('text=Delete Employee')).toBeVisible({ timeout: 5000 })
      await page
        .locator('[role="alertdialog"]')
        .getByRole('button', { name: 'Delete', exact: true })
        .click()
      await expect(page.locator(`text=${EMP_NAME}`)).not.toBeVisible({ timeout: 8000 })
    })

    test('View Deleted Employees → deleted employee visible', async ({ page }) => {
      test.setTimeout(30000)
      await goToUsers(page)
      await page.getByRole('button', { name: 'View Deleted Employees' }).click()
      await expect(page.locator(`text=${EMP_NAME}`)).toBeVisible({ timeout: 8000 })
    })
  })
})
