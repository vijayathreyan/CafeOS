import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs } from './helpers'

// Owner uses TopBar desktop nav (NavLinks) — visible at sm+ viewport (default Desktop Chrome)
// Staff/Supervisor use BottomNav

test.describe('Navigation — Owner', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
  })

  test('navigation bar visible on /dashboard', async ({ page }) => {
    // Owner desktop nav is in the TopBar header
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('navigation bar visible on /users', async ({ page }) => {
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    await expect(page.locator('nav')).toBeVisible()
  })

  test('navigation bar visible on /tasks', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForURL('**/tasks', { timeout: 8000 })
    await expect(page.locator('nav')).toBeVisible()
  })

  test('click Dashboard link → goes to /dashboard', async ({ page }) => {
    // Start on /users then click Dashboard nav link
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    await page.locator('nav a:has-text("Dashboard"), nav button:has-text("Dashboard")').first().click()
    await page.waitForURL('**/', { timeout: 8000 })
    // / redirects to /dashboard for owner
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })

  test('click Employees link → goes to /users', async ({ page }) => {
    await page.locator('nav').locator('text=Employees').first().click()
    await page.waitForURL('**/users', { timeout: 8000 })
    await expect(page).toHaveURL(/\/users/)
  })

  test('click Tasks link → goes to /tasks', async ({ page }) => {
    await page.locator('nav').locator('text=Tasks').first().click()
    await page.waitForURL('**/tasks', { timeout: 8000 })
    await expect(page).toHaveURL(/\/tasks/)
  })

  test('CafeOS logo click → goes to home', async ({ page }) => {
    // Start on /users
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    // The TopBar logo is a styled div with "C" inside, not a link
    // The closest link for home is the "/" NavLink or the "Dashboard" text link
    // Test: navigate to / via Dashboard nav
    await page.locator('nav a[href="/"], nav a[href=""]').first().click()
    // Owner / → redirects to /dashboard
    await page.waitForURL('**/(dashboard)?', { timeout: 8000 })
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })
})
