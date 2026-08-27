/* Mobile/tablet white-glove sweep — the defect classes the metric-level
 * viewport sweep missed (owner-caught on the reveal morning):
 *
 *  1. Nested scroll regions on phones — anything that scrolls inside the page
 *     (visible scrollbars on Windows, clipped content elsewhere). On phone
 *     tiers, tables must cardify, not x-scroll.
 *  2. Grids that stay multi-column at widths where they can't afford to.
 *  3. Bottom tab bar collisions — the mtab overlapping any other fixed/sticky
 *     surface, or coexisting with a hamburger affordance it supersedes.
 *  4. Sideways scroll (kept from the metric sweep — the page never pans).
 *
 *   BASE_URL=https://… node scripts/mobile-sweep.mjs   (defaults to live)
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://garthpuckerin-grant-tracker.vercel.app';

const VIEWPORTS = [
  ['phone-P', 375, 812, 'phone'],
  ['phone-P small', 360, 800, 'phone'],
  ['phone-L', 844, 390, 'phone-land'],
  ['tablet-P', 768, 1024, 'tablet'],
  ['tablet-L', 1024, 768, 'tablet'],
];

// Grid column budget per tier: more columns than this at this width is a
// finding unless the container is explicitly allowed below.
const MAX_COLS = { phone: 2, 'phone-land': 3, tablet: 4 };

// Containers allowed to keep columns (icon rows, twin stats, tab strips).
const GRID_ALLOW = ['onb-nav', 'pill-group', 'seg', 'chart-controls', 'mtab', 'bar-row'];

const browser = await chromium.launch();
const issues = [];
const note = (vp, screen, what) => issues.push(`${vp} · ${screen}: ${what}`);

for (const [vpName, width, height, tier] of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    isMobile: tier !== 'tablet',
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('gt2:entered:v1', 'true');
      localStorage.setItem('gt2:onboarded:v1', 'true');
    } catch (e) {}
  });

  const settle = async () => {
    await page.waitForSelector('.sidebar-item, .mtab-item', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(250);
  };

  const scan = async (screen) => {
    const r = await page.evaluate(({ tier, maxCols, allow }) => {
      const out = [];
      const vis = (el) => {
        const b = el.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) return false;
        const cs = getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      };
      const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`;

      // 4. Sideways scroll.
      if (document.documentElement.scrollWidth > innerWidth + 1) {
        out.push(`page pans sideways (${document.documentElement.scrollWidth} > ${innerWidth})`);
      }

      // 1. Nested scroll regions. The app's ONE scroll surface is .main (or
      // the page). Anything else that actually overflows is a finding on
      // phone tiers; on tablet, x-scroll tables are allowed but must carry
      // the .table-scroll contract.
      for (const el of document.querySelectorAll('*')) {
        if (!vis(el)) continue;
        const cs = getComputedStyle(el);
        const scrollsX = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2;
        const scrollsY = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2;
        const isMain = el.classList.contains('main') || el === document.documentElement || el === document.body;
        const isDrawerOrModal = el.closest('.drawer-panel, .modal-card, [role="dialog"], .onb-card');
        const isNav = el.classList.contains('sidebar');
        if (isMain || isDrawerOrModal || isNav) continue;
        const sanctionedTable = el.classList.contains('table-scroll') && tier !== 'phone';
        if (scrollsX && tier !== 'tablet' && !sanctionedTable) out.push(`x-scroll region on a phone tier: ${label(el)} (${el.scrollWidth}>${el.clientWidth})`);
        if (scrollsY) out.push(`nested y-scroll region: ${label(el)} (${el.scrollHeight}>${el.clientHeight})`);
      }

      // 2. Multi-column grids beyond the tier's budget.
      for (const el of document.querySelectorAll('*')) {
        if (!vis(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.display !== 'grid') continue;
        if (allow.some((c) => el.classList.contains(c))) continue;
        const tracks = cs.gridTemplateColumns.split(' ').map(parseFloat).filter((w) => w > 24);
        const cols = tracks.length;
        // A grid with one dominant flexible track (label · bar · value rows)
        // is row-shaped and fine; uniform cramped grids are the finding.
        const maxTrack = Math.max(0, ...tracks);
        const per = el.getBoundingClientRect().width / (cols || 1);
        if (cols > maxCols && maxTrack < 120) out.push(`${cols}-column grid at ${Math.round(per)}px/col: ${label(el)}`);
      }

      // 3. Bottom tab bar collisions.
      const mtab = document.querySelector('.mtab');
      if (mtab && vis(mtab)) {
        const mb = mtab.getBoundingClientRect();
        // 3a. A hamburger/menu affordance the tab bar supersedes.
        for (const el of document.querySelectorAll('button, [role="button"]')) {
          if (!vis(el) || mtab.contains(el)) continue;
          const t = (el.getAttribute('aria-label') || '') + ' ' + (el.className || '');
          if (/hamburger|menu|nav-open|burger/i.test(t)) out.push(`hamburger visible alongside the bottom tab bar: ${label(el)}`);
        }
        // 3b. Fixed/sticky elements overlapping the tab bar.
        for (const el of document.querySelectorAll('*')) {
          if (!vis(el) || el === mtab || mtab.contains(el) || el.contains(mtab)) continue;
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
          if (el.closest('.drawer-panel, .modal-card, [role="dialog"]')) continue;
          const b = el.getBoundingClientRect();
          const overlap = Math.min(b.bottom, mb.bottom) - Math.max(b.top, mb.top);
          const xOverlap = Math.min(b.right, mb.right) - Math.max(b.left, mb.left);
          if (overlap > 4 && xOverlap > 4 && +cs.zIndex <= (+getComputedStyle(mtab).zIndex || 0)) {
            out.push(`fixed element under/behind the tab bar: ${label(el)}`);
          } else if (overlap > 4 && xOverlap > 4) {
            out.push(`fixed element overlaps the tab bar: ${label(el)}`);
          }
        }
      }
      return out;
    }, { tier, maxCols: MAX_COLS[tier], allow: GRID_ALLOW });
    for (const w of [...new Set(r)]) note(vpName, screen, w);
  };

  const go = async (route) => {
    await page.addInitScript((r) => { try { localStorage.setItem('gt2-route', JSON.stringify(r)); } catch (e) {} }, route);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await settle();
  };

  // Every screen, by route injection (nav-interaction coverage lives in the
  // e2e suite; the sweep needs deterministic, fast state entry).
  const SCREENS = [
    'dashboard', 'grants', 'tasks', 'documents', 'insights', 'compliance',
    'reports', 'sf425', 'users', 'settings',
  ].map((name) => [`screen:${name}`, { name }]).concat([
    ['grant:1', { name: 'grant', id: '1' }],
    ['grant:1:budget', { name: 'grant', id: '1', tab: 'budget' }],
    ['sf425detail', { name: 'sf425detail', filingId: 'sf1', gi: 0 }],
  ]);
  for (const [name, route] of SCREENS) {
    await go(route);
    await scan(name);
  }

  await ctx.close();
}

await browser.close();
console.log('');
if (issues.length === 0) console.log('✓ mobile sweep clean across ' + VIEWPORTS.length + ' viewports');
else {
  console.log(`${issues.length} issue(s):`);
  issues.forEach((i) => console.log('  ✗ ' + i));
  process.exitCode = 1;
}
