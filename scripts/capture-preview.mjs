// Capture identity-clean preview media (screenshots + a paced walkthrough video)
// from the Grant Tracker (federal grant portfolio management demo). Run with the
// dev server up on :3300:
//   npm run dev   (in another shell)
//   PREVIEW_URL=http://localhost:3300 node scripts/capture-preview.mjs
//
// The walkthrough is a deliberate tour using only known-good selectors with
// short, explicit pauses for pacing. Optional flourishes use fail-fast timeouts
// so a missing selector can never freeze the recording. Every step has an
// explicit timeout and the process exits non-zero on any failure.
//
// After the 8 light-theme screens + walkthrough.webm, two showcase shots are
// captured in fresh video-free contexts: grant-tracker-dark.png (Dashboard in
// dark theme, seeded via localStorage before boot) and grant-tracker-mobile.png
// (390x844 with the nav drawer open). Theme/viewport overrides are isolated per
// context so they never leak into the light shots or the walkthrough.
import { chromium } from '@playwright/test'
import { mkdir, copyFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')
const mediaDir = path.resolve(repoRoot, 'media', 'grant-tracker')
const videoDir = path.resolve(mediaDir, 'video-raw')
const baseURL = process.env.PREVIEW_URL || 'http://localhost:3300'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Poll the dev server until it serves, fail fast if it never comes up.
async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  let lastErr
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) return
      lastErr = new Error(`status ${res.status}`)
    } catch (e) {
      lastErr = e
    }
    await wait(500)
  }
  throw new Error(`dev server not reachable at ${url} within ${timeoutMs}ms: ${lastErr?.message}`)
}

// Hard cap on the whole run so a stuck step can never hang CI/local forever.
function hardCap(ms) {
  return setTimeout(() => {
    console.error(`FATAL: capture exceeded hard cap of ${ms}ms — aborting`)
    process.exit(1)
  }, ms).unref?.() ?? setTimeout(() => process.exit(1), ms)
}

async function main() {
  hardCap(150000)
  await waitForServer(baseURL)

  await mkdir(mediaDir, { recursive: true })
  await mkdir(videoDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } },
  })
  context.setDefaultTimeout(8000) // hard cap: no step can hang the recording

  // Seed the light context before boot: theme=light + viz-color ON (so the
  // value-driven colored charts render) and a fresh route so we always start
  // on the Overview/Dashboard. Pre-paint scripts (applyStoredTheme / applyStoredViz)
  // pick these up on first paint — no flash, no toggle race.
  await context.addInitScript(() => {
    window.localStorage.setItem('gt2:theme:v1', 'light')
    window.localStorage.setItem('gt2:viz:v1', 'on')
    window.localStorage.removeItem('gt2-route')
  })

  const page = await context.newPage()

  const shot = async (name) => {
    await page.screenshot({ path: path.join(mediaDir, name), fullPage: false })
    console.log('  captured', name)
  }

  // Navigate via a sidebar item by its visible label. Fails fast (named) on miss.
  const nav = async (label) => {
    const item = page.locator('.sidebar-item', { hasText: label }).first()
    try {
      await item.click({ timeout: 8000 })
    } catch (e) {
      throw new Error(`sidebar nav "${label}" did not resolve/click within timeout: ${e.message}`)
    }
  }

  // Optional flourish: never throws, short timeout so it can't freeze the video.
  const optional = async (labelTxt, fn) => {
    try { await fn() } catch (e) { console.log(`  ~ optional "${labelTxt}" skipped: ${e.message}`) }
  }

  // ── 1. Overview / Dashboard (cover) ──────────────────────────────────────
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 15000 })
  // Confirm we are actually on the dashboard before shooting the cover.
  await page.locator('.sidebar-brand', { hasText: 'Grant Tracker' }).first().waitFor({ timeout: 10000 })
  await wait(1500)
  await shot('grant-tracker-dashboard.png')
  await optional('scroll overview', async () => { await page.mouse.wheel(0, 500); await wait(800); await page.mouse.wheel(0, -500) })
  await wait(700)

  // ── 2. Grants list ───────────────────────────────────────────────────────
  await nav('Grants')
  await wait(1300)
  await shot('grant-tracker-grants.png')
  await wait(700)

  // ── 3. Grant detail (click first ledger row) ─────────────────────────────
  await optional('grant detail', async () => {
    await page.locator('table.ledger tbody tr').first().click({ timeout: 6000 })
    await wait(1300)
    await shot('grant-tracker-grant-detail.png')
    await wait(700)
  })

  // ── 4. AI Insights ───────────────────────────────────────────────────────
  await nav('AI Insights')
  await wait(1300)
  await shot('grant-tracker-insights.png')
  await optional('scroll insights', async () => { await page.mouse.wheel(0, 500); await wait(900); await page.mouse.wheel(0, -500) })
  await wait(700)

  // ── 5. Compliance ────────────────────────────────────────────────────────
  await nav('Compliance')
  await wait(1300)
  await shot('grant-tracker-compliance.png')
  await wait(700)

  // ── 6. Reports ───────────────────────────────────────────────────────────
  await nav('Reports')
  await wait(1300)
  await shot('grant-tracker-reports.png')
  await wait(700)

  // ── 7. SF-425 Filings ────────────────────────────────────────────────────
  await nav('SF-425 Filings')
  await wait(1300)
  await shot('grant-tracker-sf425.png')
  await wait(700)

  // ── 8. Tasks ─────────────────────────────────────────────────────────────
  await nav('Tasks')
  await wait(1300)
  await shot('grant-tracker-tasks.png')
  await wait(700)

  // ── 9. Settings → Appearance (theme + color-coded-charts toggle) ─────────
  await nav('Settings')
  await wait(900)
  // Settings opens on the Workspace tab; switch to the Appearance tab so the
  // theme picker + color-coded-charts toggle are visible. Tabs carry role="tab".
  await page.locator('[role="tab"]', { hasText: 'Appearance' }).first().click({ timeout: 8000 })
  await wait(1100)
  await shot('grant-tracker-settings.png')
  await wait(700)

  // ── 10. Create New Grant modal (validated create-form) ───────────────────
  await nav('Grants')
  await wait(1000)
  // The "New Grant" action opens a modal-card dialog with the validated form.
  await page.locator('button.btn', { hasText: 'New Grant' }).first().click({ timeout: 8000 })
  await page.locator('.modal-card[role="dialog"]').first().waitFor({ timeout: 8000 })
  // Confirm the form title rendered before shooting.
  await page.locator('.modal-title', { hasText: 'Create New Grant' }).first().waitFor({ timeout: 8000 })
  await wait(1100)
  await shot('grant-tracker-new-grant.png')
  await wait(600)
  // Close the modal (Esc) so it doesn't bleed into the walkthrough wrap-up.
  await optional('close new-grant modal', async () => {
    await page.keyboard.press('Escape')
    await wait(500)
  })

  // ── Wrap up the walkthrough — close context to finalise video ─────────────
  const video = page.video()
  await context.close()
  if (video) {
    await copyFile(await video.path(), path.join(mediaDir, 'grant-tracker-walkthrough.webm'))
    console.log('  captured grant-tracker-walkthrough.webm')
  }
  await rm(videoDir, { recursive: true, force: true })

  // ── 9. Showcase shots (no video): dark theme + mobile drawer ─────────────
  // These run in fresh, video-free contexts so theme/viewport overrides cannot
  // leak into the walkthrough. Each step is timeout-bounded (fail-fast).

  // 9a. Dark-theme Dashboard. Seed localStorage BEFORE the app boots so
  // applyStoredTheme() picks it up on first paint (no flash, no toggle race).
  {
    const darkCtx = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    })
    darkCtx.setDefaultTimeout(8000)
    await darkCtx.addInitScript(() => {
      window.localStorage.setItem('gt2:theme:v1', 'dark')
      window.localStorage.setItem('gt2:viz:v1', 'on')
      window.localStorage.removeItem('gt2-route')
    })
    const darkPage = await darkCtx.newPage()
    await darkPage.goto(baseURL, { waitUntil: 'networkidle', timeout: 15000 })
    await darkPage.locator('.sidebar-brand', { hasText: 'Grant Tracker' }).first().waitFor({ timeout: 10000 })
    // Kill transitions/animations so the dark background can't lag behind a
    // light/intermediate frame at screenshot time.
    await darkPage.addStyleTag({
      content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
    })
    // Confirm the dark theme is *actually rendered* — not just the attribute.
    // Require both data-theme=dark AND a genuinely dark computed body background
    // (parse lightness for oklch/oklab, luma for rgb). Fail loudly on timeout so
    // we never ship a light frame mislabelled as "dark".
    await darkPage.waitForFunction(
      () => {
        const html = document.documentElement
        if (html.getAttribute('data-theme') !== 'dark') return false
        const bg = getComputedStyle(document.body).backgroundColor
        const m = bg.match(/[\d.]+/g)
        if (!m) return false
        if (bg.startsWith('oklch') || bg.startsWith('oklab')) return parseFloat(m[0]) < 0.4
        const [r, g, b] = m.map(Number)
        return 0.299 * r + 0.587 * g + 0.114 * b < 110
      },
      { timeout: 10000 },
    )
    await wait(1200)
    await darkPage.screenshot({ path: path.join(mediaDir, 'grant-tracker-dark.png'), fullPage: false })
    console.log('  captured grant-tracker-dark.png (dark background render confirmed)')
    await darkCtx.close()
  }

  // 9b. Mobile viewport with the nav DRAWER OPEN. Light theme, mobile size,
  // open the drawer via .nav-toggle, then wait for the slide-in transition to
  // settle (sidebar boundingBox.x >= 0) before shooting.
  {
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    })
    mobileCtx.setDefaultTimeout(8000)
    await mobileCtx.addInitScript(() => {
      window.localStorage.setItem('gt2:theme:v1', 'light')
      window.localStorage.setItem('gt2:viz:v1', 'on')
      window.localStorage.removeItem('gt2-route')
    })
    const mobilePage = await mobileCtx.newPage()
    await mobilePage.goto(baseURL, { waitUntil: 'networkidle', timeout: 15000 })
    await mobilePage.locator('.topbar .nav-toggle').first().waitFor({ timeout: 10000 })
    await mobilePage.locator('.topbar .nav-toggle').first().click({ timeout: 8000 })
    // Wait for the .open class, then for the transform transition to settle so
    // the drawer is fully on-screen (x >= 0) — not mid-slide.
    await mobilePage.locator('.sidebar.open').first().waitFor({ timeout: 8000 })
    await mobilePage.waitForFunction(
      () => {
        const el = document.querySelector('.sidebar.open')
        if (!el) return false
        return el.getBoundingClientRect().x >= 0
      },
      { timeout: 8000 },
    )
    await wait(350) // belt-and-suspenders: let any easing tail finish
    await mobilePage.screenshot({ path: path.join(mediaDir, 'grant-tracker-mobile.png'), fullPage: false })
    console.log('  captured grant-tracker-mobile.png (.sidebar.open, x>=0 confirmed)')
    await mobileCtx.close()
  }

  await browser.close()
  console.log('done →', mediaDir)
}

main().catch((e) => { console.error(e); process.exit(1) })
