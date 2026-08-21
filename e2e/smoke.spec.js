// Grant Tracker smoke test — proof-of-life (fixtures-only, zero network).
//
// A marketing-landing gate now precedes the app: on first visit the visitor
// sees a product-pitch hero, and "Launch demo" enters the app (persisted via
// localStorage key `gt2:entered:v1`). The smoke test seeds that flag before
// navigation so the app shell renders directly. A second test covers the
// landing itself, asserting it renders clean.
//
// Asserts (app):
//   1. The app shell renders with the "Grant Tracker" sidebar brand mark.
//   2. The sidebar workspace label "Workspace" is visible (stable fixture string).
//   3. ZERO browser console errors, ZERO page errors, ZERO failed network requests.
//
// Any failed request or console error is a genuine defect (residual backend
// coupling) — the assertion is intentionally strict and must not be weakened.

import { test, expect } from '@playwright/test'

// Attach the three strict error collectors to a page and return the arrays.
const collectErrors = (page) => {
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => {
    pageErrors.push(err.message)
  })
  page.on('requestfailed', request => {
    const url = request.url()
    if (!url.startsWith('about:') && !url.startsWith('chrome-extension:')) {
      failedRequests.push(`${request.method()} ${url} — ${request.failure()?.errorText}`)
    }
  })

  return { consoleErrors, pageErrors, failedRequests }
}

const assertZeroErrors = ({ consoleErrors, pageErrors, failedRequests }) => {
  expect(
    consoleErrors,
    `Console errors detected (${consoleErrors.length}): ${consoleErrors.join('; ')}`
  ).toHaveLength(0)
  expect(
    pageErrors,
    `Page errors detected (${pageErrors.length}): ${pageErrors.join('; ')}`
  ).toHaveLength(0)
  expect(
    failedRequests,
    `Failed network requests detected (${failedRequests.length}): ${failedRequests.join('; ')}`
  ).toHaveLength(0)
}

test('fixtures-only render with zero console/page/network errors', async ({ page }) => {
  const errors = collectErrors(page)

  // Seed the landing-gate flag BEFORE the app boots so the app shell renders
  // directly (the gate is bypassed for returning visitors). addInitScript runs
  // on every navigation in this context, before any page script.
  await page.addInitScript(() => {
    try { localStorage.setItem('gt2:entered:v1', 'true') } catch (e) {}
  })

  // Navigate to the app root
  await page.goto('/')

  // 1. App shell: brand mark is visible — .sidebar-brand .word always renders
  //    inside <Sidebar> which is unconditionally mounted in <App>; no auth gate,
  //    no async dependency. "Grant Tracker" is a unique, stable fixture string.
  await expect(
    page.locator('.sidebar-brand .word'),
    'Sidebar brand mark "Grant Tracker" should be visible'
  ).toBeVisible()

  await expect(page.locator('.sidebar-brand .word')).toContainText('Grant Tracker')

  // 2. Workspace section label — equally stable; confirms the shell is fully
  //    rendered and the correct app variant loaded (not a blank page or error
  //    fallback). The first .sidebar-section-label is always "Workspace".
  await expect(
    page.locator('.sidebar-section-label').first(),
    'Sidebar section label "Workspace" should be visible'
  ).toBeVisible()

  await expect(page.locator('.sidebar-section-label').first()).toContainText('Workspace')

  // 3. Strict error assertions — any entry here is a real defect
  assertZeroErrors(errors)
})

test('marketing landing renders with zero console/page/network errors', async ({ page }) => {
  const errors = collectErrors(page)

  // Fresh visitor — no seeded flag, so the landing gate is shown. The hero
  // headline and "Launch demo" CTA are stable, unconditional fixtures.
  await page.goto('/')

  await expect(
    page.locator('.landing-headline'),
    'Landing hero headline should be visible'
  ).toBeVisible()

  const launch = page.getByRole('button', { name: 'Launch demo' })
  await expect(launch, '"Launch demo" CTA should be visible').toBeVisible()

  // Clicking "Launch demo" enters the app shell (no reload required).
  await launch.click()
  await expect(page.locator('.sidebar-brand .word')).toContainText('Grant Tracker')

  assertZeroErrors(errors)
})
