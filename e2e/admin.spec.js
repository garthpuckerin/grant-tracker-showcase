// Admin-surface depth e2e — reports viewer, the SF-425 certification state
// machine (RBAC-gated), member invitations, and the grant Tasks tab.

import { test, expect } from '@playwright/test'

const enterApp = async (page, route) => {
  await page.addInitScript((r) => {
    try {
      sessionStorage.setItem('gt2:entered:v1', 'true')
      if (r) localStorage.setItem('gt2-route', JSON.stringify(r))
    } catch (e) { /* private mode */ }
  }, route)
}

const switchRole = async (page, who) => {
  await page.getByTitle(/Switch acting role/).click()
  await page.getByRole('menuitem').filter({ hasText: who }).click()
}

test('a report card opens a real viewer with data and a CSV export', async ({ page }) => {
  await enterApp(page, { name: 'reports' })
  await page.goto('/')
  await page.locator('.report-card').filter({ hasText: 'Sponsor Concentration' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('table.ledger')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('sponsor-concentration.csv')
})

test('SF-425 certification is RBAC-gated: a PI is blocked, Finance certifies, the index shows COMPLETE', async ({ page }) => {
  await enterApp(page, { name: 'sf425' })
  await page.goto('/')
  // Open the in-progress FY25 ANNUAL filing for the NSF award.
  await page.locator('table.ledger tbody tr').filter({ hasText: 'FY25 ANNUAL' }).first().click()
  await expect(page.getByRole('heading', { name: /SF-425/ })).toBeVisible()
  await expect(page.getByText(/Ties out/i)).toBeVisible()

  // As the PI, certification is locked with a 2 CFR 200.415 explanation.
  await switchRole(page, 'Rodriguez')
  await expect(page.getByRole('button', { name: /Certify & submit/ })).toContainText('🔒')
  await expect(page.locator('.flag.alert').filter({ hasText: /Permission required/ })).toContainText('2 CFR 200.415')

  // As Finance, certify → the detail shows Certified and the index row is COMPLETE.
  await switchRole(page, 'Thompson')
  await page.getByRole('button', { name: /Certify & submit/ }).click()
  await expect(page.getByText(/Certified · Lisa Thompson/)).toBeVisible()
  await page.getByRole('button', { name: /All SF-425 filings/ }).click()
  const row = page.locator('table.ledger tbody tr').filter({ hasText: 'FY25 ANNUAL' }).first()
  await expect(row).toContainText('Complete')
  await expect(row.getByRole('button', { name: 'View →' })).toBeVisible()
})

test('New filing opens a validated form that adds a row to the SF-425 index', async ({ page }) => {
  await enterApp(page, { name: 'sf425' })
  await page.goto('/')
  // Five seed filings (wait for the boot skeleton to clear before counting).
  await expect(page.locator('table.ledger tbody tr')).toHaveCount(5)
  const before = 5
  await page.getByRole('button', { name: 'New filing' }).click()
  // Submitting empty surfaces validation, not a row.
  await page.getByRole('dialog').getByRole('button', { name: 'Open filing' }).click()
  await expect(page.getByText('Select the award being reported.')).toBeVisible()
  await page.locator('#f-grantId').selectOption('3')
  await page.locator('#f-period').fill('FY26 Q1')
  await page.getByRole('dialog').getByRole('button', { name: 'Open filing' }).click()
  await expect(page.locator('table.ledger tbody tr')).toHaveCount(before + 1)
  await expect(page.locator('table.ledger tbody tr').first()).toContainText('FY26 Q1')
})

test('Invite adds a member to the workspace list', async ({ page }) => {
  await enterApp(page, { name: 'users' })
  await page.goto('/')
  await expect(page.locator('table.ledger tbody tr')).toHaveCount(5)
  await page.getByRole('button', { name: 'Invite' }).click()
  await page.locator('#f-name').fill('Dr. Priya Natarajan')
  await page.locator('#f-email').fill('p.natarajan@university.edu')
  await page.locator('#f-role').selectOption('FINANCE')
  await page.getByRole('dialog').getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.locator('table.ledger tbody tr')).toHaveCount(6)
  await expect(page.getByText('Dr. Priya Natarajan')).toBeVisible()
  await expect(page.getByText('Invited · pending')).toBeVisible()
})

test('the grant Tasks tab opens a task drawer and shows a designed empty state on an award with no tasks', async ({ page }) => {
  // Grant 1 has tasks → row opens the drawer.
  await enterApp(page, { name: 'grant', id: '1', tab: 'tasks' })
  await page.goto('/')
  await expect(page.locator('.tabs button.on')).toHaveText('tasks')
  await page.locator('table.ledger tbody tr').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: /Mark complete|Reopen/ })).toBeVisible()
  await page.keyboard.press('Escape')

  // Grant 10 has no tasks → designed empty state with a real CTA.
  await enterApp(page, { name: 'grant', id: '10', tab: 'tasks' })
  await page.goto('/')
  await expect(page.getByText('No tasks on this award')).toBeVisible()
  await page.getByRole('button', { name: 'Add the first task' }).click()
  await expect(page.getByRole('dialog', { name: 'Create New Task' })).toBeVisible()
})
