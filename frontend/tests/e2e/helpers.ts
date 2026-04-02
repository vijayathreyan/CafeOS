import { Page } from '@playwright/test'

/** Navigate to /login, wait for form, fill credentials, submit. Does NOT wait for redirect. */
export async function loginAs(page: Page, user: { phone: string; password: string }) {
  await page.goto('/login')
  // The app has a 3-second auth loading gate — wait for the form to appear
  await page.waitForSelector('#phone', { timeout: 8000 })
  await page.fill('#phone', user.phone)
  await page.fill('#password', user.password)
  await page.click('button[type="submit"]')
}

/** Search for an employee by name in the UserManagement search box.
 *  Assumes the page is already at /users. */
export async function searchEmployee(page: Page, name: string) {
  const searchInput = page.locator('input[placeholder*="Search"]')
  await searchInput.clear()
  await searchInput.fill(name)
  // Small wait for the filter to apply
  await page.waitForTimeout(400)
}

/** Navigate to /shift and ensure a shift is open.
 *  If no active shift exists, clicks "Open New Shift" to create one.
 *  Always waits until the 6 section cards are visible before returning. */
export async function ensureShiftOpen(page: Page) {
  await page.goto('/shift')
  await page.waitForLoadState('networkidle')

  // If no active shift, open one
  const openBtn = page.locator('button:has-text("Open New Shift")')
  if (await openBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await openBtn.click()
  }

  // Always wait for the Snacks section card to confirm the dashboard is rendered
  await page.waitForSelector('text=Snacks', { timeout: 12000 })
}
