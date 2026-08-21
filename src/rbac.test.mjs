// node --test src/rbac.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLES,
  canRequestReallocation,
  canDecideReallocation,
  requestDeniedReason,
  decideDeniedReason,
} from './rbac.js';

const admin = { id: 'u1', role: ROLES.ADMIN };
const piOwner = { id: 'u2', role: ROLES.PI };
const piOther = { id: 'u3', role: ROLES.PI };
const finance = { id: 'u5', role: ROLES.FINANCE };
const grant = { id: '1', pi: { id: 'u2' } };

test('requesting: admin may request on any grant', () => {
  assert.equal(canRequestReallocation(admin, grant), true);
});

test('requesting: PI may request only on grants they lead', () => {
  assert.equal(canRequestReallocation(piOwner, grant), true);
  assert.equal(canRequestReallocation(piOther, grant), false);
});

test('requesting: finance may not originate a request', () => {
  assert.equal(canRequestReallocation(finance, grant), false);
  assert.match(requestDeniedReason(finance, grant), /Finance reviews and approves/);
});

test('deciding: finance and admin may approve a PI-originated request', () => {
  const req = { id: 'r1', requestedBy: 'u2', status: 'PENDING' };
  assert.equal(canDecideReallocation(finance, req), true);
  assert.equal(canDecideReallocation(admin, req), true);
});

test('deciding: a PI may not approve reallocations', () => {
  const req = { id: 'r1', requestedBy: 'u3', status: 'PENDING' };
  assert.equal(canDecideReallocation(piOwner, req), false);
  assert.match(decideDeniedReason(piOwner, req), /2 CFR 200\.308/);
});

test('deciding: no one may approve their own request (separation of duties)', () => {
  // Admin normally can decide, but not their OWN request.
  const ownReq = { id: 'r9', requestedBy: 'u1', status: 'PENDING' };
  assert.equal(canDecideReallocation(admin, ownReq), false);
  assert.match(decideDeniedReason(admin, ownReq), /separation of duties/i);
});

test('deciding: null/undefined user is always denied', () => {
  assert.equal(canDecideReallocation(null, { requestedBy: 'x' }), false);
  assert.equal(canRequestReallocation(undefined, grant), false);
});
