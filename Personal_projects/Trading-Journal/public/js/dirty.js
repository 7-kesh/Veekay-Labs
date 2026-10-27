// "+ New trade" button gating for the entry forms: enabled only when the trade has been saved at least
// once AND nothing has changed since (compared with a snapshot of the form), so an unsaved edit can't be
// walked away from by accident. Call markClean() after any save that persisted the current form.
import { navigate, dispatch } from './router.js';

const snapshot = form => JSON.stringify([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));

export function trackNewButton(form, btn, { isSaved, newRoute }) {
  let clean = snapshot(form);
  function refresh() {
    const dirty = snapshot(form) !== clean, saved = isSaved();
    btn.disabled = dirty || !saved;
    btn.title = !saved ? 'Save first, then you can start a new one'
      : dirty ? 'You have unsaved changes. Save first.' : 'Start a new one';
  }
  // Deferred so the page-wide auto-correct (which runs after this listener) is included in the comparison.
  const later = () => setTimeout(refresh, 0);
  form.addEventListener('input', later);
  form.addEventListener('change', later);
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    const before = window.location.hash;
    navigate(newRoute);
    if (window.location.hash === before) await dispatch();
  });
  refresh();
  return { markClean() { clean = snapshot(form); refresh(); }, refresh };
}
