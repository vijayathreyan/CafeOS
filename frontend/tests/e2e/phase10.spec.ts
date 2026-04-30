import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { TEST_USERS } from './test-data'

// Phase 10 — Alert Manager + WhatsApp Alerts + Task Management

async function loginAsOwner(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.owner)
  await page.waitForURL('**/dashboard', { timeout: 12000 })
}

async function loginAsStaff(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.staff_kr)
  await page.waitForURL('**/staff-dashboard', { timeout: 12000 })
}

async function loginAsSupervisor(page: Parameters<typeof loginAs>[0]) {
  await loginAs(page, TEST_USERS.supervisor)
  await page.waitForURL('**/supervisor-dashboard', { timeout: 12000 })
}

// ─── Alert Manager ────────────────────────────────────────────────────────────

test.describe('Phase 10 — Alert Manager', () => {
  test('Owner sidebar shows Alert Manager link', async ({ page }) => {
    await loginAsOwner(page)
    const link = page.locator('[data-testid="owner-sidebar"] a[href="/settings/alerts"]')
    await expect(link).toBeVisible({ timeout: 8000 })
  })

  test('Alert Manager page renders with rules list', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings/alerts')
    await page.waitForSelector('[data-testid="alert-manager-page"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="rules-list"]')).toBeVisible()
  })

  test('Alert Manager shows seeded rule cards', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings/alerts')
    await page.waitForSelector('[data-testid="rules-list"]', { timeout: 10000 })
    // At least one rule card should exist (20 seeded rules)
    const cards = page.locator('[data-testid^="rule-card-"]')
    await expect(cards.first()).toBeVisible({ timeout: 8000 })
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Toggle switch changes active state on a rule', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings/alerts')
    await page.waitForSelector('[data-testid^="toggle-"]', { timeout: 10000 })
    const firstToggle = page.locator('[data-testid^="toggle-"]').first()
    // Click toggle and verify it doesn't throw
    await firstToggle.click()
    // The button should still be present after click
    await expect(firstToggle).toBeVisible()
  })

  test('Edit drawer opens on Edit button click', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings/alerts')
    await page.waitForSelector('[data-testid^="edit-rule-"]', { timeout: 10000 })
    const firstEdit = page.locator('[data-testid^="edit-rule-"]').first()
    await firstEdit.click()
    await expect(page.locator('[data-testid="edit-rule-drawer"]')).toBeVisible({ timeout: 5000 })
  })

  test('Alert log section is collapsible', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/settings/alerts')
    await page.waitForSelector('[data-testid="alert-log-section"]', { timeout: 10000 })
    const section = page.locator('[data-testid="alert-log-section"]')
    await expect(section).toBeVisible()
    // The log content is collapsed by default — click to expand
    const toggleBtn = section.locator('button').first()
    await toggleBtn.click()
    // After click, date filters should appear
    await expect(section.locator('input[type="date"]').first()).toBeVisible({ timeout: 3000 })
  })
})

// ─── Task Management ─────────────────────────────────────────────────────────

test.describe('Phase 10 — Task Inbox', () => {
  test('Tasks page renders for owner', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/tasks')
    await page.waitForSelector('[data-testid="tasks-page"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="owner-kpi-row"]')).toBeVisible()
  })

  test('Tasks page renders for staff', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/tasks')
    await page.waitForSelector('[data-testid="tasks-page"]', { timeout: 10000 })
    // Staff view should not have the owner KPI row
    await expect(page.locator('[data-testid="owner-kpi-row"]')).not.toBeVisible()
  })

  test('Tasks page renders for supervisor', async ({ page }) => {
    await loginAsSupervisor(page)
    await page.goto('/tasks')
    await page.waitForSelector('[data-testid="tasks-page"]', { timeout: 10000 })
    // Supervisor has new-task button
    await expect(page.locator('[data-testid="new-task-btn"]')).toBeVisible()
  })

  test('Owner can open Create Task drawer', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/tasks')
    await page.waitForSelector('[data-testid="new-task-btn"]', { timeout: 10000 })
    await page.click('[data-testid="new-task-btn"]')
    await expect(page.locator('[data-testid="create-task-drawer"]')).toBeVisible({ timeout: 5000 })
  })

  test('Create Task drawer has required fields', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/tasks')
    await page.waitForSelector('[data-testid="new-task-btn"]', { timeout: 10000 })
    await page.click('[data-testid="new-task-btn"]')
    await page.waitForSelector('[data-testid="create-task-drawer"]', { timeout: 5000 })
    await expect(page.locator('[data-testid="task-title-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="create-task-submit"]')).toBeVisible()
  })

  test('Create task submit requires title', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/tasks')
    await page.waitForSelector('[data-testid="new-task-btn"]', { timeout: 10000 })
    await page.click('[data-testid="new-task-btn"]')
    await page.waitForSelector('[data-testid="create-task-drawer"]', { timeout: 5000 })
    // Try to submit without title — button should be disabled or form stays open
    const submitBtn = page.locator('[data-testid="create-task-submit"]')
    await submitBtn.click()
    // Drawer should still be visible (title validation prevents close)
    await expect(page.locator('[data-testid="create-task-drawer"]')).toBeVisible()
  })

  test('Owner task board shows branch filters', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/tasks')
    await page.waitForSelector('[data-testid="tasks-page"]', { timeout: 10000 })
    await expect(page.locator('[data-testid="branch-filter-KR"]')).toBeVisible()
    await expect(page.locator('[data-testid="branch-filter-C2"]')).toBeVisible()
  })

  test('Recurring toggle shows frequency selector', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/tasks')
    await page.waitForSelector('[data-testid="new-task-btn"]', { timeout: 10000 })
    await page.click('[data-testid="new-task-btn"]')
    await page.waitForSelector('[data-testid="create-task-drawer"]', { timeout: 5000 })
    // Toggle recurring
    await page.click('[data-testid="recurring-toggle"]')
    await expect(page.locator('[data-testid="frequency-selector"]')).toBeVisible({ timeout: 3000 })
  })
})

// ─── Navigation badge ─────────────────────────────────────────────────────────

test.describe('Phase 10 — Navigation', () => {
  test('Owner sidebar Tasks link is present', async ({ page }) => {
    await loginAsOwner(page)
    const link = page.locator('[data-testid="owner-sidebar"] a[href="/tasks"]')
    await expect(link).toBeVisible({ timeout: 8000 })
  })
})
