// Port of app/routes.py's Jinja filters: money, signclass, num, px.
function blank(v) { return v === null || v === undefined || v === ''; }

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function money(v) {
  if (blank(v)) return '';
  v = Number(v);
  return v < 0 ? `-$${Math.abs(v).toFixed(2)}` : `$${v.toFixed(2)}`;
}

export function signclass(v) {
  if (blank(v) || Number(v) === 0) return '';
  return Number(v) > 0 ? 'pos' : 'neg';
}

export function num(v) {
  if (blank(v)) return '';
  v = Number(v);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

export function px(v) {
  if (blank(v)) return '';
  v = Number(v);
  const r2 = Math.round(v * 100) / 100, r4 = Math.round(v * 10000) / 10000;
  if (r2 === r4) return v.toFixed(2);
  return v.toFixed(4).replace(/0+$/, '');
}

// Supabase stores timestamps in UTC (Postgres timestamptz); the old SQLite app stored naive
// local time and just reformatted the string. Converts to the viewer's local time so this
// still reads the same way - "YYYY-MM-DD HH:MM:SS" in the browser's own timezone.
export function localDatetime(iso) {
  if (blank(iso)) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
