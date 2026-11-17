export type ThemePreference = 'system' | 'light' | 'dark';
const key = 'japz.ordering.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();
let preference: ThemePreference = 'system';
let orderingActive = /^\/(japz|order)(\/|$)/.test(window.location.pathname);
let transitionTimer: ReturnType<typeof setTimeout> | undefined;
try {
  const saved = localStorage.getItem(key) || localStorage.getItem('japz.theme');
  if (saved === 'light' || saved === 'dark') preference = saved;
} catch { /* Device preference still works when storage is unavailable. */ }
export const resolvedTheme = () => orderingActive ? preference === 'system' ? media.matches ? 'dark' : 'light' : preference : 'light';
export const themeSnapshot = () => `${preference}:${resolvedTheme()}`;
export const subscribeTheme = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function applyTheme() {
  const theme = resolvedTheme();
  const root = document.documentElement;
  if (root.dataset.theme !== theme) {
    clearTimeout(transitionTimer);
    if (orderingActive && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.dataset.themeTransition = 'true';
      transitionTimer = setTimeout(() => { delete root.dataset.themeTransition; },350);
    } else delete root.dataset.themeTransition;
  }
  if (!orderingActive) delete root.dataset.themeTransition;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#151612' : '#FFCE1B');
  listeners.forEach(listener => listener());
}
export function setTheme(next: ThemePreference) {
  preference = next;
  try { if (next === 'system') localStorage.removeItem(key); else localStorage.setItem(key, next); } catch { /* Keep the choice for this page. */ }
  applyTheme();
}
export function activateOrderingTheme(active: boolean) {
  orderingActive = active;
  applyTheme();
}
media.addEventListener('change', applyTheme);
window.addEventListener('storage', event => {
  if (event.key !== key && event.key !== null) return;
  preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system';
  applyTheme();
});
applyTheme();
