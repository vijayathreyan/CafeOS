import { test, expect, type Page } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs, searchEmployee } from './helpers'

// Unique phone for the deactivate double-click test — 00000 prefix for teardown
const DEACT_PHONE = `00000${Date.now().toString().slice(-5)}`
const DEACT_NAME = `E2E Edge ${Date.now()}`
const DEACT_PASSWORD = 'Test@1234'

async function goToNewEmployee(page: Page) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
  await page.goto('/users')
  await page.waitForURL('**/users', { timeout: 8000 })
  await page.waitForSelector('h1:has-text("Employees")', { timeout: 8000 })
  await page.getByRole('button', { name: /Add Employee/ }).click()
  await page.waitForURL('**/users/new', { timeout: 8000 })
  await page.getByRole('heading', { name: /System Access/ }).waitFor({ timeout: 5000 })
}

test.describe('Edge Cases — Form Validation', () => {
  test('phone number with fewer than 10 digits → validation error on Next', async ({ page }) => {
    // fill() on type="tel" inputs does not trigger react-hook-form's onChange reliably in
    // Chromium, so the field appears empty and the wrong error fires. pressSequentially()
    // types char-by-char and correctly triggers RHF's onChange on each keystroke.
    await goToNewEmployee(page)
    const phoneInput = page.locator('input[type="tel"]').first()
    await phoneInput.click()
    await phoneInput.pressSequentially('980010000') // 9 digits — one short of the required 10
    await phoneInput.blur()
    await page
      .locator('text=Checking...')
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => null)
    await page.locator('button:has-text("Next")').click()
    await expect(page.locator('text=Enter a valid 10-digit phone number')).toBeVisible()
  })

  test('password shorter than 6 characters → validation error on Next', async ({ page }) => {
    await goToNewEmployee(page)
    await page.locator('input').first().fill('E2E Short Pw')
    const phoneInput = page.locator('input[type="tel"]').first()
    await phoneInput.fill('9800100001')
    await phoneInput.blur()
    await page.waitForResponse('**/rest/v1/**', { timeout: 10000 }).catch(() => null)
    await page.locator('input[type="checkbox"]').first().check()
    const pwdInputs = page.locator('input[type="password"]')
    await pwdInputs.nth(0).fill('Ab1')
    await pwdInputs.nth(1).fill('Ab1')
    await page.locator('button:has-text("Next")').click()
    await expect(page.locator('text=Minimum 6 characters')).toBeVisible()
  })

  test('name field with only spaces → required error on Next', async ({ page }) => {
    await goToNewEmployee(page)
    // Fill name with spaces only — trim() makes it empty → 'Full name is required'
    await page.locator('input').first().fill('     ')
    await page.locator('button:has-text("Next")').click()
    await expect(page.locator('text=Full name is required')).toBeVisible()
  })

  test('login with correct phone but wrong case password → error shown, stays on /login', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.waitForSelector('#phone', { timeout: 8000 })
    await page.fill('#phone', TEST_USERS.owner.phone)
    // GoTrue passwords are case-sensitive — uppercasing will fail auth
    await page.fill('#password', TEST_USERS.owner.password.toUpperCase())
    await page.click('button[type="submit"]')
    await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('rapid double-click on login submit → only one auth request sent', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('#phone', { timeout: 8000 })
    await page.fill('#phone', TEST_USERS.owner.phone)
    await page.fill('#password', 'wrongpassword')

    let authRequests = 0
    page.on('request', (req) => {
      if (req.url().includes('/auth/v1/token')) authRequests++
    })

    const submitBtn = page.locator('button[type="submit"]')
    // Fire both clicks without awaiting — simulates rapid double-click
    const click1 = submitBtn.click()
    const click2 = submitBtn.click()
    await Promise.allSettled([click1, click2])
    // Wait for auth response
    await page.waitForResponse((res) => res.url().includes('/auth/v1/token'), {
      timeout: 10000,
    })

    expect(authRequests).toBe(1)
  })

  // ── Serial block: needs a real employee to test deactivate double-click ──
  test.describe.serial('Deactivate double-click guard', () => {
    test('setup — create deactivate-test employee', async ({ page }) => {
      test.setTimeout(90000)
      await goToNewEmployee(page)

      await page.locator('input').first().fill(DEACT_NAME)
      const phoneInput = page.locator('input[type="tel"]').first()
      await phoneInput.fill(DEACT_PHONE)
      await phoneInput.blur()
      await page.waitForResponse('**/rest/v1/**', { timeout: 10000 }).catch(() => null)
      await page.locator('input[type="checkbox"]').first().check()
      const pwdInputs = page.locator('input[type="password"]')
      await pwdInputs.nth(0).fill(DEACT_PASSWORD)
      await pwdInputs.nth(1).fill(DEACT_PASSWORD)
      await page.locator('button:has-text("Next")').click()
      await page.getByRole('heading', { name: /Personal/ }).waitFor({ timeout: 5000 })
      await page.locator('button:has-text("Bank Details")').click()
      await page.getByRole('heading', { name: /Bank/ }).waitFor({ timeout: 5000 })
      await page.locator('button[type="submit"]').click()
      await expect(page.locator('text=Employee Created')).toBeVisible({ timeout: 15000 })
      await page.waitForURL('**/users', { timeout: 8000 })
    })

    test('rapid double-click on Deactivate → employee deactivated exactly once', async ({
      page,
    }) => {
      test.setTimeout(30000)
      await loginAs(page, TEST_USERS.owner)
      await page.waitForURL('**/dashboard', { timeout: 12000 })
      await page.goto('/users')
      await page.waitForURL('**/users', { timeout: 8000 })
      await page.waitForSelector('h1:has-text("Employees")', { timeout: 8000 })
      await searchEmployee(page, DEACT_NAME)

      const deactivateBtn = page.getByRole('button', { name: 'Deactivate' }).first()

      // Rapid double-click — second click should be a no-op (dialog already open / button disabled)
      const click1 = deactivateBtn.click()
      const click2 = deactivateBtn.click()
      await Promise.allSettled([click1, click2])

      // AlertDialog must appear exactly once
      await expect(page.locator('[role="alertdialog"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[role="alertdialog"]')).toHaveCount(1)

      // Confirm deactivation
      await page.locator('[role="alertdialog"]').getByRole('button', { name: 'Deactivate' }).click()
      await expect(page.locator('text=Inactive')).toBeVisible({ timeout: 8000 })
    })

    test('teardown — delete deactivate-test employee', async ({ page }) => {
      test.setTimeout(30000)
      await loginAs(page, TEST_USERS.owner)
      await page.waitForURL('**/dashboard', { timeout: 12000 })
      await page.goto('/users')
      await page.waitForURL('**/users', { timeout: 8000 })
      await page.waitForSelector('h1:has-text("Employees")', { timeout: 8000 })
      await searchEmployee(page, DEACT_NAME)
      await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
      await expect(page.locator('text=Delete Employee')).toBeVisible({ timeout: 5000 })
      await page
        .locator('[role="alertdialog"]')
        .getByRole('button', { name: 'Delete', exact: true })
        .click()
      await expect(page.locator(`text=${DEACT_NAME}`)).not.toBeVisible({ timeout: 8000 })
    })
  })
})
