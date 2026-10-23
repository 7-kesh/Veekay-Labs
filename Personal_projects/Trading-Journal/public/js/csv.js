// Port of app/routes.py's export_csv() - client-side since there's no server to stream from.
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]).filter(k => k !== 'legacy_json' && k !== 'checklist');
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map(c => csvCell(r[c])).join(','));
  return lines.join('\n');
}

export function downloadCsv(filename, rows) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
