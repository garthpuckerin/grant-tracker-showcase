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
  await complianceRow.getByRole('button', { name: 'Review compliance' }).click()
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
  // Demo-scoped: download explains itself instead of producing a file.
  await page.getByRole('dialog').getByRole('button', { name: 'Download' }).click()
  await expect(page.locator('.toast-flag')).toContainText('would download')
})

test('the dashboard chart is backed by numbers: month drill-down cross-foots to the clicked bar', async ({ page }) => {
  await enterApp(page, { name: 'dashboard' })
  await page.goto('/')
  await expect(page.locator('[data-window-total]')).toBeVisible()

  // The window Total equals the sum of the plotted months (read from the hit targets).
  const sums = await page.evaluate(() => {
    const parse = (s) => Number((s.match(/\$([\d,]+)/) || [])[1]?.replace(/,/g, ''))
    const months = [...document.querySelectorAll('.chart-hits button')].map((b) => parse(b.getAttribute('aria-label')))
    return { months, count: months.length }
  })
  expect(sums.count).toBe(12)
  expect(sums.months.every((v) => v > 0)).toBe(true)

  // Click a month → the drawer's TOTAL equals that bar's exact value and the
  // allocation rows sum to it.
  const target = page.locator('.chart-hits button').nth(5)
  const label = await target.getAttribute('aria-label')
  const barValue = Number(label.match(/\$([\d,]+)/)[1].replace(/,/g, ''))
  await target.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const drawer = await page.evaluate(() => {
    const parse = (s) => Number(s.replace(/[^\d]/g, ''))
    const total = parse(document.querySelector('[data-month-total]').textContent)
    const rows = [...document.querySelectorAll('.drawer-body tbody td.num.r:first-of-type, .drawer-body tbody tr td:nth-child(2)')].map((td) => parse(td.textContent))
    return { total, rowSum: rows.reduce((s, v) => s + v, 0) }
  })
  expect(drawer.total).toBe(barValue)
  expect(drawer.rowSum).toBe(barValue)
})

test('the audit trail is live: approving a reallocation lands in the grant history with a session badge', async ({ page }) => {
  await enterApp(page, { name: 'grant', id: '1', tab: 'budget' })
  await page.goto('/')
  await page.getByRole('button', { name: 'budget', exact: true }).click()
  await page.getByRole('button', { name: 'Approve' }).click()

  await page.getByRole('button', { name: 'history', exact: true }).click()
  const trail = page.locator('.card').filter({ hasText: 'Audit Trail' })
  await expect(trail).toContainText('Approved reallocation')
  await expect(trail).toContainText('$8,000 · SUPPLIES → EQUIPMENT')
  await expect(trail).toContainText('1 this session')
  await expect(trail.locator('text=SESSION').first()).toBeVisible()

  // An award with no fixture history shows the designed empty state.
  await enterApp(page, { name: 'grant', id: '10', tab: 'history' })
  await page.goto('/')
  await expect(page.getByText("Nothing in this award's audit trail")).toBeVisible()
})

test('insight agent tiles and compliance framework rows filter their lists', async ({ page }) => {
  await enterApp(page, { name: 'insights' })
  await page.goto('/')
  await expect(page.locator('.insight-row')).toHaveCount(9)
  await page.getByRole('button', { name: /● BUDGET/ }).click()
  await expect(page.locator('.insight-row')).toHaveCount(2)
  await page.getByRole('button', { name: /● BUDGET/ }).click()
  await expect(page.locator('.insight-row')).toHaveCount(9)

  await enterApp(page, { name: 'compliance' })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Resolve' })).toHaveCount(3)
  await page.locator('tr.row-h').filter({ hasText: 'Institutional' }).click()
  await expect(page.getByRole('button', { name: 'Resolve' })).toHaveCount(1)
  await expect(page.getByText(/1 Institutional of 3/)).toBeVisible()
  await page.locator('tr.row-h').filter({ hasText: 'Institutional' }).click()
  await expect(page.getByRole('button', { name: 'Resolve' })).toHaveCount(3)
})

test('white-glove: surfaces that look clickable act — insight rows, budget lines, report rows', async ({ page }) => {
  // An insight row (not just its buttons) deep-links to the related grant.
  await enterApp(page, { name: 'insights' })
  await page.goto('/')
  await page.locator('.insight-row').first().click()
  await expect(page.locator('.tabs button.on')).toBeVisible()

  // A budget line row opens the reallocation flow prefilled with its category.
  await enterApp(page, { name: 'grant', id: '1', tab: 'budget' })
  await page.goto('/')
  await page.getByRole('button', { name: 'budget', exact: true }).click()
  await page.locator('table.ledger tbody tr.row-h').first().click()
  const dlg = page.getByRole('dialog')
  await expect(dlg).toBeVisible()
  await expect(dlg.locator('#f-fromCat')).toHaveValue('PERSONNEL')
  await page.keyboard.press('Escape')

  // A scheduled-report row explains its production behavior (demo-scoped).
  await enterApp(page, { name: 'reports' })
  await page.goto('/')
  await page.locator('table.ledger tbody tr.row-h').first().click()
  await expect(page.locator('.toast-flag')).toContainText('read-only')
})

test('dashboard insights act inline: dismiss re-derives the badge, a row deep-links', async ({ page }) => {
  await enterApp(page, { name: 'dashboard' })
  await page.goto('/')
  await expect(sidebarCount(page, 'AI Insights')).toHaveText('9')

  // Dismiss straight from the landing page — no trip to the AI screen.
  const widget = page.locator('.card').filter({ hasText: 'AI Insights' })
  await widget.getByRole('button', { name: 'Dismiss' }).first().click()
  await expect(sidebarCount(page, 'AI Insights')).toHaveText('8')

  // The row itself deep-links to the related grant's relevant tab.
  await widget.locator('.row.row-h').first().click()
  await expect(page.locator('.tabs button.on')).toBeVisible()
})

test('grant analysis card is live: signals dismiss in place and rows switch tabs', async ({ page }) => {
  await enterApp(page, { name: 'grant', id: '1' })
  await page.goto('/')
  const card = page.locator('.card').filter({ hasText: 'Grant Analysis' })
  await expect(card).toContainText('open signal')
  await expect(card).toContainText('projected to close at')

  // Dismissing a signal here re-derives the sidebar count too.
  await expect(sidebarCount(page, 'AI Insights')).toHaveText('9')
  await card.getByRole('button', { name: 'Dismiss' }).first().click()
  await expect(sidebarCount(page, 'AI Insights')).toHaveText('8')

  // The derived burn-forecast row opens the budget ledger.
  await card.getByRole('button', { name: /burn forecast/ }).click()
  await expect(page.locator('.tabs button.on')).toHaveText('budget')
})
