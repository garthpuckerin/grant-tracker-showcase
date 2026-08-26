// node --test src/allocate.test.mjs — the month drill-down must cross-foot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateMonth } from './allocate.js';

const grants = [
  { id: '1', status: 'ACTIVE', spent: 262500 },
  { id: '2', status: 'ACTIVE', spent: 130000 },
  { id: '3', status: 'ACTIVE', spent: 90210 },
  { id: '7', status: 'DRAFT', spent: 0 },
  { id: '9', status: 'CLOSED', spent: 50000 },
];

test('rows sum exactly to the month total (awkward totals included)', () => {
  for (const total of [32400, 41237, 9999, 30001, 7]) {
    const rows = allocateMonth(total, grants);
    assert.equal(rows.reduce((s, r) => s + r.amount, 0), Math.round(total), `total ${total}`);
  }
});

test('only ACTIVE awards with burn participate', () => {
  const rows = allocateMonth(30000, grants);
  assert.deepEqual(rows.map((r) => r.grant.id).sort(), ['1', '2', '3']);
});

test('deterministic and proportional (largest burn gets the largest slice)', () => {
  const a = allocateMonth(32400, grants);
  const b = allocateMonth(32400, grants);
  assert.deepEqual(a, b);
  assert.equal(a[0].grant.id, '1');
  assert.ok(a[0].amount > a[1].amount && a[1].amount > a[2].amount);
});

test('shares sum to 1 and empty inputs return no rows', () => {
  const rows = allocateMonth(32400, grants);
  assert.ok(Math.abs(rows.reduce((s, r) => s + r.share, 0) - 1) < 1e-9);
  assert.deepEqual(allocateMonth(0, grants), []);
  assert.deepEqual(allocateMonth(1000, []), []);
});
