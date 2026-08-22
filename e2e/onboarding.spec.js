// First-run onboarding e2e — the tour orients a non-expert and sets the role.

import { test, expect } from '@playwright/test'

test('first entry runs the tour; the role choice sets the acting identity; "Show me" deep-links; it never re-nags on reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Launch demo' }).click()

  const tour = page.getByRole('dialog', { name: 'Welcome tour' })
  await expect(tour).toBeVisible()
  await expect(tour.getByText('Step 1 of 4')).toBeVisible()

  // Choose Finance — the signature first-run choice.
  await tour.getByRole('radio', { name: /Finance \/ Sponsored Programs/ }).click()
  await expect(tour.getByText(/Viewing as Lisa Thompson/)).toBeVisible()

  // Domain orientation: the real award figures and the glossary.
  await tour.getByRole('button', { name: 'Next' }).click()
  await expect(tour.getByText('Step 2 of 4')).toBeVisible()
  await expect(tour.getByText('$1.25M')).toBeVisible()
  await expect(tour.getByText('SF-425', { exact: true })).toBeVisible()

  // "Show me" the reallocation workflow → lands on grant 1's Budget tab as Finance,
  // where the pending request is actionable.
  await tour.getByRole('button', { name: 'Next' }).click()
  await expect(tour.getByText('Step 3 of 4')).toBeVisible()
  await tour.getByRole('button', { name: 'Show me' }).first().click()
  await expect(page.locator('.tabs button.on')).toHaveText('budget')
  await expect(page.locator('.sidebar-user')).toContainText('Lisa Thompson')
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible()

  // Once-ever: a reload lands straight in the app.
  await page.reload()
  await expect(page.getByRole('dialog', { name: 'Welcome tour' })).toHaveCount(0)
  await expect(page.locator('.sidebar-brand .word')).toContainText('Grant Tracker')
})

test('sign-out replays landing → tour, and Help can replay the tour on demand', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('gt2:entered:v1', 'true')
      localStorage.setItem('gt2:onboarded:v1', 'true')
    } catch (e) {}
  })
  await page.goto('/')
  await expect(page.locator('.sidebar-brand .word')).toContainText('Grant Tracker')

  // Help → Replay the welcome tour.
  await page.getByRole('button', { name: 'Help' }).click()
  await page.getByRole('button', { name: 'Replay the welcome tour' }).click()
  await expect(page.getByRole('dialog', { name: 'Welcome tour' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip the tour' }).click()
  await expect(page.locator('.sidebar-brand .word')).toContainText('Grant Tracker')

  // Sign out clears BOTH flags: landing first, then the tour again.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Launch demo' })).toBeVisible()
  await page.getByRole('button', { name: 'Launch demo' }).click()
  await expect(page.getByRole('dialog', { name: 'Welcome tour' })).toBeVisible()
})
