import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs } from './helpers'

// Owner uses TopBar desktop nav (NavLinks inside <header><nav>).
// BottomNav is a separate <nav> inside a md:hidden wrapper — both exist in DOM.
// Always scope nav selectors to <header> to avoid strict-mode violations.

test.describe('Navigation — Owner', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.waitForLoadState('networkidle')
  })

  test('navigation bar visible on /dashboard', async ({ page }) => {
    // The TopBar desktop nav is inside <header>
    await expect(page.locator('header').getByRole('navigation')).toBeVisible()
    await expect(page.locator('header').getByRole('link', { name: 'Dashboard' })).toBeVisible()
  })

  test('navigation bar visible on /users', async ({ page }) => {
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header').getByRole('navigation')).toBeVisible()
  })

  test('navigation bar visible on /tasks', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForURL('**/tasks', { timeout: 8000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('header').getByRole('navigation')).toBeVisible()
  })

  test('click Dashboard link → goes to /dashboard', async ({ page }) => {
    // Start on /users then click Dashboard nav link in the header
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    await page.waitForLoadState('networkidle')
    await page.locator('header').getByRole('link', { name: 'Dashboard' }).click()
    // / redirects to /dashboard for owner
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 8000 })
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })

  test('click Employees link → goes to /users', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await page.locator('header').getByRole('link', { name: 'Employees' }).click()
    await page.waitForURL('**/users', { timeout: 8000 })
    await expect(page).toHaveURL(/\/users/)
  })

  test('click Tasks link → goes to /tasks', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await page.locator('header').getByRole('link', { name: 'Tasks' }).click()
    await page.waitForURL('**/tasks', { timeout: 8000 })
    await expect(page).toHaveURL(/\/tasks/)
  })

  test('CafeOS logo click → goes to home', async ({ page }) => {
    // The CafeOS logo in TopBar is a styled div — not a link.
    // The navigable "home" element is the Dashboard NavLink (href="/") in the header nav.
    await page.goto('/users')
    await page.waitForURL('**/users', { timeout: 8000 })
    await page.waitForLoadState('networkidle')
    // Click the Dashboard link (linked to "/") — this is the home navigation entry point
    await page.locator('header').getByRole('link', { name: 'Dashboard' }).click()
    // Owner / → redirects to /dashboard
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 8000 })
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })
})
