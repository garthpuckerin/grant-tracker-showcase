// RBAC read-scope — the visibility half of rbac.js (which gates ACTIONS).
// 2 CFR 200.303 least-privilege: ADMIN and FINANCE hold portfolio-wide
// oversight; a PI sees only the awards they lead. Every screen derives its
// figures from these helpers so switching the acting role re-scopes the
// grants list, dashboard, tasks, documents, insights, findings, and filings
// together — from one place.
import { DATA } from './data.js';
import { allocateMonth } from './allocate.js';

const oversight = (user) => !user || user.role === 'ADMIN' || user.role === 'FINANCE';

export const visibleGrants = (user, grants = DATA.grants) =>
  oversight(user) ? grants : grants.filter((g) => g.pi.id === user.id);

export const canViewGrant = (user, grant) =>
  !!grant && (oversight(user) || grant.pi.id === user.id);

/** Scope any grant-keyed collection (tasks, documents, findings, …). */
export const scopeByGrant = (user, rows, grants = DATA.grants, key = 'grantId') => {
  if (oversight(user)) return rows;
  const ids = new Set(visibleGrants(user, grants).map((g) => g.id));
  return rows.filter((r) => ids.has(String(r[key])));
};

/** Insights: a PI sees signals on their awards; portfolio-level signals
 *  (grantId null) belong to the oversight roles. */
export const scopeInsights = (user, insights, grants = DATA.grants) => {
  if (oversight(user)) return insights;
  const ids = new Set(visibleGrants(user, grants).map((g) => g.id));
  return insights.filter((i) => i.grantId && ids.has(String(i.grantId)));
};

/** The monthly expenditure series a scoped viewer sees: each month's
 *  PORTFOLIO total is allocated across active awards (the same
 *  largest-remainder allocation the month drawer shows), then summed over
 *  the visible ones — so a scoped bar still cross-foots with the drawer to
 *  the dollar. `vAll` carries the portfolio total for the drawer. */
export const scopeMonthly = (user, monthly, grants = DATA.grants) => {
  if (oversight(user)) return monthly;
  const ids = new Set(visibleGrants(user, grants).map((g) => g.id));
  return monthly.map((m) => ({
    ...m,
    vAll: m.v,
    v: allocateMonth(m.v, grants)
      .filter((r) => ids.has(r.grant.id))
      .reduce((s, r) => s + r.amount, 0),
  }));
};
