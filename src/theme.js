// Theme persistence — light | beige | dark. No external deps.
// Applies via [data-theme] on <html>; index.css retargets neutral tokens.

const KEY = 'gt2:theme:v1';
export const THEMES = ['light', 'beige', 'dark'];

const isValid = (t) => THEMES.includes(t);

/** Read the stored theme, falling back to 'light' for missing/invalid values. */
export function getTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return isValid(t) ? t : 'light';
  } catch {
    return 'light';
  }
}

/** Persist + apply a theme. 'light' clears the attribute so :root defaults apply. */
export function setTheme(t) {
  const next = isValid(t) ? t : 'light';
  const root = document.documentElement;
  if (next === 'light') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', next);
  }
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable (private mode); theme still applies for the session */
  }
  return next;
}

/** Apply the stored theme on boot (call before render to avoid a flash). */
export function applyStoredTheme() {
  const t = getTheme();
  if (t !== 'light') {
    document.documentElement.setAttribute('data-theme', t);
  }
  return t;
}
