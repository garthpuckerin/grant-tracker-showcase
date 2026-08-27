/* White-glove sweep — walks EVERY screen (each sidebar destination, all 15
 * grant details, every grant-detail tab) and reports two defect classes:
 *
 *  1. Text defects: negative day counts ("-259 d"), NaN, $NaN, Invalid Date,
 *     undefined/[object Object] leaking into rendered copy.
 *  2. Clickability: elements carrying a hover/row affordance (.row-h,
 *     .task-row, .insight-row, [role="button"]) whose computed cursor is not
 *     pointer — i.e. surfaces that LOOK interactive but aren't wired.
 *
 *   BASE_URL=https://… node scripts/whiteglove-sweep.mjs   (defaults to live)
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://garthpuckerin-grant-tracker.vercel.app';

const TEXT_DEFECTS = [
  ['negative day count', /(?<![\w.$%-])-\d+\s?d\b/],
  ['NaN', /(?<![a-zA-Z])NaN\b/],
  ['Invalid Date', /Invalid Date/],
  ['undefined', /\bundefined\b/],
  ['object Object', /\[object Object\]/],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  try {
    sessionStorage.setItem('gt2:entered:v1', 'true');
    localStorage.setItem('gt2:onboarded:v1', 'true');
  } catch (e) {}
});

const issues = [];
const note = (screen, what) => issues.push(`${screen}: ${what}`);

const settle = async () => {
  await page.waitForSelector('.sidebar-item', { timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(250);
};

const scan = async (screen) => {
  const { text, inert } = await page.evaluate(() => {
    const text = document.body.innerText;
    // Affordance audit: these selectors are the app's "this row/tile reacts"
    // vocabulary. Anything matching them must have a pointer cursor.
    const sels = '.row-h, .task-row, .insight-row, [role="button"], .metric[data-nav], .chart-hits button';
    const inert = [...document.querySelectorAll(sels)]
      .filter((el) => getComputedStyle(el).cursor !== 'pointer' && !el.disabled && el.getAttribute('aria-disabled') !== 'true')
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent || '').trim().slice(0, 40)}"`);
    return { text, inert };
  });
  for (const [label, re] of TEXT_DEFECTS) {
    const m = text.match(re);
    if (m) {
      const at = text.indexOf(m[0]);
      note(screen, `${label} → "…${text.slice(Math.max(0, at - 40), at + 30).replace(/\n/g, ' ⏎ ')}…"`);
    }
  }
  for (const el of [...new Set(inert)]) note(screen, `looks clickable but isn't: ${el}`);
};

const go = async (route) => {
  await page.addInitScript((r) => { try { localStorage.setItem('gt2-route', JSON.stringify(r)); } catch (e) {} }, route);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await settle();
};

// 1. Every sidebar destination, discovered from the shell itself.
await go({ name: 'dashboard' });
const destinations = await page.evaluate(() =>
  [...document.querySelectorAll('.sidebar-item')].map((el) => (el.textContent || '').trim().replace(/\d+$/, '').trim()),
);
for (const label of destinations) {
  await page.locator('.sidebar-item').filter({ hasText: label }).first().click();
  await page.waitForTimeout(400);
  await scan(`screen:${label}`);
  // Walk this screen's own tab strip too (Settings hid a dead button there).
  const tabNames = await page.evaluate(() => [...document.querySelectorAll('.tabs button')].map((b) => b.textContent.trim()));
  for (const t of tabNames.slice(1)) {
    await page.locator('.tabs button', { hasText: t }).first().click();
    await page.waitForTimeout(300);
    await scan(`screen:${label}:${t}`);
  }
}

// 2. All 15 grant details (default tab), then every tab on two representative
// awards (the flagship and a thin fixture-less one).
for (let id = 1; id <= 15; id++) {
  await go({ name: 'grant', id: String(id) });
  await scan(`grant:${id}`);
}
for (const id of ['1', '10']) {
  await go({ name: 'grant', id });
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.tabs button')].map((b) => b.textContent.trim()));
  for (const t of tabs) {
    await page.locator('.tabs button', { hasText: t }).first().click();
    await page.waitForTimeout(300);
    await scan(`grant:${id}:${t}`);
  }
}

// 3. The SF-425 detail (deep link) and month drill-down drawer.
await go({ name: 'sf425detail', filingId: 'sf1', gi: 0 });
await scan('sf425detail');
await go({ name: 'dashboard' });
const bar = page.locator('.chart-hits button').nth(5);
if (await bar.count()) {
  await bar.click();
  await page.waitForTimeout(300);
  await scan('month-drawer');
}

await browser.close();
console.log('');
if (issues.length === 0) console.log('✓ white-glove sweep clean');
else {
  console.log(`${issues.length} issue(s):`);
  issues.forEach((i) => console.log('  ✗ ' + i));
  process.exitCode = 1;
}
