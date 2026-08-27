// Surface capability tier — the FEATURE half of the responsive contract.
// Layout tiers decide how things render; this decides what belongs at all.
//
// Grant-space products (Workday Grants, Kuali, Cayuse) converge on the same
// mobile scope: approvals, alerts, worklist triage, glanceable monitoring,
// lookup, document viewing. Authoring — grant creation, budget line items,
// report building, filings setup, exports, member administration — is a
// workstation activity, and the good products omit it on companion surfaces
// rather than shrinking it.
//
// Signature ACTIONS stay on every surface: approve/deny a reallocation,
// certify a filing, complete a task, resolve a finding, request a
// reallocation, dismiss/run agent signals.
import React from 'react';

const QUERY = '(min-width: 1024px)';

/** True on workstation widths (≥1024px) — where authoring affordances live. */
export function useWorkstation() {
  const get = () => (typeof window === 'undefined' ? true : window.matchMedia(QUERY).matches);
  const [on, setOn] = React.useState(get);
  React.useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setOn(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return on;
}
