import { test, expect } from '@playwright/test'
import { TEST_USERS } from './test-data'
import { loginAs } from './helpers'

// Owner navigation: persistent sidebar on desktop (≥1024px), Sheet drawer on mobile.
// Staff/supervisor navigation: AppHeader with home button + BottomNav.

test.describe('Navigation — Owner sidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport so the sidebar is visible (≥1024px)
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.waitForLoadState('networkidle')
  })

  test('sidebar visible on /dashboard', async ({ page }) => {
    await expect(page.locator('[data-testid="owner-sidebar"]')).toBeVisible()
  })

  test('sidebar visible on /users', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="owner-sidebar"]')).toBeVisible()
  })

  test('sidebar visible on /tasks', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-testid="owner-sidebar"]')).toBeVisible()
  })

  test('sidebar Dashboard link navigates to /dashboard', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    await page
      .locator('[data-testid="owner-sidebar"]')
      .getByRole('link', { name: 'Dashboard' })
      .click()
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 8000 })
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })

  test('sidebar Employees link navigates to /users', async ({ page }) => {
    await page
      .locator('[data-testid="owner-sidebar"]')
      .getByRole('link', { name: 'Employees' })
      .click()
    await page.waitForURL('**/users', { timeout: 8000 })
    await expect(page).toHaveURL(/\/users/)
  })

  test('sidebar Tasks link navigates to /tasks', async ({ page }) => {
    await page.locator('[data-testid="owner-sidebar"]').getByRole('link', { name: 'Tasks' }).click()
    await page.waitForURL('**/tasks', { timeout: 8000 })
    await expect(page).toHaveURL(/\/tasks/)
  })

  test('sidebar Vendor Payments link navigates to /owner/vendor-payments', async ({ page }) => {
    await page
      .locator('[data-testid="owner-sidebar"]')
      .getByRole('link', { name: 'Vendor Payments' })
      .click()
    await page.waitForURL('**/vendor-payments', { timeout: 8000 })
    await expect(page).toHaveURL(/\/owner\/vendor-payments/)
  })
})

test.describe('Navigation — Owner mobile hamburger', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport so the sidebar is hidden and hamburger is shown
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAs(page, TEST_USERS.owner)
    await page.waitForURL('**/dashboard', { timeout: 12000 })
    await page.waitForLoadState('networkidle')
  })

  test('hamburger button visible on mobile', async ({ page }) => {
    await expect(page.locator('[data-testid="sidebar-hamburger"]')).toBeVisible()
  })

  test('desktop sidebar hidden on mobile', async ({ page }) => {
    await expect(page.locator('[data-testid="owner-sidebar"]')).not.toBeVisible()
  })

  test('tapping hamburger opens sheet drawer', async ({ page }) => {
    await page.locator('[data-testid="sidebar-hamburger"]').click()
    // Sheet content should now contain nav links
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible()
  })
})

test.describe('Navigation — Staff AppHeader', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.staff_kr)
    await page.waitForLoadState('networkidle')
  })

  test('AppHeader home button visible', async ({ page }) => {
    await expect(page.locator('[data-testid="app-header-home"]')).toBeVisible()
  })

  test('AppHeader home button navigates to staff home', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-testid="app-header-home"]').click()
    await page.waitForURL(/\/staff-dashboard/, { timeout: 8000 })
    await expect(page).toHaveURL(/\/staff-dashboard/)
  })

  test('no owner sidebar shown for staff', async ({ page }) => {
    await expect(page.locator('[data-testid="owner-sidebar"]')).not.toBeVisible()
  })
})
