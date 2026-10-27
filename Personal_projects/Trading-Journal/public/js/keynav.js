// Tag chips (violations, emotions) are checkboxes. By default each one is a Tab stop, which makes a
// form 20+ presses longer. Here each chip group is ONE Tab stop; the arrow keys move between its
// chips and Space ticks the focused one. Radio groups already behave this way natively.
export function installChipKeys(root) {
  const rove = () => root.querySelectorAll('.chips').forEach(g => {
    if (g.dataset.rove) return;
    const boxes = [...g.querySelectorAll('input[type=checkbox]')];
    if (!boxes.length) return;
    g.dataset.rove = '1';
    boxes.forEach((b, k) => { b.tabIndex = k === 0 ? 0 : -1; });
  });
  new MutationObserver(rove).observe(root, { childList: true, subtree: true });
  rove();

  root.addEventListener('focusin', (e) => {
    const i = e.target;
    if (!i.matches || !i.matches('.chips input[type=checkbox]')) return;
    i.closest('.chips').querySelectorAll('input[type=checkbox]').forEach(x => { x.tabIndex = x === i ? 0 : -1; });
  });
  root.addEventListener('keydown', (e) => {
    const i = e.target;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step || !i.matches || !i.matches('.chips input[type=checkbox]')) return;
    const all = [...i.closest('.chips').querySelectorAll('input[type=checkbox]')];
    e.preventDefault();
    all[(all.indexOf(i) + step + all.length) % all.length].focus();
  });
}
