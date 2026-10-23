// Tiny markdown renderer - port of app/static/app.js's md()/inline()/esc().
import { esc } from './format.js';

function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
}

export function md(src) {
  const lines = String(src || '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*\|/.test(l)) {
      let rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      rows = rows.filter(r => !/^\s*\|[\s:|-]+\|?\s*$/.test(r));
      out.push('<table class="dense">' + rows.map((r, k) => {
        const cells = r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const tag = k === 0 ? 'th' : 'td';
        return '<tr>' + cells.map(c => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>';
      }).join('') + '</table>');
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      const items = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*[-*] /, ''))}</li>`); i++; }
      out.push('<ul>' + items.join('') + '</ul>');
      continue;
    }
    if (l.trim()) out.push(`<p>${inline(l)}</p>`);
    i++;
  }
  return out.join('');
}
