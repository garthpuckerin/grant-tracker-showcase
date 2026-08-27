// node --test src/data-coherence.test.mjs
//
// The fixture dataset is authored in anchor-relative time: dates.js shifts every
// date by one constant offset so the 2026-05-17 authoring anchor lands on the
// real "today". These invariants therefore hold on EVERY viewing date — a
// violation here is a defect a visitor eventually sees. (An ACTIVE grant with
// "-259 d" remaining shipped once; this file is the derivation that replaces
// finding those one screen at a time.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATA } from './data.js';
import { TODAY_ISO } from './dates.js';

const DAY = 86_400_000;
const d = (iso) => new Date(String(iso).slice(0, 10) + 'T00:00:00');
const daysBetween = (a, b) => Math.round((d(b) - d(a)) / DAY);

test('every grant status is coherent with its period of performance', () => {
  for (const g of DATA.grants) {
    const label = `grant ${g.id} (${g.number})`;
    const years = daysBetween(g.start, g.end) / 365.25;
    assert.ok(Math.abs(years - g.totalYears) < 0.02,
      `${label}: period spans ${years.toFixed(2)}y for a ${g.totalYears}-year award`);
    assert.ok(g.year >= 1 && g.year <= g.totalYears, `${label}: year ${g.year} outside 1..${g.totalYears}`);
    assert.ok(g.spent >= 0 && g.spent <= g.budget, `${label}: spent outside [0, budget]`);
    if (g.status === 'ACTIVE') {
      assert.ok(g.start <= TODAY_ISO, `${label}: ACTIVE but starts in the future (${g.start})`);
      assert.ok(g.end > TODAY_ISO,
        `${label}: ACTIVE but period ended ${g.end} — would render negative days remaining`);
      const elapsed = daysBetween(g.start, TODAY_ISO) / 365.25;
      const expectedYear = Math.min(g.totalYears, Math.floor(elapsed) + 1);
      assert.equal(g.year, expectedYear,
        `${label}: labeled year ${g.year}, but ${elapsed.toFixed(2)}y elapsed puts today in year ${expectedYear}`);
    }
    if (g.status === 'DRAFT') {
      assert.equal(g.spent, 0, `${label}: DRAFT with expenditures`);
      assert.ok(g.start > TODAY_ISO, `${label}: DRAFT proposal whose period has already begun`);
    }
  }
});

test('the flagship grant reconciles: years, ledger, and derived FY labels', () => {
  const g = DATA.grants[0];
  assert.equal(g.years.length, g.totalYears);
  assert.equal(g.years.reduce((s, y) => s + y.spent, 0), g.spent,
    'masthead Expended must equal the per-year timeline');
  const cur = g.years.find((y) => y.n === g.year);
  assert.equal(g.lineItems.reduce((s, l) => s + l.budgeted, 0), cur.award,
    'line items must sum to the current-year award');
  assert.equal(g.lineItems.reduce((s, l) => s + l.spent, 0), cur.spent,
    'line items must sum to the current-year spent');
  const y0 = d(g.start).getFullYear();
  for (const y of g.years) {
    assert.equal(y.fy, `FY${String(y0 + y.n - 1).slice(-2)}`,
      `year ${y.n} FY label must track the re-anchored start`);
  }
});

test('tasks, documents, reallocations and filings sit inside their grant timelines', () => {
  const byId = new Map(DATA.grants.map((g) => [g.id, g]));
  for (const t of DATA.tasks) {
    const g = byId.get(t.grantId);
    assert.ok(g, `task ${t.id}: unknown grant ${t.grantId}`);
    // Proposal-prep tasks may precede the period; nothing lives far outside it.
    assert.ok(daysBetween(g.start, t.due) >= -365 && daysBetween(t.due, g.end) >= -240,
      `task ${t.id}: due ${t.due} far outside grant ${g.id}'s lifetime`);
  }
  for (const doc of DATA.documents) {
    const g = byId.get(doc.grantId);
    assert.ok(g, `document ${doc.id}: unknown grant`);
    assert.ok(doc.date <= TODAY_ISO, `document ${doc.id}: uploaded in the future (${doc.date})`);
    assert.ok(daysBetween(g.start, doc.date) >= -240,
      `document ${doc.id}: dated long before its award existed`);
  }
  for (const r of DATA.reallocations) {
    const g = byId.get(r.grantId);
    assert.ok(g, `reallocation ${r.id}: unknown grant`);
    assert.ok(r.requestedAt >= g.start && r.requestedAt <= TODAY_ISO,
      `reallocation ${r.id}: requested outside the period-to-date`);
    if (r.decidedAt) {
      assert.ok(r.decidedAt >= r.requestedAt && r.decidedAt <= TODAY_ISO,
        `reallocation ${r.id}: decided before it was requested, or in the future`);
    }
  }
  for (const f of DATA.filings) {
    const g = DATA.grants[f.gi];
    assert.ok(g, `filing ${f.id}: gi ${f.gi} out of range`);
    assert.match(f.period, /^FY\d{2} (ANNUAL|FINAL|Q[1-4])$/, `filing ${f.id}: malformed period "${f.period}"`);
    assert.ok(f.due > g.start, `filing ${f.id}: due before its grant began`);
    if (f.status === 'COMPLETE') {
      assert.ok(f.certifiedAt && f.certifiedAt <= TODAY_ISO, `filing ${f.id}: certified in the future`);
    } else {
      assert.ok(f.due >= TODAY_ISO,
        `filing ${f.id}: ${f.status} but already ${daysBetween(f.due, TODAY_ISO)} days past due`);
    }
  }
});

test('narrative fixtures carry no absolute calendar dates (they go stale)', () => {
  const MONTH_DAY = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/;
  const texts = [
    ...DATA.insights.flatMap((i) => [i.title, i.body]),
    ...DATA.compliance.findings.flatMap((f) => [f.title, f.note]),
    ...DATA.tasks.flatMap((t) => [t.title, t.desc]),
  ];
  for (const s of texts) {
    assert.ok(!MONTH_DAY.test(s), `hardcoded calendar date in fixture prose: "${s}"`);
  }
});

test('the trailing-12 series has 12 positive months ending at the current month', () => {
  assert.equal(DATA.monthly.length, 12);
  for (const m of DATA.monthly) {
    assert.ok(m.v > 0 && typeof m.m === 'string' && m.m.length === 3, `bad month entry ${JSON.stringify(m)}`);
  }
  const now = new Date();
  assert.equal(DATA.monthly[11].m, now.toLocaleDateString('en-US', { month: 'short' }));
});
