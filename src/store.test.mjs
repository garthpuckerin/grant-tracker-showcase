// node --test src/store.test.mjs — store mutations are immutable and notify.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getState, updateTask, requestReallocation, decideReallocation, computeCategoryDeltas } from './store.js';

test('updateTask patches one task immutably and notifies subscribers', () => {
  const before = getState().tasks;
  const target = before.find((t) => t.status !== 'COMPLETE');
  const untouched = before.find((t) => t.id !== target.id);

  updateTask(target.id, { status: 'COMPLETE' });

  const after = getState().tasks;
  assert.notEqual(after, before, 'tasks array identity must change');
  assert.equal(after.find((t) => t.id === target.id).status, 'COMPLETE');
  assert.equal(before.find((t) => t.id === target.id).status, target.status, 'original record not mutated');
  assert.equal(after.find((t) => t.id === untouched.id), untouched, 'other records keep identity');
});

test('a reallocation moves budget only after approval, and never for a denial', () => {
  const deltasBefore = computeCategoryDeltas(getState().reallocations, '1');
  const r = requestReallocation({ grantId: '1', fromCat: 'TRAVEL', toCat: 'SUPPLIES', amount: 1000, reason: 'test' }, 'u2');
  assert.equal(r.status, 'PENDING');
  assert.deepEqual(computeCategoryDeltas(getState().reallocations, '1'), deltasBefore, 'a pending request has no budget effect');

  decideReallocation(r.id, 'DENIED', 'u5');
  const denied = getState().reallocations.find((x) => x.id === r.id);
  assert.equal(denied.status, 'DENIED');
  assert.equal(denied.applied, false, 'denied transfer is never applied');

  const r2 = requestReallocation({ grantId: '1', fromCat: 'TRAVEL', toCat: 'SUPPLIES', amount: 1000, reason: 'test' }, 'u2');
  decideReallocation(r2.id, 'APPROVED', 'u5');
  const d = computeCategoryDeltas(getState().reallocations, '1');
  assert.equal(d['TRAVEL'] <= -1000, true, 'approved transfer debits the source');
  assert.equal(d['SUPPLIES'] >= 1000, true, 'approved transfer credits the destination');
});
