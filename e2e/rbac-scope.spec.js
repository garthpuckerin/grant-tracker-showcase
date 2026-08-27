// RBAC read-scope e2e — switching the acting role re-scopes what the
// workspace SHOWS, not just which actions are allowed (rbac.js gates those).
// A PI sees only the awards they lead: list, counts, dashboard, insights,
// admin surfaces, and deep links.

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

const actAs = async (page, name) => {
  await page.getByTitle(/Switch acting role/).click()
  await page.getByRole('menuitem').filter({ hasText: name }).click()
}

test('a PI sees only the awards they lead — everywhere', async ({ page }) => {
  await enterApp(page, { name: 'dashboard' })
  await page.goto('/')

  // Oversight baseline (Admin): full portfolio.
  await expect(sidebarCount(page, 'Grants')).toHaveText('15')
  await expect(page.locator('h1')).toContainText('Demo')
  await expect(page.locator('.sidebar-item').filter({ hasText: 'Members' })).toHaveCount(1)

  // Act as Dr. Rodriguez (PI): every count and figure re-scopes live.
  await actAs(page, 'Rodriguez')
  await expect(sidebarCount(page, 'Grants')).toHaveText('5')
  await expect(sidebarCount(page, 'AI Insights')).toHaveText('4')
  await expect(sidebarCount(page, 'Tasks')).toHaveText('3')
  await expect(page.locator('h1')).toContainText('James')
  // Admin surfaces leave the nav (2 CFR 200.303 least-privilege).
  await expect(page.locator('.sidebar-item').filter({ hasText: 'Members' })).toHaveCount(0)
  await expect(page.locator('.sidebar-item').filter({ hasText: 'Settings' })).toHaveCount(0)

  // The grants list is their list, and says so.
  await page.locator('.sidebar-item').filter({ hasText: 'Grants' }).click()
  await expect(page.locator('table.ledger tbody tr.row-h')).toHaveCount(5)
  await expect(page.locator('.page-head .eyebrow')).toContainText('awards they lead')

  // Back to oversight: the portfolio returns.
  await actAs(page, 'Demo Administrator')
  await expect(sidebarCount(page, 'Grants')).toHaveText('15')
  await expect(page.locator('table.ledger tbody tr.row-h')).toHaveCount(15)
})

test('deep-linking to another PI\'s award shows the access notice, not the data', async ({ page }) => {
  // Grant 2 is Dr. Watson's. Open it as Admin, then switch to Rodriguez ON
  // the page — the guard re-derives reactively.
  await enterApp(page, { name: 'grant', id: '2' })
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Sustainable Energy')

  await actAs(page, 'Rodriguez')
  await expect(page.getByText('This award is outside your assignment')).toBeVisible()
  await expect(page.getByText(/led by Dr\. Emily Watson/)).toBeVisible()
  await expect(page.locator('h1')).toHaveCount(0)

  // Oversight restores access.
  await actAs(page, 'Thompson')
  await expect(page.locator('h1')).toContainText('Sustainable Energy')
})

test('the scoped expenditure chart still cross-foots with the month drawer', async ({ page }) => {
  await enterApp(page, { name: 'dashboard' })
  await page.goto('/')
  await actAs(page, 'Rodriguez')

  // Scoped bar → drawer: the drawer total equals the clicked (scoped) bar and
  // its rows — only Rodriguez's awards — sum to it exactly.
  const target = page.locator('.chart-hits button').nth(5)
  const label = await target.getAttribute('aria-label')
  const barValue = Number(label.match(/\$([\d,]+)/)[1].replace(/,/g, ''))
  await target.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const drawer = await page.evaluate(() => {
    const parse = (s) => Number(s.replace(/[^\d]/g, ''))
    const total = parse(document.querySelector('[data-month-total]').textContent)
    const rows = [...document.querySelectorAll('.drawer-body tbody tr')].map((tr) => tr.textContent)
    return { total, rows }
  })
  expect(drawer.total).toBe(barValue)
  // Every allocation row belongs to a Rodriguez award (never Watson's/Kim's).
  for (const r of drawer.rows) {
    expect(r).not.toContain('Sustainable Energy')
    expect(r).not.toContain('Cybersecurity in Healthcare')
  }
})
