// The four areas Improvements, Daily journal, Weekly review and Strategy are split by, and the
// tab bar they share. The active area travels in the URL as ?area=.
import { esc } from './format.js';

export const AREAS = [['scalp', 'Scalp'], ['options', 'Options'], ['swing', 'Swing'], ['futures', 'Futures']];
export const AREA_LABEL = Object.fromEntries(AREAS);

export function areaOf(params) {
  return AREA_LABEL[params && params.area] ? params.area : 'scalp';
}

// route: hash path without '#/', extra: other query params to keep (e.g. {week: '2026-10-26'}).
export function areaTabs(route, active, extra = {}) {
  const href = a => `#/${route}?` + new URLSearchParams({ ...extra, area: a }).toString();
  return `<nav class="subtabs areatabs">${AREAS.map(([a, l]) => `<a href="${href(a)}" class="${a === active ? 'on' : ''}">${esc(l)}</a>`).join('')}</nav>`;
}
