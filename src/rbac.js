// Role-based access control for the reallocation-approval workflow.
//
// Pure, dependency-free permission logic so the same rules drive the UI gate,
// the disabled-control affordances, and the permission-denied panel. The demo's
// most differentiated workflow is federal budget reallocation, which under
// 2 CFR 200.308 requires sponsor/institution prior approval and a separation of
// duties between the requester (PI) and the approver (finance/sponsored
// programs). These functions encode exactly that so switching the acting role
// produces genuinely different, permission-correct views — not a cosmetic label.

export const ROLES = { ADMIN: 'ADMIN', PI: 'PI', FINANCE: 'FINANCE' };

// Human-facing role names for panels and menus.
export const ROLE_LABEL = {
  ADMIN: 'Administrator',
  PI: 'Principal Investigator',
  FINANCE: 'Finance / Sponsored Programs',
};

// Who may REQUEST a reallocation on a given grant?
//   ADMIN — any grant.
//   PI    — only grants they lead (separation of duties: a PI moves money on
//           their own award, then someone else approves it).
//   FINANCE — no; finance approves, it does not originate a PI's transfer.
export function canRequestReallocation(user, grant) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.PI) return !!grant && grant.pi?.id === user.id;
  return false;
}

// Who may DECIDE (approve/deny) a pending reallocation?
//   FINANCE / ADMIN — yes, EXCEPT the requester may never approve their own
//   request (2 CFR 200.303 internal controls / separation of duties). PI — no.
export function canDecideReallocation(user, realloc) {
  if (!user) return false;
  if (realloc && realloc.requestedBy === user.id) return false; // no self-approval
  return user.role === ROLES.ADMIN || user.role === ROLES.FINANCE;
}

// Who may CERTIFY and submit an SF-425? Under 2 CFR 200.415 the recipient's
// authorized official certifies the report — Finance / Sponsored Programs or
// an administrator, never the PI.
export function canCertifyReport(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN || user.role === ROLES.FINANCE;
}

export function certifyDeniedReason(user) {
  if (canCertifyReport(user)) return null;
  if (!user) return 'Sign in to certify this report.';
  return 'SF-425 certification requires an authorized official (Finance / Sponsored Programs) under 2 CFR 200.415. You are signed in as a Principal Investigator.';
}

// Why is a request action blocked for this user? Returns a short governance-aware
// reason for the permission-denied panel, or null when the action is allowed.
export function requestDeniedReason(user, grant) {
  if (canRequestReallocation(user, grant)) return null;
  if (!user) return 'Sign in to request a reallocation.';
  if (user.role === ROLES.FINANCE) {
    return 'Finance reviews and approves reallocations; requests originate with the grant’s PI.';
  }
  if (user.role === ROLES.PI) {
    return 'A PI may only request reallocations on awards they lead.';
  }
  return 'You do not have permission to request a reallocation.';
}

// Why is an approve/deny action blocked? Returns the reason, or null when allowed.
export function decideDeniedReason(user, realloc) {
  if (canDecideReallocation(user, realloc)) return null;
  if (!user) return 'Sign in to review this request.';
  if (realloc && realloc.requestedBy === user.id) {
    return 'You submitted this request. Under 2 CFR 200.303 separation of duties, it must be approved by a different reviewer.';
  }
  if (user.role === ROLES.PI) {
    return 'Reallocations require Finance or Sponsored Programs approval (2 CFR 200.308 prior approval). You are signed in as a Principal Investigator.';
  }
  return 'You do not have permission to approve this request.';
}
