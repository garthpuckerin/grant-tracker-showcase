// Signature-workflow e2e — the two workflows the demo is judged on, proven
// through the real UI (not mocked): RBAC-gated reallocation approval (incl. the
// permission-denied state and live budget re-derivation) and the cross-footing
// SF-425. Fixtures-only, zero network. Complements smoke.spec.js (which owns the
// strict zero-console/page/network-error assertion on load).
//
// The app persists its route in localStorage (`gt2-route`) and its landing gate
// in `gt2:entered:v1`; seeding both before boot lands us directly on the screen
// under test without clicking through the shell.

import { test, expect } from '@playwright/test'

const enterApp = async (page, route) => {
  await page.addInitScript((r) => {
    try {
      sessionStorage.setItem('gt2:entered:v1', 'true')
      if (r) localStorage.setItem('gt2-route', JSON.stringify(r))
    } catch (e) { /* private mode */ }
  }, route)
}

test('reallocation approval is RBAC-gated: PI is denied, Finance approves and the budget re-derives', async ({ page }) => {
  await enterApp(page, { name: 'grant', id: '1' })
  await page.goto('/')

  // Open the Budget tab (grant 1 carries the full line-item ledger + a pending
  // reallocation request).
  await page.getByRole('button', { name: 'budget', exact: true }).click()

  // Default acting role is Administrator → the pending request is actionable.
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible()
  // Baseline: EQUIPMENT is budgeted $50,000 before any in-session approval.
  await expect(page.getByText('$50,000').first()).toBeVisible()

  // Switch to the PI (Dr. Rodriguez) — the requester. Separation of duties
  // (2 CFR 200.303) must block approval and surface the permission-denied panel.
  await page.getByTitle(/Switch acting role/).click()
  await page.getByRole('menuitem').filter({ hasText: 'Rodriguez' }).click()
  await expect(page.getByText(/Permission required/i)).toBeVisible()
  await expect(page.getByText(/2 CFR 200\.303/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0)

  // Switch to Finance (Lisa Thompson) — a different reviewer, so approval is
  // permitted.
  await page.getByTitle(/Switch acting role/).click()
  await page.getByRole('menuitem').filter({ hasText: 'Thompson' }).click()
  const approve = page.getByRole('button', { name: 'Approve' })
  await expect(approve).toBeVisible()
  await approve.click()

  // The $8,000 SUPPLIES → EQUIPMENT transfer re-derives the ledger live:
  // EQUIPMENT budgeted becomes $58,000 and the queue drops to zero pending.
  await expect(page.getByText('$58,000').first()).toBeVisible()
  await expect(page.getByText('0 pending', { exact: false })).toBeVisible()
})

test('SF-425 report cross-foots to the grant budget and expenses', async ({ page }) => {
  await enterApp(page, {
    name: 'sf425detail', gi: 0, period: 'FY25 ANNUAL', type: 'Annual',
    status: 'IN_PROGRESS', due: '2026-06-15',
  })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /SF-425/ })).toBeVisible()

  // The live validator must report the report ties out, and the two tie-outs to
  // the budget screen must be present.
  await expect(page.getByText(/Ties out/i)).toBeVisible()
  await expect(page.getByText(/10e ties to grant Expended/)).toBeVisible()
  await expect(page.getByText(/10d ties to Total Award/)).toBeVisible()

  // Derived figures: 10d $1,250,000, 10e $262,500, 10g $287,500, 10h $962,500.
  await expect(page.getByText('$287,500').first()).toBeVisible()
  await expect(page.getByText('$962,500').first()).toBeVisible()
})
