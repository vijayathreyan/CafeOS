import { test, expect, type Page } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs, ensureShiftOpen } from './helpers'

async function loginAsStaff(page: Page) {
  await loginAs(page, TEST_USERS.staff_kr)
  await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Security — Route Access Control', () => {
  test('staff user navigates to /dashboard → redirected to /staff-dashboard', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/dashboard')
    // ProtectedRoute for owner-only routes must redirect staff away
    await page.waitForURL(/\/(staff-dashboard|login)/, { timeout: 8000 })
    await expect(page).not.toHaveURL(/\/dashboard$/)
    await expect(page).toHaveURL(/\/staff-dashboard/)
  })

  test('staff user navigates to /users → redirected away from employee management', async ({
    page,
  }) => {
    await loginAsStaff(page)
    await page.goto('/users')
    await page.waitForURL(/\/(staff-dashboard|login)/, { timeout: 8000 })
    await expect(page).not.toHaveURL(/\/users/)
  })

  test('supervisor navigates to /users → redirected away from employee management', async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.supervisor)
    await page.waitForURL(/\/(supervisor-dashboard|branch-select)/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.goto('/users')
    await page.waitForURL(/\/(supervisor-dashboard|branch-select|login)/, { timeout: 8000 })
    await expect(page).not.toHaveURL(/\/users/)
  })

  test('unauthenticated user visits protected routes → all redirect to /login', async ({
    page,
  }) => {
    // Each route independently — fresh navigation, no session
    for (const route of ['/dashboard', '/users', '/tasks', '/shift', '/supervisor-dashboard']) {
      await page.goto(route)
      await page.waitForURL('**/login', { timeout: 8000 })
      await expect(page).toHaveURL(/\/login/, {
        message: `Expected /login after navigating to ${route}`,
      })
    }
  })

  test('C2 staff logs in → shift dashboard shows C2 branch data only, not KR', async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_c2)
    await page.waitForURL('**/staff-dashboard', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await ensureShiftOpen(page)

    // C2 branch name must appear in the shift header
    await expect(page.locator('text=Coffee Mate C2').first()).toBeVisible()
    // KR branch name must NOT appear anywhere on the page
    await expect(page.locator('text=Kaappi Ready')).not.toBeVisible()
  })
})
