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

// "2026-10-27", "10/27/2026", "10/27/26", "10-27", "1027", "20261027", "oct 27", "27 Oct 2026" ->
// "YYYY-MM-DD" (month first for all-numeric input; a missing year means the current one).
// Returns the corrected string, or null when it can't be read as a real date.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function cleanDate(raw, today = new Date()) {
  const s = String(raw ?? '').trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
  if (!s) return null;
  let y = null, mo = null, d = null, m;
  if ((m = /^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = /^(\d{1,2})[-/. ](\d{1,2})(?:[-/. ](\d{4}|\d{2}))?$/.exec(s))) { mo = +m[1]; d = +m[2]; y = m[3] ? +m[3] : null; }
  else if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = /^(\d{2})(\d{2})$/.exec(s))) { mo = +m[1]; d = +m[2]; }
  else if ((m = /^([a-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}|\d{2}))?$/.exec(s))) { mo = MONTHS.indexOf(m[1].slice(0, 3)) + 1; d = +m[2]; y = m[3] ? +m[3] : null; }
  else if ((m = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]{3,9})\.?(?: (\d{4}|\d{2}))?$/.exec(s))) { mo = MONTHS.indexOf(m[2].slice(0, 3)) + 1; d = +m[1]; y = m[3] ? +m[3] : null; }
  else return null;
  if (y === null) y = today.getFullYear();
  else if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (!mo || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  const pad = n => String(n).padStart(2, '0');
  return `${y}-${pad(mo)}-${pad(d)}`;
}

// Date fields: plan_date, expiry, entry_date, exit_date, date, ...
export const isDateField = name => /^(date|expiry|.*_date)$/.test(name || '');

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
    if (t && t.tagName === 'INPUT' && t.type === 'text' && isDateField(t.name)) {
      const fixed = cleanDate(t.value);
      if (fixed && fixed !== t.value.trim()) {
        t.title = `Auto-corrected from "${t.value}"`; t.value = fixed;
        t.classList.add('autofixed'); setTimeout(() => t.classList.remove('autofixed'), 2500);
      } else if (!fixed && t.value.trim()) {
        t.title = 'Could not read this as a date; use YYYY-MM-DD'; t.classList.add('autofixed');
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
