// Breakpoint ladder e2e — the nav never stacks above the content at any width.
//   ≥1024  persistent sidebar, user-collapsible to the icon rail (persisted)
//   600–1023  auto icon rail; search collapses to an icon
//   <600   phone bottom tabs (mobile.spec.js covers the phone tier in depth)
// Derived from the vertical's evidence: 1024 is the published desktop floor
// (Salesforce, Blackbaud), 768 the tablet line (SLDS stacks tables), ~600 the
// compact/medium split (Material 3, Fluent drawer overlay).

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

const layout = (page) => page.evaluate(() => {
  const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), display: cs.display, position: cs.position } }
  return {
    vw: innerWidth,
    sideways: document.documentElement.scrollWidth > innerWidth,
    sidebar: r('.sidebar'), main: r('.main'), topbar: r('.topbar'),
    label: r('.sidebar-item .si-label'), searchToggle: r('.tb-search-toggle'), search: r('.tb-search'),
    mtab: r('.mtab'), collapse: r('.sidebar-collapse'), ledger: r('table.ledger'), card: r('.card'),
  }
})

test('1366 (laptop): persistent sidebar beside the content; no sideways scroll; collapse to rail persists across reload', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await enterApp(page, { name: 'grant', id: '1', tab: 'budget' })
  await page.goto('/')
  await page.getByRole('button', { name: 'budget', exact: true }).click()
  let L = await layout(page)
  expect(L.sideways).toBe(false)
  expect(L.sidebar.w).toBeGreaterThan(200)
  expect(L.main.x).toBe(L.sidebar.w)            // side by side, never stacked
  expect(L.label.display).not.toBe('none')
  expect(L.search.display).not.toBe('none')     // full search field at laptop width
  expect(L.mtab.display).toBe('none')

  // User collapses the nav → rail; preference survives a reload.
  await page.getByRole('button', { name: 'Collapse navigation' }).click()
  L = await layout(page)
  expect(L.sidebar.w).toBe(68)
  expect(L.label.display).toBe('none')
  await page.reload()
  await expect(page.locator('.sidebar-item').first()).toBeVisible()   // past the boot skeleton
  L = await layout(page)
  expect(L.sidebar.w).toBe(68)
  await page.getByRole('button', { name: 'Expand navigation' }).click()
  L = await layout(page)
  expect(L.sidebar.w).toBeGreaterThan(200)
})

test('1024 (desktop floor): sidebar + content side by side and the budget ledger fits its card', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await enterApp(page, { name: 'grant', id: '1', tab: 'budget' })
  await page.goto('/')
  await page.getByRole('button', { name: 'budget', exact: true }).click()
  const L = await layout(page)
  expect(L.sideways).toBe(false)
  expect(L.main.x).toBe(L.sidebar.w)
  expect(L.ledger.w).toBeLessThanOrEqual(L.card.w)   // no scroll-inside-card at the floor
})

test('820 (tablet): auto icon rail with tooltip labels, search collapses to an icon, no bottom bar', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await enterApp(page, { name: 'dashboard' })
  await page.goto('/')
  await expect(page.locator('.sidebar-item').first()).toBeVisible()   // past the boot skeleton
  const L = await layout(page)
  expect(L.sideways).toBe(false)
  expect(L.sidebar.w).toBe(68)
  expect(L.main.x).toBe(68)                      // rail beside content, not above it
  expect(L.label.display).toBe('none')
  expect(L.mtab.display).toBe('none')
  expect(L.collapse.display).toBe('none')        // auto-rail: no manual toggle
  await expect(page.locator('.sidebar-item').first()).toHaveAttribute('data-label', 'Overview')
  // Search is an icon; opening it adds the field as its own row, with a close control.
  expect(L.searchToggle.display).not.toBe('none')
  expect(L.search.display).toBe('none')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('.tb-search')).toBeVisible()
  await expect(page.locator('.tb-search input')).toBeFocused()
  await page.getByRole('button', { name: 'Close search' }).click()
  await expect(page.locator('.tb-search')).toBeHidden()
  // The top bar is a single 56px band (no stacked menu).
  expect((await layout(page)).topbar.h).toBeLessThanOrEqual(60)
})

test('600 (rail floor) and 599 (phone): the nav switches from rail to bottom tabs exactly at the tier line', async ({ page }) => {
  await enterApp(page, { name: 'dashboard' })
  await page.setViewportSize({ width: 600, height: 900 })
  await page.goto('/')
  await expect(page.locator('.sidebar-item').first()).toBeVisible()   // past the boot skeleton
  let L = await layout(page)
  expect(L.sidebar.w).toBe(68)
  expect(L.mtab.display).toBe('none')
  await page.setViewportSize({ width: 599, height: 900 })
  L = await layout(page)
  expect(L.mtab.display).not.toBe('none')
  expect(L.mtab.position).toBe('fixed')
  expect(L.sideways).toBe(false)
})

test('844×390 (phone landscape): the rail nav is reachable and the reallocation modal fits with a scrolling body', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await enterApp(page, { name: 'grant', id: '1', tab: 'budget' })
  await page.goto('/')
  await expect(page.locator('.sidebar-item').first()).toBeVisible()

  // Every nav destination is reachable: the rail scrolls within the viewport.
  const nav = await page.evaluate(() => {
    const sb = document.querySelector('.sidebar')
    return { overflowY: getComputedStyle(sb).overflowY, scrollable: sb.scrollHeight > sb.clientHeight, vh: innerHeight }
  })
  expect(nav.overflowY).toBe('auto')
  await page.evaluate(() => { const sb = document.querySelector('.sidebar'); sb.scrollTop = sb.scrollHeight })
  const settingsVisible = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.sidebar-item')]
    const last = items[items.length - 1].getBoundingClientRect()
    return last.bottom <= innerHeight + 1
  })
  expect(settingsVisible).toBe(true)

  // The reallocation modal fits the short viewport and its body scrolls.
  await page.getByRole('button', { name: 'budget', exact: true }).click()
  await page.getByRole('button', { name: /Reallocate funds/ }).click()
  const modal = await page.evaluate(() => {
    const card = document.querySelector('.modal-card')
    const body = document.querySelector('.modal-body')
    const b = card.getBoundingClientRect()
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight, bodyOverflow: getComputedStyle(body).overflowY }
  })
  expect(modal.top).toBeGreaterThanOrEqual(-1)
  expect(modal.bottom).toBeLessThanOrEqual(modal.vh + 1)
  expect(modal.bodyOverflow).toBe('auto')
  // The submit action is reachable by scrolling the modal body.
  await expect(page.getByRole('button', { name: 'Submit request' })).toBeVisible()
})

test('shell rules align and the role switcher opens fully visible in the rail', async ({ page }) => {
  for (const width of [1366, 820]) {
    await page.setViewportSize({ width, height: 900 })
    await enterApp(page, { name: 'dashboard' })
    await page.goto('/')
    await expect(page.locator('.sidebar-item').first()).toBeVisible()
    const rules = await page.evaluate(() => ({
      brand: Math.round(document.querySelector('.sidebar-brand').getBoundingClientRect().bottom),
      topbar: Math.round(document.querySelector('.topbar').getBoundingClientRect().bottom),
    }))
    expect(rules.brand).toBe(rules.topbar)
  }

  // Rail tier: the switcher menu opens on-screen and actually switches roles.
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/')
  await expect(page.locator('.sidebar-item').first()).toBeVisible()
  await page.getByTitle(/Switch acting role/).click()
  const menu = page.locator('.sidebar-user [role="menu"]')
  await expect(menu).toBeVisible()
  const box = await menu.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(820)
  expect(box.y + box.height).toBeLessThanOrEqual(1180)
  await page.getByRole('menuitem').filter({ hasText: 'Thompson' }).click()
  await expect(page.locator('.sidebar-user')).toContainText('LT')

  // Short-height rail (the clipping case): menu still fully visible.
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/')
  await expect(page.locator('.sidebar-item').first()).toBeVisible()
  await page.getByTitle(/Switch acting role/).click()
  await expect(menu).toBeVisible()
  const box2 = await menu.boundingBox()
  expect(box2.y).toBeGreaterThanOrEqual(0)
  expect(box2.y + box2.height).toBeLessThanOrEqual(390)
})
