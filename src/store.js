// Tiny in-memory store for optimistic, fixtures-only mutations.
//
// The base demo dataset (data.js) is an immutable module constant. To let the
// create-forms and the reallocation-approval workflow optimistically mutate rows
// that screens re-render with — without any persistence or network — we keep
// mutable working copies here, plus a minimal pub/sub so React can subscribe via
// useSyncExternalStore.
//
// Lists are replaced immutably (new array each time) so subscribers re-render.
// IMPORTANT: selectors must return referentially STABLE snapshots (a fresh
// filtered array every getSnapshot call would loop useSyncExternalStore). So we
// expose whole collections (stable until mutated) and let components filter in
// render — never inside the selector.
import React from 'react';
import { DATA } from './data.js';
import { isoFromToday } from './dates.js';

let state = {
  grants: DATA.grants,
  tasks: DATA.tasks,
  // Per-grant ad-hoc budget line items added through the form, keyed by grantId.
  lineItems: {},
  // Reallocation records (the RBAC-gated approval workflow).
  reallocations: DATA.reallocations,
  // Acting identity — which fixture user is "signed in". Drives the RBAC gate.
  // Default u1 = Demo Administrator.
  currentUserId: 'u1',
};

const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getState = () => state;

// Prepend a newly created grant (most-recent-first) immutably.
export const addGrant = (grant) => {
  state = { ...state, grants: [grant, ...state.grants] };
  emit();
};

// Prepend a newly created task immutably.
export const addTask = (task) => {
  state = { ...state, tasks: [task, ...state.tasks] };
  emit();
};

// Patch one task immutably (status, priority, assignee, due, title, desc…).
// Every consumer — task groups, stats, sidebar count, dashboard overdue copy,
// grant-detail task tab — subscribes to the store, so a completion re-derives
// everywhere at once.
export const updateTask = (id, patch) => {
  state = {
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  };
  emit();
};

// Append a budget line item under a given grant id immutably.
export const addLineItem = (grantId, item) => {
  const existing = state.lineItems[grantId] || [];
  state = {
    ...state,
    lineItems: { ...state.lineItems, [grantId]: [...existing, item] },
  };
  emit();
};

// ── Identity / RBAC ─────────────────────────────────────────────────────────
export const setCurrentUser = (id) => {
  if (id === state.currentUserId) return;
  state = { ...state, currentUserId: id };
  emit();
};

// ── Reallocation workflow ───────────────────────────────────────────────────
// Create a PENDING reallocation request (immutable prepend). `requestedBy` is
// the acting user's id. Not applied to the budget until approved.
export const requestReallocation = ({ grantId, fromCat, toCat, amount, reason }, requestedBy) => {
  const record = {
    id: 'r-' + Date.now(),
    grantId,
    fromCat,
    toCat,
    amount: Number(amount),
    reason,
    status: 'PENDING',
    requestedBy,
    requestedAt: isoFromToday(0),
    decidedBy: null,
    decidedAt: null,
    applied: false,
  };
  state = { ...state, reallocations: [record, ...state.reallocations] };
  emit();
  return record;
};

// Approve or deny a pending request immutably. On APPROVED we mark `applied`
// so the budget ledger re-derives (computeCategoryDeltas below). `decision` is
// 'APPROVED' | 'DENIED'; `deciderId` is the acting user's id.
export const decideReallocation = (id, decision, deciderId) => {
  state = {
    ...state,
    reallocations: state.reallocations.map((r) =>
      r.id === id
        ? {
            ...r,
            status: decision,
            decidedBy: deciderId,
            decidedAt: isoFromToday(0),
            applied: decision === 'APPROVED',
          }
        : r,
    ),
  };
  emit();
};

// Pure: net budget delta per category for a grant, from APPROVED+applied
// reallocations only. { [cat]: signedDollarDelta }. Seeded historical approvals
// (applied:false) are already reflected in data.js line-items, so they are
// excluded here to avoid double-counting.
export function computeCategoryDeltas(reallocations, grantId) {
  const deltas = {};
  for (const r of reallocations) {
    if (r.grantId !== grantId || r.status !== 'APPROVED' || !r.applied) continue;
    deltas[r.fromCat] = (deltas[r.fromCat] || 0) - r.amount;
    deltas[r.toCat] = (deltas[r.toCat] || 0) + r.amount;
  }
  return deltas;
}

// React hook: subscribe to the whole store. Selector keeps re-renders scoped.
export function useStore(selector = (s) => s) {
  return React.useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// Convenience hook: the acting user object (or Admin fallback).
export function useCurrentUser() {
  const id = useStore((s) => s.currentUserId);
  return DATA.users.find((u) => u.id === id) || DATA.users[0];
}
