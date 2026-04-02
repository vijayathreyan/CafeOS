import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs, ensureShiftOpen } from './helpers'

test.describe('Role-Based Access', () => {
  test('owner login → owner dashboard shown', async ({ page }) => {
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    // OwnerDashboard renders — verify owner-only nav elements present
    await expect(page).toHaveURL(/\/dashboard/)
    // Owner desktop nav has Employees and Reports links
    await expect(page.locator('nav').locator('text=Employees')).toBeVisible()
  })

  test('staff login → staff dashboard shown, not owner dashboard', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
    await expect(page).toHaveURL(/\/staff-dashboard/)
    // Owner dashboard (/dashboard) must not be reachable — ProtectedRoute blocks it
    await page.goto('/dashboard')
    // Should redirect away (back to / → /staff-dashboard, or to /login)
    await page.waitForURL('**/(staff-dashboard|login)', { timeout: 8000 })
    await expect(page).not.toHaveURL(/\/dashboard$/)
  })

  test('supervisor login → supervisor dashboard shown', async ({ page }) => {
    await loginAs(page, TEST_USERS.supervisor)
    // Supervisor may get branch-select first if multi-branch, then supervisor-dashboard
    await page.waitForURL('**/(supervisor-dashboard|branch-select)', { timeout: 12000 })
    // Either way, not the owner dashboard and not the staff dashboard
    await expect(page).not.toHaveURL(/\/dashboard$/)
    await expect(page).not.toHaveURL(/\/staff-dashboard/)
  })

  test('KR staff → sees KR shift dashboard with all KR cards', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
    await ensureShiftOpen(page)
    // KR-specific: all 6 cards including Post-Paid Sales
    await expect(page.locator('text=Snacks')).toBeVisible()
    await expect(page.locator('text=Post-Paid Sales')).toBeVisible()
    // Branch shown in header is Kaappi Ready
    await expect(page.locator('text=Kaappi Ready')).toBeVisible()
  })

  test('C2 staff → sees C2 shift dashboard, no Post-Paid card', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_c2)
    await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
    await ensureShiftOpen(page)
    // C2 branch shown in header
    await expect(page.locator('text=Coffee Mate C2')).toBeVisible()
    // Post-Paid Sales card must NOT appear for C2
    await expect(page.locator('text=Post-Paid Sales')).not.toBeVisible()
  })
})
