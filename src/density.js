// Interface density — "comfortable" (default) or "compact". Compact sets
// [data-density="compact"] on <html>, which tightens row/card padding tokens
// (see index.css). Persists to localStorage and applies pre-paint, mirroring
// the theme/viz-color plumbing.

const KEY = 'gt2:density:v1';
const DEFAULT = 'comfortable';

/** Read the stored density, defaulting to comfortable. */
export function getDensity() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'compact' ? 'compact' : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** Persist + apply density; toggles the <html> data attribute. */
export function setDensity(value) {
  const v = value === 'compact' ? 'compact' : DEFAULT;
  if (v === 'compact') document.documentElement.setAttribute('data-density', 'compact');
  else document.documentElement.removeAttribute('data-density');
  try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
  return v;
}

/** Apply the stored density on boot (call before render). */
export function applyStoredDensity() {
  return setDensity(getDensity());
}
