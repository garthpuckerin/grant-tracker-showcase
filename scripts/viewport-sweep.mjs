/* Viewport sweep — measures the key screens across the real device matrix and
 * reports layout defects: sideways scroll, wrong nav tier, nav items that
 * overflow the viewport unreachably, tall top bars, modals/drawers that don't
 * fit, bottom-bar overlap.
 *
 *   BASE_URL=https://… node scripts/viewport-sweep.mjs   (defaults to live)
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://garthpuckerin-grant-tracker.vercel.app';

const VIEWPORTS = [
  ['phone-P small', 360, 800], ['phone-P', 390, 844], ['phone-P max', 430, 932],
  ['phone-L SE', 667, 375], ['phone-L', 844, 390], ['phone-L max', 932, 430],
  ['tablet-P', 768, 1024], ['tablet-P big', 834, 1194], ['tablet-L', 1024, 768], ['tablet-L big', 1194, 834],
  ['laptop short', 1280, 720], ['laptop', 1366, 768], ['laptop 125%', 1536, 864],
  ['desktop FHD', 1920, 1080], ['desktop QHD', 2560, 1440],
];

const SCREENS = [
  ['dashboard', { name: 'dashboard' }],
  ['budget', { name: 'grant', id: '1', tab: 'budget' }],
  ['sf425', { name: 'sf425detail', filingId: 'sf1', gi: 0, period: 'FY25 ANNUAL', type: 'Annual', status: 'IN_PROGRESS', due: '2026-06-15' }],
  ['reports', { name: 'reports' }],
  ['tasks', { name: 'tasks' }],
];

const browser = await chromium.launch();
const issues = [];
const note = (vp, screen, what) => issues.push(`${vp} · ${screen}: ${what}`);

for (const [vpName, width, height] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('gt2:entered:v1', 'true');
      localStorage.setItem('gt2:onboarded:v1', 'true');
    } catch (e) {}
  });

  for (const [scrName, route] of SCREENS) {
    await page.addInitScript((r) => { try { localStorage.setItem('gt2-route', JSON.stringify(r)); } catch (e) {} }, route);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.sidebar-item, .mtab-item', { timeout: 10000 }).catch(() => note(vpName, scrName, 'shell never rendered'));
    // Past the 500ms boot skeleton (it carries aria-busy="true") — measuring
    // the skeleton produced false sideways-scroll readings.
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);

    const m = await page.evaluate(() => {
      const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: b.x, y: b.y, w: b.width, h: b.height, bottom: b.bottom, display: cs.display, position: cs.position, overflowY: cs.overflowY }; };
      const items = [...document.querySelectorAll('.sidebar-item')];
      const lastItem = items.length ? items[items.length - 1].getBoundingClientRect() : null;
      const user = document.querySelector('.sidebar-user');
      return {
        vw: innerWidth, vh: innerHeight,
        scrollW: document.documentElement.scrollWidth,
        sidebar: r('.sidebar'), mtab: r('.mtab'), topbar: r('.topbar'),
        lastNavBottom: lastItem ? lastItem.bottom : null,
        userBottom: user ? user.getBoundingClientRect().bottom : null,
        sidebarOverflowY: r('.sidebar')?.overflowY,
        mainPadBottom: parseFloat(getComputedStyle(document.querySelector('.main-inner')).paddingBottom),
      };
    });

    if (m.scrollW > m.vw + 1) note(vpName, scrName, `sideways scroll (${m.scrollW} > ${m.vw})`);
    const railTier = width >= 600 && width <= 1023;
    const phoneTier = width < 600;
    if (phoneTier && (!m.mtab || m.mtab.display === 'none')) note(vpName, scrName, 'phone tier without bottom tabs');
    if (railTier && m.sidebar && Math.round(m.sidebar.w) !== 68) note(vpName, scrName, `rail tier but sidebar ${Math.round(m.sidebar.w)}px`);
    if (!phoneTier && m.mtab && m.mtab.display !== 'none') note(vpName, scrName, 'bottom tabs above the phone tier');
    if (m.topbar && m.topbar.h > 64) note(vpName, scrName, `top bar ${Math.round(m.topbar.h)}px tall`);
    // Nav reachability: every nav item + the user block must be reachable —
    // within the viewport, or the sidebar itself must scroll.
    if (!phoneTier && m.lastNavBottom != null) {
      const reachable = (m.userBottom ?? m.lastNavBottom) <= m.vh + 1 || m.sidebarOverflowY === 'auto' || m.sidebarOverflowY === 'scroll';
      if (!reachable) note(vpName, scrName, `nav overflows viewport unreachably (user block bottom ${Math.round(m.userBottom ?? m.lastNavBottom)} > ${m.vh}, sidebar overflow-y ${m.sidebarOverflowY})`);
    }
    if (phoneTier && m.mtab && m.mainPadBottom < m.mtab.h) note(vpName, scrName, `content bottom padding ${m.mainPadBottom}px < tab bar ${Math.round(m.mtab.h)}px`);
  }

  // Modal fit: open the reallocation request on the budget screen.
  await page.addInitScript((r) => { try { localStorage.setItem('gt2-route', JSON.stringify(r)); } catch (e) {} }, { name: 'grant', id: '1', tab: 'budget' });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const opened = await page.getByRole('button', { name: /Reallocate funds/ }).click({ timeout: 5000 }).then(() => true).catch(() => false);
  if (opened) {
    await page.waitForTimeout(200);
    const mm = await page.evaluate(() => {
      const card = document.querySelector('.modal-card'); if (!card) return null;
      const b = card.getBoundingClientRect(); const body = document.querySelector('.modal-body');
      return { h: b.height, top: b.top, bottom: b.bottom, vh: innerHeight, bodyScrolls: body ? getComputedStyle(body).overflowY : null };
    });
    if (!mm) note(vpName, 'modal', 'reallocation modal did not open');
    else if ((mm.bottom > mm.vh + 1 || mm.top < -1) && !['auto', 'scroll'].includes(mm.bodyScrolls)) note(vpName, 'modal', `modal ${Math.round(mm.h)}px doesn't fit ${mm.vh}px and body doesn't scroll (overflow ${mm.bodyScrolls})`);
  } else note(vpName, 'modal', 'could not open reallocation modal (control not reachable)');

  // Drawer fit: open a task drawer on tasks.
  await page.addInitScript((r) => { try { localStorage.setItem('gt2-route', JSON.stringify(r)); } catch (e) {} }, { name: 'tasks' });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const row = await page.locator('.task-row').first().click({ timeout: 5000 }).then(() => true).catch(() => false);
  if (row) {
    await page.waitForTimeout(200);
    const dd = await page.evaluate(() => {
      const p = document.querySelector('.drawer-panel'); if (!p) return null;
      const b = p.getBoundingClientRect(); const body = document.querySelector('.drawer-body');
      return { w: b.width, h: b.height, vw: innerWidth, vh: innerHeight, bodyScrolls: body ? getComputedStyle(body).overflowY : null };
    });
    if (!dd) note(vpName, 'drawer', 'task drawer did not open');
    else {
      if (dd.h > dd.vh + 1) note(vpName, 'drawer', `drawer taller than viewport (${Math.round(dd.h)} > ${dd.vh})`);
      if (!['auto', 'scroll'].includes(dd.bodyScrolls)) note(vpName, 'drawer', `drawer body doesn't scroll (${dd.bodyScrolls})`);
    }
  } else note(vpName, 'drawer', 'could not open a task row');

  // Landing + onboarding fit (fresh visitor).
  const fresh = await ctx.newPage();
  // Context storage is shared, so clear the gate + once-ever tour flags for a
  // genuinely fresh visitor (otherwise the tour is correctly skipped).
  await fresh.addInitScript(() => { try { sessionStorage.removeItem('gt2:entered:v1'); localStorage.removeItem('gt2:onboarded:v1'); } catch (e) {} });
  await fresh.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const lm = await fresh.evaluate(() => {
    const cta = document.querySelector('.landing-cta');
    return { sideways: document.documentElement.scrollWidth > innerWidth + 1, cta: !!cta };
  });
  if (lm.sideways) note(vpName, 'landing', 'sideways scroll');
  if (!lm.cta) note(vpName, 'landing', 'CTA missing');
  const launched = await fresh.getByRole('button', { name: 'Launch demo' }).click({ timeout: 4000 }).then(() => true).catch(() => false);
  if (launched) {
    await fresh.waitForTimeout(250);
    const om = await fresh.evaluate(() => ({
      sideways: document.documentElement.scrollWidth > innerWidth + 1,
      tour: !!document.querySelector('.onb-card'),
      nextReachable: (() => { const b = [...document.querySelectorAll('.onb-nav button')].find((x) => /Next/.test(x.textContent)); if (!b) return false; return b.getBoundingClientRect().top < innerHeight + document.documentElement.scrollHeight; })(),
    }));
    if (om.sideways) note(vpName, 'onboarding', 'sideways scroll');
    if (!om.tour) note(vpName, 'onboarding', 'tour did not render');
  }
  await ctx.close();
}

await browser.close();
console.log('');
if (issues.length === 0) console.log('✓ viewport sweep clean across ' + VIEWPORTS.length + ' viewports');
else { console.log(`${issues.length} issue(s):`); issues.forEach((i) => console.log('  ✗ ' + i)); process.exitCode = 1; }
