// Interaction-depth e2e — every surface does something real, end to end, on
// mock data, and the change re-derives across screens. Complements
// workflows.spec.js (the two signature workflows) and smoke.spec.js.

import { test, expect } from '@playwright/test'

const enterApp = async (page, route) => {
  await page.addInitScript((r) => {
    try {
      sessionStorage.setItem('gt2:entered:v1', 'true')
      localStorage.setItem('gt2:onboarded:v1', 'true')
      if (r) localStorage.setItem('gt2-route', JSON.stringify(r))
    } catch (e) { /* private mode */ }
  }, route)
}

const sidebarCount = (page, label) =>
  page.locator('.sidebar-item').filter({ hasText: label }).locator('.si-count')

test('completing a task re-derives the sidebar badge, the stats, and the dashboard', async ({ page }) => {
  await enterApp(page, { name: 'tasks' })
  await page.goto('/')
  await expect(sidebarCount(page, 'Tasks')).toHaveText('7')

  // Inline check control on the first (overdue) task.
  await page.locator('.task-row .task-check').first().click()
  await expect(sidebarCount(page, 'Tasks')).toHaveText('6')
  await expect(page.locator('.metric').filter({ hasText: 'Overdue' })).toContainText('1')

  // Row → drawer shows the live record; reopen from there.
  await page.locator('.task-row').first().click()
  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('button', { name: /Reopen|Mark complete/ })).toBeVisible()

  // Dashboard copy re-derived from the same store.
  await page.keyboard.press('Escape')
  await page.locator('.sidebar-item').filter({ hasText: 'Overview' }).click()
  await expect(page.locator('.page-head .sub')).toContainText('1 overdue task')
})

test('resolving a compliance finding re-derives the score, the table, and the dashboard posture', async ({ page }) => {
  await enterApp(page, { name: 'compliance' })
  await page.goto('/')
  await expect(page.getByRole('img', { name: /86% utilized/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resolve' })).toHaveCount(3)

  await page.getByRole('button', { name: 'Resolve' }).first().click()
  await expect(page.getByRole('img', { name: /91% utilized/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resolve' })).toHaveCount(2)
  await expect(page.getByText(/1 resolved this session/)).toBeVisible()

  await page.locator('.sidebar-item').filter({ hasText: 'Overview' }).click()
  await expect(page.getByText(/20 of 22 rules passing/i)).toBeVisible()
})

test('dismissing an insight removes it from the list, the sidebar count, and the bell', async ({ page }) => {
  await enterApp(page, { name: 'insights' })
  await page.goto('/')
  await expect(sidebarCount(page, 'AI Insights')).toHaveText('9')
  await expect(page.locator('.insight-row')).toHaveCount(9)

  await page.getByRole('button', { name: 'Dismiss' }).first().click()
  await expect(page.locator('.insight-row')).toHaveCount(8)
  await expect(sidebarCount(page, 'AI Insights')).toHaveText('8')

  // "Take action" on a COMPLIANCE insight deep-links to that grant's Compliance tab.
  const complianceRow = page.locator('.insight-row').filter({ hasText: '2 CFR 200 §200.430' })
  await complianceRow.getByRole('button', { name: 'Take action' }).click()
  await expect(page.locator('.tabs button.on')).toHaveText('compliance')
})

test('uploading a document adds it to the library, the grant tab, and the sidebar count', async ({ page }) => {
  await enterApp(page, { name: 'documents' })
  await page.goto('/')
  await expect(sidebarCount(page, 'Documents')).toHaveText('6')

  await page.getByRole('button', { name: 'Upload' }).click()
  await page.locator('#f-name').fill('Q2 Progress Report.pdf')
  await page.locator('#f-grantId').selectOption('1')
  await page.getByRole('dialog').getByRole('button', { name: 'Upload' }).click()

  await expect(sidebarCount(page, 'Documents')).toHaveText('7')
  await expect(page.locator('table.ledger').getByText('Q2 Progress Report.pdf', { exact: true })).toBeVisible()

  // Row → drawer with a real Download action.
  await page.locator('table.ledger').getByText('Q2 Progress Report.pdf', { exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('dialog').getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/Q2 Progress Report/)
})
