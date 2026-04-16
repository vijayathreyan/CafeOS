import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs } from './helpers'

test.describe('Authentication', () => {
  test('wrong password → error message shown', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('#phone', { timeout: 8000 })
    await page.fill('#phone', TEST_USERS.owner.phone)
    await page.fill('#password', 'wrongpassword000')
    await page.click('button[type="submit"]')
    // Error paragraph has class text-destructive
    await expect(page.locator('.text-destructive').first()).toBeVisible({ timeout: 10000 })
    // Still on /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('owner login → lands on /dashboard not white page', async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    // Owner sidebar must be visible — not a blank page
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.locator('[data-testid="owner-sidebar"]')).toBeVisible()
    // CafeOS logo/title visible
    await expect(page.locator('text=CafeOS').first()).toBeVisible()
  })

  test('refresh on /dashboard → stays on /dashboard with content loaded', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.reload()
    // Must stay on /dashboard after reload — JWT in localStorage keeps session
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await expect(page.locator('[data-testid="owner-sidebar"]')).toBeVisible()
  })

  test('refresh on /users → stays on /users with employee list loaded', async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    await page.reload()
    await page.waitForURL('**/users', { timeout: 12000 })
    // Employees page header visible after reload
    await expect(page.locator('h1:has-text("Employees")')).toBeVisible({ timeout: 8000 })
  })

  test('refresh on /tasks → stays on /tasks with content loaded', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.goto('/tasks')
    await page.waitForURL('**/tasks', { timeout: 8000 })
    await page.reload()
    await page.waitForURL('**/tasks', { timeout: 12000 })
    await expect(page.locator('[data-testid="owner-sidebar"]')).toBeVisible()
  })

  test('logout from dashboard → redirects to /login immediately', async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    // Logout button is in TopBar — visible on desktop viewport
    await page.locator('button:has-text("Logout")').click()
    await page.waitForURL('**/login', { timeout: 8000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout from employees page → redirects to /login immediately', async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.goto('/users')
    await page.waitForSelector('h1:has-text("Employees")', { timeout: 8000 })
    await page.locator('button:has-text("Logout")').click()
    await page.waitForURL('**/login', { timeout: 8000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('access /dashboard without login → redirects to /login', async ({ page }) => {
    // Fresh context — no session
    await page.goto('/dashboard')
    // ProtectedRoute must redirect unauthenticated user to /login
    await page.waitForURL('**/login', { timeout: 10000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('after logout browser back button → stays on /login', async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.locator('button:has-text("Logout")').click()
    await page.waitForURL('**/login', { timeout: 8000 })
    // Browser back — tries to return to /dashboard, but session is gone
    await page.goBack()
    // ProtectedRoute detects no session → redirects to /login
    await page.waitForURL('**/login', { timeout: 8000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
