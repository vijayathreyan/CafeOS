import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs, ensureShiftOpen } from './helpers'

test.describe('Role-Based Access', () => {
  test('owner login → owner dashboard shown', async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/dashboard/)
    // Owner desktop nav has Employees link — scoped to header to avoid strict-mode
    await expect(page.locator('header').getByRole('link', { name: 'Employees' })).toBeVisible()
  })

  test('staff login → staff dashboard shown, not owner dashboard', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/staff-dashboard/)
    // Owner dashboard must not be reachable — ProtectedRoute blocks it
    await page.goto('/dashboard')
    await page.waitForURL(/\/(staff-dashboard|login)/, { timeout: 8000 })
    await expect(page).not.toHaveURL(/\/dashboard$/)
  })

  test('supervisor login → supervisor dashboard shown', async ({ page }) => {
    await loginAs(page, TEST_USERS.supervisor)
    // Supervisor may land on branch-select first, then supervisor-dashboard
    await page.waitForURL(/\/(supervisor-dashboard|branch-select)/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page).not.toHaveURL(/\/dashboard$/)
    await expect(page).not.toHaveURL(/\/staff-dashboard/)
  })

  test('KR staff → sees KR shift dashboard with all KR cards', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await ensureShiftOpen(page)
    // KR-specific: all 6 cards including Post-Paid Sales
    await expect(page.locator('text=Snacks')).toBeVisible()
    await expect(page.locator('text=Post-Paid Sales')).toBeVisible()
    // Branch shown in header is Kaappi Ready
    await expect(page.locator('text=Kaappi Ready').first()).toBeVisible()
  })

  test('C2 staff → sees C2 shift dashboard, no Post-Paid card', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_c2)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await ensureShiftOpen(page)
    // C2 branch shown in header
    await expect(page.locator('text=Coffee Mate C2').first()).toBeVisible()
    // Post-Paid Sales card must NOT appear for C2
    await expect(page.locator('text=Post-Paid Sales')).not.toBeVisible()
  })
})
