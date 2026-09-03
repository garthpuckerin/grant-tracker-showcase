// Reduced-motion persistence — mirrors theme.js and density.js so the saved
// Appearance setting is applied before React renders.

const KEY = 'gt2:reducemotion:v1';

/** Read the stored preference, defaulting to standard motion. */
export function getReduceMotion() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

/** Persist and apply the reduced-motion class. */
export function setReduceMotion(on) {
  const next = Boolean(on);
  document.documentElement.classList.toggle('reduce-motion', next);
  try { localStorage.setItem(KEY, next ? 'on' : 'off'); } catch { /* private mode */ }
  return next;
}

/** Apply the stored preference on boot. */
export function applyStoredReduceMotion() {
  return setReduceMotion(getReduceMotion());
}
