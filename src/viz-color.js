// Data-viz color mode — value-based chart coloring on top of our editorial
// near-monochrome (ink-on-paper) base. No external deps.
//
// The editorial aesthetic is deliberately near-monochrome with only small
// splashes of the semantic palette. When color mode is ON, charts and bars
// render with *value-based* color: thresholds map a metric to green / amber /
// red, and non-threshold charts fall back to the brand accent.
//
// State mirrors onto a `viz-color` class on <html> (so pure-CSS bars can react)
// and persists to localStorage so it survives reloads — the same pattern as
// theme.js. A pre-paint call in main.jsx applies the class before first paint
// to avoid a flash.

import React from 'react';

const KEY = 'gt2:viz:v1';
export const VIZ_COLOR_CLASS = 'viz-color';

// Default ON, matching the reference build's default-on behavior.
const DEFAULT_ON = true;

/** Read the stored preference, defaulting to ON for missing/invalid values. */
export function getViz() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'on') return true;
    if (v === 'off') return false;
    return DEFAULT_ON;
  } catch {
    return DEFAULT_ON;
  }
}

/** Persist + apply the viz-color preference; toggles the <html> class. */
export function setViz(on) {
  document.documentElement.classList.toggle(VIZ_COLOR_CLASS, on);
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable (private mode); mode still applies for the session */
  }
  return on;
}

/** Apply the stored viz-color preference on boot (call before render). */
export function applyStoredViz() {
  const on = getViz();
  document.documentElement.classList.toggle(VIZ_COLOR_CLASS, on);
  return on;
}

/* ============================================================
   Value → color helpers (pure). Inputs are fractions in [0, 1]
   unless noted. All return a CSS custom-property reference so
   they stay theme-aware across light / beige / dark.
   ============================================================ */

const ACCENT = 'var(--accent)';
const FUND = 'var(--fund)';
const WARN = 'var(--warn)';
const ALERT = 'var(--alert)';
const INDIGO = 'var(--indigo)';
const FUND_TEXT = 'var(--fund-text-accessible)';
const WARN_TEXT = 'var(--warn-text-accessible)';
const ALERT_TEXT = 'var(--alert-text-accessible)';

/**
 * Budget utilization: healthy until 80%, watch 80–95%, over/at-risk above 95%.
 * @param {number} frac spent / total in [0, 1] (above 1 reads as ALERT).
 * @returns {string}
 */
export function utilizationColor(frac) {
  if (frac > 0.95) return ALERT;
  if (frac >= 0.8) return WARN;
  return FUND;
}

/** Accessible text counterpart to utilizationColor; fill hues stay unchanged. */
export function utilizationTextColor(frac) {
  if (frac > 0.95) return ALERT_TEXT;
  if (frac >= 0.8) return WARN_TEXT;
  return FUND_TEXT;
}

/**
 * Compliance / composite score: strong >=90, watch 75–90, weak below 75.
 * @param {number} frac score in [0, 1].
 * @returns {string}
 */
export function scoreColor(frac) {
  if (frac >= 0.9) return FUND;
  if (frac >= 0.75) return WARN;
  return ALERT;
}

/**
 * Per-bar direction relative to the previous bar: rising = accent,
 * falling = indigo. The first bar (no predecessor) reads as accent.
 * @param {number} curr
 * @param {number|null|undefined} prev
 * @returns {string}
 */
export function deltaColor(curr, prev) {
  if (prev == null) return ACCENT;
  return curr < prev ? INDIGO : ACCENT;
}

/**
 * Overall trend of a series (last vs first): rising = accent, falling = indigo.
 * @param {readonly number[]} series
 * @returns {string}
 */
export function trendColor(series) {
  if (series.length < 2) return ACCENT;
  const delta = series[series.length - 1] - series[0];
  return delta < 0 ? INDIGO : ACCENT;
}

/**
 * A translucent wash of a CSS color, for sparkline area fills. Uses color-mix
 * so it tracks whatever custom property is passed in.
 * @param {string} color
 * @param {number} [pct=12]
 * @returns {string}
 */
export function washOf(color, pct = 12) {
  return `color-mix(in oklch, ${color} ${pct}%, transparent)`;
}

/* ============================================================
   Insight agent → color map. A single source of truth so the
   dashboard widget and the Insights screen tint each finding's
   left edge / label identically. Mirrors the reference build's
   type→border map (alert=amber, recommendation=blue,
   optimization=emerald, compliance=purple) translated to our
   semantic tokens, extended with the WRITER agent.
   ============================================================ */

const AGENT_COLORS = {
  BUDGET:     ALERT,   // amber/red — overspend & financial risk
  DEADLINE:   ACCENT,  // blue — time-sensitive reporting
  OPTIMIZE:   FUND,    // green — efficiency opportunities
  COMPLIANCE: INDIGO,  // purple — policy & audit posture
  WRITER:     'var(--ink)', // neutral — drafting assistance
};

// Legacy `kind` → color fallback (older fixtures carry `kind`, not `agent`).
const KIND_COLORS = {
  alert:  ALERT,
  fund:   FUND,
  indigo: INDIGO,
  accent: ACCENT,
};

/**
 * Resolve a consistent edge/label color for an AI insight. Prefers the agent
 * (BUDGET/DEADLINE/COMPLIANCE/OPTIMIZE/WRITER); falls back to the legacy `kind`.
 * @param {{ agent?: string, kind?: string }} insight
 * @returns {string}
 */
export function insightColor(insight) {
  if (insight?.agent && AGENT_COLORS[insight.agent]) return AGENT_COLORS[insight.agent];
  if (insight?.kind && KIND_COLORS[insight.kind]) return KIND_COLORS[insight.kind];
  return ACCENT;
}

/* ============================================================
   React context — atoms read `on` to decide ink vs value-color.
   ============================================================ */

const VizColorContext = React.createContext({
  on: DEFAULT_ON,
  setOn: () => {},
  toggle: () => {},
});

/** Hook returning the current viz-color state and controls. */
export function useVizColor() {
  return React.useContext(VizColorContext);
}

/**
 * Provider holding the viz-color `on` state. Initializes from the class the
 * pre-paint script already applied (keeps in sync with applyStoredViz).
 */
export function VizColorProvider({ children }) {
  const [on, setOnState] = React.useState(() =>
    document.documentElement.classList.contains(VIZ_COLOR_CLASS),
  );

  const setOn = React.useCallback((next) => {
    setViz(next);
    setOnState(next);
  }, []);

  const toggle = React.useCallback(() => {
    setOnState((prev) => {
      const next = !prev;
      setViz(next);
      return next;
    });
  }, []);

  const value = React.useMemo(() => ({ on, setOn, toggle }), [on, setOn, toggle]);

  return React.createElement(VizColorContext.Provider, { value }, children);
}
