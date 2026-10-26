// Forgiving number entry: "at 4.67 invalidation", "$4.67", "1,234.50" all become a number, so a
// stray word in a price field no longer makes the database reject the whole save.
// Returns { value: number|null, extra: string } where extra is whatever text was around the number.
export function cleanNumber(raw) {
  if (typeof raw === 'number') return { value: Number.isFinite(raw) ? raw : null, extra: '' };
  const s = String(raw ?? '').trim();
  if (!s) return { value: null, extra: '' };
  const m = /-?\$?-?\d[\d,]*(?:\.\d+)?|-?\$?-?\.\d+/.exec(s);
  if (!m) return { value: null, extra: s };
  const value = parseFloat(m[0].replace(/[$,]/g, ''));
  if (Number.isNaN(value)) return { value: null, extra: s };
  const extra = (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
  return { value, extra };
}

// Page-wide: when a price/number field (inputmode="decimal") loses focus holding extra text,
// replace it with just the number and say so briefly.
export function installNumberAutocorrect(root = document) {
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'INPUT' || t.inputMode !== 'decimal') return;
    const { value, extra } = cleanNumber(t.value);
    if (value === null || !extra) return; // clean already, or nothing numeric to keep
    t.value = String(value);
    t.title = `Auto-corrected from "${extra}"`;
    t.classList.add('autofixed');
    setTimeout(() => t.classList.remove('autofixed'), 2500);
  });
}
