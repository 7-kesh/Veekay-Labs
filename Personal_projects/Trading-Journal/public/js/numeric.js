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

// "942", "9.42", "9 42", "9:42 am", "1:05pm", "09:42:15" -> "HH:MM" (24-hour; a bare hour with no
// am/pm is kept as typed, since market hours 9-4 are unambiguous only with a clock in mind).
// Returns the corrected string, or null when it can't be read as a time.
export function cleanTime(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  const m = /^(\d{1,2})(?:\s*[:.\s]\s*(\d{2})(?:\s*[:.\s]\s*(\d{2}))?|(\d{2}))?\s*(am|pm|a|p)?$/.exec(s);
  if (!m) return null;
  let h = +m[1];
  const min = m[2] !== undefined ? +m[2] : (m[4] !== undefined ? +m[4] : 0);
  const sec = m[3] !== undefined ? +m[3] : null;
  const ap = m[5] ? m[5][0] : '';
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59 || (sec !== null && sec > 59)) return null;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(min)}` + (sec !== null ? `:${pad(sec)}` : '');
}

// Page-wide: when a price/number field (inputmode="decimal") loses focus holding extra text,
// replace it with just the number and say so briefly.
export function installNumberAutocorrect(root = document) {
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.tagName === 'INPUT' && /_time$/.test(t.name || '')) {
      const fixed = cleanTime(t.value);
      if (fixed && fixed !== t.value.trim()) {
        t.title = `Auto-corrected from "${t.value}"`; t.value = fixed;
        t.classList.add('autofixed'); setTimeout(() => t.classList.remove('autofixed'), 2500);
      } else if (!fixed && t.value.trim()) {
        t.title = 'Could not read this as a time; use HH:MM'; t.classList.add('autofixed');
      }
      return;
    }
    if (t && t.tagName === 'INPUT' && t.inputMode === 'numeric') {
      const { value, extra } = cleanNumber(t.value);
      if (value !== null && extra) { t.title = `Auto-corrected from "${extra}"`; t.value = String(Math.round(value)); t.classList.add('autofixed'); setTimeout(() => t.classList.remove('autofixed'), 2500); }
      return;
    }
    if (!t || t.tagName !== 'INPUT' || t.inputMode !== 'decimal') return;
    const { value, extra } = cleanNumber(t.value);
    if (value === null || !extra) return; // clean already, or nothing numeric to keep
    t.value = String(value);
    t.title = `Auto-corrected from "${extra}"`;
    t.classList.add('autofixed');
    setTimeout(() => t.classList.remove('autofixed'), 2500);
  });
}
