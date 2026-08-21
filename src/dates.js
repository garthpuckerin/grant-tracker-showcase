/* Grant Tracker — relative-date engine.
 *
 * The whole demo dataset was originally frozen around a single "today"
 * (2026-05-17 — the value lateness was computed from, and the date printed in
 * the dashboard eyebrow / colophon). To keep the prototype looking fresh
 * whenever it is opened, we re-anchor everything on the REAL "today" at
 * module-eval time and shift the ENTIRE dataset by one constant offset
 * (today − oldAnchor).
 *
 * Shifting by a single offset preserves every relationship exactly:
 *   - a task "8 days late" stays 8 days late,
 *   - a deadline "due in 5 days" stays due in 5 days,
 *   - a multi-year grant's period-of-performance slides as a block, so the
 *     year whose window contains today is still the "current year",
 *   - the trailing-12-months expenditure series still ends at the current month.
 *
 * Deterministic: TODAY is computed once, from the system clock. No Math.random,
 * no external deps.
 */

const MS_PER_DAY = 86_400_000;

/** Midnight (local) of the supplied date — strips the time component. */
export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The real "today", frozen at module evaluation. */
export const TODAY = startOfDay(new Date());

/** A Date exactly `n` whole days from TODAY (n may be negative). */
export function daysFromToday(n) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

/** 'YYYY-MM-DD' for a Date (local). */
export function iso(date) {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Shorthand: ISO string for an offset from today. */
export function isoFromToday(n) {
  return iso(daysFromToday(n));
}

/* ---- The migration anchor ---------------------------------------------- *
 * The original fixtures were frozen on this date. It is the "today" that
 * atoms.fmt.daysUntil() compared against, and the date the dashboard eyebrow,
 * "Last sync" colophon, and Q2-FY26 label hardcoded. To re-express any legacy
 * ISO date as a today-relative offset:
 *   offsetFromAnchor('2026-05-21') === 4  →  daysFromToday(4)
 */
export const ANCHOR_ISO = '2026-05-17';
const ANCHOR = startOfDay(new Date(ANCHOR_ISO + 'T00:00:00'));

/** Whole-day offset of a legacy ISO date relative to the old 2026-05-17 anchor. */
export function offsetFromAnchor(isoDate) {
  const d = startOfDay(new Date(isoDate + 'T00:00:00'));
  return Math.round((d - ANCHOR) / MS_PER_DAY);
}

/**
 * Re-anchor a legacy 'YYYY-MM-DD' onto today: returns the new ISO string that
 * preserves the date's whole-day distance from the old anchor. This is the core
 * migration primitive — every fixture date passes through here.
 */
export function shiftIso(isoDate) {
  return iso(daysFromToday(offsetFromAnchor(isoDate)));
}

/* ---- Display formatters (match the strings the UI used to hardcode) ----- */

/** "May 17, 2026" (medium date) — matches atoms.fmt.date output. */
export function fmtMedium(date) {
  return startOfDay(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "May 17" (month + day). */
export function fmtMonthDay(date) {
  return startOfDay(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Four-digit year. */
export function fmtYear(date) {
  return String(startOfDay(date).getFullYear());
}

/* ---- Fiscal quarter / FY label ----------------------------------------- *
 * The grant fixtures use a CALENDAR-anchored fiscal year: the original label
 * read "Q2 FY26 · May 17, 2026", and May 2026 is the 2nd calendar quarter of
 * 2026 (Jan–Mar = Q1, Apr–Jun = Q2, Jul–Sep = Q3, Oct–Dec = Q4). The grant
 * `years[].fy` labels agree (a 2024-01-01 start is FY24). So FY = calendar
 * year and the quarter is the calendar quarter. Derive both from TODAY rather
 * than hardcoding, so the label tracks the real clock.
 */
export function fiscalQuarter(date = TODAY) {
  const d = startOfDay(date);
  return Math.floor(d.getMonth() / 3) + 1; // 1..4
}

export function fiscalYear(date = TODAY) {
  return startOfDay(date).getFullYear();
}

/** "Q2 FY26" derived from a date (defaults to today). */
export function fiscalLabel(date = TODAY) {
  return `Q${fiscalQuarter(date)} FY${String(fiscalYear(date)).slice(-2)}`;
}

/* Convenience: today expressed in the formats the UI needs. */
export const TODAY_ISO = iso(TODAY);
export const TODAY_MEDIUM = fmtMedium(TODAY);           // "Jun 22, 2026"
export const TODAY_YEAR = fmtYear(TODAY);
export const TODAY_FISCAL = fiscalLabel(TODAY);         // "Q2 FY26"
export const TODAY_FQ_REVERSED = `FY${String(fiscalYear()).slice(-2)} Q${fiscalQuarter()}`; // "FY26 Q2"
