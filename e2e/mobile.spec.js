// Mobile UI e2e — a phone gets a real mobile experience, not a reflowed
// desktop: bottom tab bar, labeled card-lists instead of tables, full-screen
// sheets, 44px targets. Runs at 375×812 with touch emulation.

import { test, expect } from '@playwright/test'

// Phone emulation on the installed Chromium (device presets default to WebKit).
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })

const enterApp = async (page, route) => {
  await page.addInitScript((r) => {
    try {
      sessionStorage.setItem('gt2:entered:v1', 'true')
      localStorage.setItem('gt2:onboarded:v1', 'true')
      if (r) localStorage.setItem('gt2-route', JSON.stringify(r))
    } catch (e) { /* private mode */ }
  }, route)
}

test('phones get a bottom tab bar; the sidebar is off-screen; More opens the full nav with the role switcher', async ({ page }) => {
  await enterApp(page, { name: 'dashboard' })
  await page.goto('/')
  const bar = page.getByRole('navigation', { name: 'Primary (mobile)' })
  await expect(bar).toBeVisible()
  await expect(bar.getByRole('button')).toHaveCount(5)
  await expect(page.locator('.nav-toggle')).toBeHidden()

  // Bottom tab → Tasks; the tab is current and the Tasks screen renders.
  await bar.getByRole('button', { name: /Tasks/ }).click()
  await expect(page.locator('h1')).toHaveText('Tasks.')
  await expect(bar.getByRole('button', { name: /Tasks/ })).toHaveAttribute('aria-current', 'page')

  // More → the full navigation sheet (sidebar drawer) with the role switcher.
  await bar.getByRole('button', { name: 'More' }).click()
  await expect(page.locator('.sidebar.open')).toBeVisible()
  await expect(page.getByTitle(/Switch acting role/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.sidebar.open')).toHaveCount(0)

  // No sideways page scroll anywhere on the dashboard.
  const sw = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(sw).toBeLessThanOrEqual(375)
})

test('Grants opens in the card view on a phone', async ({ page }) => {
  await enterApp(page, { name: 'grants' })
  await page.goto('/')
  await expect(page.locator('.pill-group button.on').filter({ hasText: 'Cards' })).toBeVisible()
})

test('ledger tables render as labeled cards, and a row opens a full-screen sheet', async ({ page }) => {
  await enterApp(page, { name: 'documents' })
  await page.goto('/')
  const table = page.locator('.table-scroll table.ledger').first()
  await expect(table).toBeVisible()
  await expect(table.locator('thead')).toBeHidden()
  // Cells carry their column header as a label (the observer stamps data-label).
  const typeCell = table.locator('td[data-label="Type"]').first()
  await expect(typeCell).toBeVisible()
  const label = await typeCell.evaluate((td) => getComputedStyle(td, '::before').content)
  expect(label).toContain('Type')

  // Tap a card → the detail sheet fills the viewport.
  await table.locator('tbody tr').first().click()
  const panel = page.locator('.drawer-panel')
  await expect(panel).toBeVisible()
  const box = await panel.boundingBox()
  expect(box.width).toBeGreaterThanOrEqual(370)
})

test('touch targets are at least 44px on phones', async ({ page }) => {
  // Tasks keeps its page-head actions on phones (the dashboard's authoring
  // buttons are workstation-only now — companion-surface contract).
  await enterApp(page, { name: 'tasks' })
  await page.goto('/')
  const btn = page.locator('.page-head .btn').first()
  await expect(btn).toBeVisible()
  const box = await btn.boundingBox()
  expect(box.height).toBeGreaterThanOrEqual(44)
  // (the first .tb-icon is the hamburger, deliberately hidden on phones)
  const icon = page.getByRole('button', { name: 'Help' })
  await expect(icon).toBeVisible()
  const ib = await icon.boundingBox()
  expect(ib.height).toBeGreaterThanOrEqual(44)
})

test('companion surface: authoring stays on the workstation; actions stay everywhere', async ({ page }) => {
  // Dashboard: no New Grant / Export on a phone.
  await enterApp(page, { name: 'dashboard' })
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Good morning')
  await expect(page.getByRole('button', { name: 'New Grant' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Export' })).toHaveCount(0)
  // Footers are desktop chrome — hidden on the mobile experience.
  await expect(page.locator('.colophon')).toBeHidden()

  // Budget tab: no ledger authoring — but the SIGNATURE mobile action
  // (approve/deny a reallocation) works end to end.
  await enterApp(page, { name: 'grant', id: '1', tab: 'budget' })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Add line item' })).toHaveCount(0)
  await expect(page.getByText('Ledger authoring is a workstation surface')).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.locator('.toast-flag')).toBeVisible()

  // Documents: view-only library on phones.
  await enterApp(page, { name: 'documents' })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Upload' })).toHaveCount(0)
  await expect(page.getByText('Uploads happen on the workstation build')).toBeVisible()
})

test('every navigation starts at the top; tab switches align the tab strip', async ({ page }) => {
  await enterApp(page, { name: 'dashboard' })
  await page.goto('/')
  await expect(page.locator('.mtab')).toBeVisible()

  // Scroll deep into the dashboard, then switch screens via the bottom bar —
  // the new screen must start at the top, not inherit the offset.
  await page.locator('.main').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.getByRole('navigation', { name: 'Primary (mobile)' }).getByRole('button', { name: /Grants/ }).click()
  await expect(page.locator('h1')).toHaveText('Grants.')
  const top = await page.locator('.main').evaluate((el) => el.scrollTop)
  expect(top).toBeLessThanOrEqual(1)

  // Grant detail: scroll to the bottom of Overview, switch to History — the
  // tab strip lands at (or near) the top of the viewport.
  await enterApp(page, { name: 'grant', id: '1' })
  await page.goto('/')
  await page.locator('.main').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await page.getByRole('button', { name: 'history', exact: true }).click()
  await page.waitForTimeout(300)
  const tabsTop = await page.locator('.tabs').evaluate((el) => Math.round(el.getBoundingClientRect().top))
  expect(tabsTop).toBeGreaterThanOrEqual(-2)
  expect(tabsTop).toBeLessThanOrEqual(140)
})
