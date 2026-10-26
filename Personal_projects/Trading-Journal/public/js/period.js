// Shared period handling for the Stats pages and the Options/Swing lists.
// A period is one string: a quick range ('week' | 'month' | '30d' | 'all') or a calendar year /
// year-month ('y2026', 'y2026-10'). Encoding it in one string keeps every existing link and
// URL parameter working (e.g. Portfolio -> Scalp stats just forwards period=...).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YM = /^y(\d{4})(?:-(0?[1-9]|1[0-2]))?$/;

export function parsePeriod(period) {
  const m = YM.exec(String(period || ''));
  if (m) return { quick: '', year: m[1], month: m[2] ? String(Number(m[2])) : '' };
  return { quick: ['week', 'month', '30d', 'all'].includes(period) ? period : 'all', year: '', month: '' };
}

export function encodePeriod({ quick, year, month }) {
  if (year) return month ? `y${year}-${String(Number(month)).padStart(2, '0')}` : `y${year}`;
  return quick || 'all';
}

export function yearMonthBounds(year, month) {
  const y = Number(year), m = Number(month);
  if (!y) return null;
  if (!m) return [`${y}-01-01`, `${y}-12-31`];
  const mm = String(m).padStart(2, '0');
  return [`${y}-${mm}-01`, `${y}-${mm}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`];
}

// [lo, hi] ISO dates, or [null, null] for no limit.
export function periodBounds(period) {
  const p = parsePeriod(period);
  if (p.year) return yearMonthBounds(p.year, p.month);
  const t = new Date(); const iso = d => d.toISOString().slice(0, 10);
  if (p.quick === 'week') { const d = new Date(t); d.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return [iso(d), iso(t)]; }
  if (p.quick === 'month') { const d = new Date(t.getFullYear(), t.getMonth(), 1); return [iso(d), iso(t)]; }
  if (p.quick === '30d') { const d = new Date(t); d.setDate(t.getDate() - 30); return [iso(d), iso(t)]; }
  return [null, null];
}

// The three selects (quick range, year, month). A chosen year overrides the quick range and
// greys it out; month is disabled until a year is chosen. Names: quick, year, month.
export function periodSelectsHtml(period, years) {
  const p = parsePeriod(period);
  const list = [...years];
  if (p.year && !list.includes(p.year)) list.unshift(p.year);
  const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
  return `<select name="quick" ${p.year ? 'disabled' : ''}>${opt('week', p.quick, 'This week')}${opt('month', p.quick, 'This month')}${opt('30d', p.quick, 'Last 30 days')}${opt('all', p.quick, 'All time')}</select>
    <select name="year"><option value="">All years</option>${list.map(y => opt(y, p.year, y)).join('')}</select>
    <select name="month" ${p.year ? '' : 'disabled'}><option value="">All months</option>${MONTHS.map((n, i) => opt(String(i + 1), p.month, n)).join('')}</select>`;
}

// Reads the three selects back into one period string.
export function readPeriod(form) {
  const year = form.elements.year.value;
  return encodePeriod({ quick: form.elements.quick.value, year, month: year ? form.elements.month.value : '' });
}
