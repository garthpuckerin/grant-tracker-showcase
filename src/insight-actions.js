// Shared insight → action mapping. One source for the Insights screen, the
// dashboard widget, and the grant-detail Grant Analysis card, so an agent
// signal always leads to the same place under the same verb.
//
// Contextual action labels (not a generic "Take action") — ported from the
// GrantTracker2.0-Demo AI insights widget, where per-insight verbs measurably
// clarified what clicking would do.

export const ACTION_TAB = {
  BUDGET: 'budget',
  OPTIMIZE: 'budget',
  COMPLIANCE: 'compliance',
  DEADLINE: 'tasks',
  WRITER: 'documents',
};

export const ACTION_LABEL = {
  BUDGET: 'Review budget',
  OPTIMIZE: 'See opportunity',
  COMPLIANCE: 'Review compliance',
  DEADLINE: 'Open tasks',
  WRITER: 'Open drafts',
};

/** Route an insight resolves to: the related grant's relevant tab, or the
 *  portfolio surface that owns the signal when no grant is attached. */
export const insightRoute = (i, grant) =>
  grant
    ? { name: 'grant', id: grant.id, grant, tab: ACTION_TAB[i.agent] || 'overview' }
    : { name: i.agent === 'WRITER' ? 'documents' : 'reports' };
