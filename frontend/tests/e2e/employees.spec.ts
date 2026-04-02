import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs, searchEmployee } from './helpers'

// Unique test employee — created and torn down within this run
const EMP_NAME = `E2E Staff ${Date.now()}`
const EMP_PHONE = `980${Date.now().toString().slice(-7)}`
const EMP_PASSWORD = 'Test@1234'

async function goToUsers(page: any) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
  await page.goto('/users')
  await page.waitForURL('**/users', { timeout: 8000 })
  await page.waitForSelector('h1:has-text("Employees")', { timeout: 8000 })
}

async function goToNewEmployee(page: any) {
  await goToUsers(page)
  await page.click('button:has-text("Add Employee")')
  await page.waitForURL('**/users/new', { timeout: 8000 })
  await page.waitForSelector('text=System Access', { timeout: 5000 })
}

test.describe('Employee Management', () => {
  test('employee list loads on /users without refresh', async ({ page }) => {
    await goToUsers(page)
    await expect(page.locator('h1:has-text("Employees")')).toBeVisible()
    // Filter controls and search are present
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })

  test('Add Employee button opens form', async ({ page }) => {
    await goToUsers(page)
    await page.click('button:has-text("Add Employee")')
    await page.waitForURL('**/users/new', { timeout: 8000 })
    // Section 1 heading visible
    await expect(page.locator('text=System Access')).toBeVisible()
    await expect(page.locator('text=Full Name')).toBeVisible()
  })

  test('submit empty Section 1 → validation errors on all mandatory fields', async ({ page }) => {
    await goToNewEmployee(page)
    // Click Next without filling anything — triggers validateSection1()
    await page.click('button:has-text("Next")')
    // All mandatory field errors must appear
    await expect(page.locator('text=Full name is required')).toBeVisible()
    await expect(page.locator('text=Phone number is required')).toBeVisible()
    await expect(page.locator('text=Select at least one branch')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
    await expect(page.locator('text=Please confirm the password')).toBeVisible()
  })

  test('duplicate phone number → inline error shown on blur', async ({ page }) => {
    await goToNewEmployee(page)
    // Type the owner's phone (known to exist in the system)
    const phoneInput = page.locator('input[type="tel"]').first()
    await phoneInput.fill(TEST_USERS.owner.phone)
    // Blur triggers checkPhoneDuplicate
    await phoneInput.blur()
    await expect(
      page.locator('text=This phone number is already registered')
    ).toBeVisible({ timeout: 8000 })
  })

  test('mismatched passwords → error shown', async ({ page }) => {
    await goToNewEmployee(page)
    // Fill name
    await page.locator('input').first().fill('Test Staff Mismatch')
    // Fill phone with a unique number that does not exist
    const phoneInput = page.locator('input[type="tel"]').first()
    await phoneInput.fill('9800100099')
    await phoneInput.blur()
    // Wait briefly to let duplicate check finish (should be clean)
    await page.waitForTimeout(500)
    // Check KR branch
    await page.locator('input[type="checkbox"]').first().check()
    // Enter mismatched passwords
    const pwdInputs = page.locator('input[type="password"]')
    await pwdInputs.nth(0).fill('Test@1234')
    await pwdInputs.nth(1).fill('Different@456')
    // Click Next → validateSection1 catches mismatch
    await page.click('button:has-text("Next")')
    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  // ── Serial CRUD flow ─────────────────────────────────────────────────────────
  // Tests run in order: create → edit → deactivate → blocked → reactivate → delete → verify
  test.describe.serial('Employee CRUD flow', () => {
    test('complete valid form → employee created → appears in list', async ({ page }) => {
      await goToNewEmployee(page)

      // Section 1 — System Access
      await page.locator('input').first().fill(EMP_NAME)
      const phoneInput = page.locator('input[type="tel"]').first()
      await phoneInput.fill(EMP_PHONE)
      await phoneInput.blur()
      await page.waitForTimeout(500) // let duplicate check run (should be clean)
      await page.locator('input[type="checkbox"]').first().check() // KR branch
      const pwdInputs = page.locator('input[type="password"]')
      await pwdInputs.nth(0).fill(EMP_PASSWORD)
      await pwdInputs.nth(1).fill(EMP_PASSWORD)
      await page.click('button:has-text("Next")')

      // Sections 2–5 — all optional, just click Next
      for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(300)
        await page.click('button:has-text("Next")')
      }

      // Section 6 — Submit
      await page.click('button:has-text("Submit")')
      await expect(page.locator('text=Employee Created')).toBeVisible({ timeout: 12000 })

      // Auto-redirects to /users after 1.5s
      await page.waitForURL('**/users', { timeout: 8000 })
      // Employee appears in the list
      await expect(page.locator(`text=${EMP_NAME}`)).toBeVisible({ timeout: 8000 })
    })

    test('edit employee → form opens with pre-filled data', async ({ page }) => {
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      // Click Edit on the filtered result
      await page.locator('button:has-text("Edit")').first().click()
      await page.waitForURL('**/users/**/edit', { timeout: 8000 })
      await page.waitForSelector('text=System Access', { timeout: 5000 })
      // Name field must be pre-filled
      const nameInput = page.locator('input').first()
      await expect(nameInput).toHaveValue(EMP_NAME)
    })

    test('save Section 1 changes → success toast shown', async ({ page }) => {
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      await page.locator('button:has-text("Edit")').first().click()
      await page.waitForURL('**/users/**/edit', { timeout: 8000 })
      await page.waitForSelector('text=System Access', { timeout: 5000 })
      // Append a space to trigger a change
      const nameInput = page.locator('input').first()
      await nameInput.press('End')
      await nameInput.type(' ')
      await page.click('button:has-text("Save Changes")')
      // showToast('Saved successfully', 'success') renders in the Toaster
      await expect(page.locator('text=Saved successfully')).toBeVisible({ timeout: 8000 })
    })

    test('deactivate → shadcn AlertDialog shown → confirm → status changes to Inactive', async ({ page }) => {
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      // Deactivate button appears for active employees
      await page.locator('button:has-text("Deactivate")').first().click()
      // Radix AlertDialog opens
      await expect(page.locator('text=Deactivate Employee')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[role="alertdialog"]')).toBeVisible()
      // Click the confirm action button inside the dialog
      await page.locator('[role="alertdialog"] button:has-text("Deactivate")').click()
      // StatusChip "Inactive" now shown for this employee
      await expect(page.locator('text=Inactive')).toBeVisible({ timeout: 8000 })
    })

    test('deactivated user cannot login', async ({ page }) => {
      await loginAs(page, { phone: EMP_PHONE, password: EMP_PASSWORD })
      // GoTrue rejects login for inactive account OR app rejects at RBAC level
      await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 10000 })
      // Must still be on /login — not redirected to a dashboard
      await expect(page).toHaveURL(/\/login/)
    })

    test('reactivate → confirm → status changes to Active', async ({ page }) => {
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      await page.locator('button:has-text("Reactivate")').first().click()
      await expect(page.locator('text=Reactivate Employee')).toBeVisible({ timeout: 5000 })
      await page.locator('[role="alertdialog"] button:has-text("Reactivate")').click()
      // "Inactive" chip should be gone
      await expect(page.locator('text=Inactive')).not.toBeVisible({ timeout: 8000 })
    })

    test('reactivated user can login', async ({ page }) => {
      await loginAs(page, { phone: EMP_PHONE, password: EMP_PASSWORD })
      // Active KR staff → /staff-dashboard
      await page.waitForURL('**/(staff-dashboard|shift|branch-select)', { timeout: 12000 })
      await expect(page).not.toHaveURL(/\/login/)
    })

    test('delete → confirm → employee removed from active list', async ({ page }) => {
      await goToUsers(page)
      await searchEmployee(page, EMP_NAME)
      await page.locator('button:has-text("Delete")').first().click()
      await expect(page.locator('text=Delete Employee')).toBeVisible({ timeout: 5000 })
      await page.locator('[role="alertdialog"] button:has-text("Delete")').click()
      // After soft-delete, the employee disappears from the active list
      await expect(page.locator(`text=${EMP_NAME}`)).not.toBeVisible({ timeout: 8000 })
    })

    test('View Deleted Employees → deleted employee visible', async ({ page }) => {
      await goToUsers(page)
      await page.click('button:has-text("View Deleted Employees")')
      await expect(page.locator(`text=${EMP_NAME}`)).toBeVisible({ timeout: 8000 })
    })
  })
})
