// "Portfolio levels" card on the Portfolio page. Bars show each area's level split into money in
// open trades and what is still available, plus the overall level; the line shows the selected
// scope's level over time (starting capital + realized P&L). Toggle: Overall / Scalp / Options /
// Swing and Live / Paper. Everything is drawn from the entries already fetched.
import { AREA_LABEL, capitalSummary, overallSummary, levelSeries, capUsd } from '../capital.js';
import { esc } from '../format.js';

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const SCOPES = [['all', 'Overall'], ['scalp', 'Scalp'], ['options', 'Options'], ['swing', 'Swing']];

function lineSvg(series) {
  const { start, points } = series;
  if (!points.length) return `<p class="muted">No closed trades for this selection yet, so the level is still the starting capital ${capUsd(start)}.</p>`;
  const pts = [{ date: 'start', level: start }, ...points];
  const W = 800, H = 230, L = 64, R = 16, T = 14, B = 30;
  const vals = pts.map(p => p.level), lo = Math.min(...vals), hi = Math.max(...vals), pad = ((hi - lo) || Math.max(1, Math.abs(hi) * 0.02)) * 0.12;
  const y0 = lo - pad, y1 = hi + pad;
  const x = i => L + (pts.length === 1 ? 0.5 : i / (pts.length - 1)) * (W - L - R);
  const y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.level).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${H - B} L${x(0).toFixed(1)} ${H - B} Z`;
  const ticks = [y0 + pad, (y0 + y1) / 2, y1 - pad].map(v => Math.round(v * 100) / 100);
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" class="lvsvg" role="img" aria-label="Portfolio level over time">
    <defs><linearGradient id="lvfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sec);stop-opacity:.38"/><stop offset="1" style="stop-color:var(--sec);stop-opacity:0"/></linearGradient></defs>
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="gl"/><text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${capUsd(v).replace(/\.00$/, '')}</text>`).join('')}
    <line x1="${L}" x2="${W - R}" y1="${y(start).toFixed(1)}" y2="${y(start).toFixed(1)}" class="startln"/>
    <path d="${area}" fill="url(#lvfill)"/><path d="${line}" class="ln"/>
    ${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.level).toFixed(1)}" r="${i === pts.length - 1 ? 5 : 3}" class="dot"><title>${p.date === 'start' ? 'Starting capital' : esc(p.date)}: ${capUsd(p.level)}</title></circle>`).join('')}
    <text x="${L}" y="${H - 8}">${esc(pts[1].date)}</text><text x="${W - R}" y="${H - 8}" text-anchor="end">${esc(last.date)}</text>
    <text x="${(x(pts.length - 1) - 8).toFixed(1)}" y="${(y(last.level) - 10).toFixed(1)}" text-anchor="end" class="val">${capUsd(last.level)}</text>
  </svg>`;
}

export function mountPortfolioGraph(host, entries, open, settings) {
  const state = { account: 'live', scope: 'all' };
  const today = localToday();
  const seg = (name, val, items) => `<div class="calseg">${items.map(([v, l]) => `<button type="button" data-${name}="${v}" class="${v === val ? 'on' : ''}">${l}</button>`).join('')}</div>`;

  const draw = () => {
    const opts = { account: state.account };
    const rows = [['all', 'Overall', overallSummary(settings, entries, open, opts)],
      ...['scalp', 'options', 'swing', 'futures'].map(k => [k, AREA_LABEL[k], capitalSummary(settings, k, entries, open, opts)]).filter(r => r[0] !== 'futures' || r[2].set)];
    const areaRows = rows.filter(r => r[0] !== 'all');
    const scale = Math.max(1, ...areaRows.map(r => r[2].level));
    const sel = rows.find(r => r[0] === state.scope)[2];
    const bar = ([key, label, s]) => {
      const den = key === 'all' ? Math.max(1, s.level) : scale; // areas share one scale; Overall fills its own
      const openPct = s.set ? Math.min(100, Math.max(0, s.inOpen) / den * 100) : 0;
      const availPct = s.set ? Math.max(0, Math.min(100 - openPct, s.available / den * 100)) : 0;
      return `<button type="button" class="lvrow${key === state.scope ? ' sel' : ''}${s.available < 0 ? ' over' : ''}" data-scope="${key}">
        <span class="lvname">${label}</span>
        <span class="lvbar">${s.set ? `<i class="open" style="width:${openPct.toFixed(1)}%"></i><i class="avail" style="width:${availPct.toFixed(1)}%"></i>` : '<em>not set</em>'}</span>
        <span class="lvnum">${s.set ? `<b>${capUsd(s.level)}</b> level · ${capUsd(s.inOpen)} in open trades · <b class="av">${capUsd(s.available)}</b> available` : 'add starting capital in Settings'}</span></button>`;
    };
    host.innerHTML = `
      <div class="calhead"><div class="caltotal ${sel.available < 0 ? 'down' : 'up'}"><span>${state.scope === 'all' ? 'Overall' : AREA_LABEL[state.scope]} level</span><b>${capUsd(sel.level)}</b>
        <small>${capUsd(sel.inOpen)} in open trades · ${capUsd(sel.available)} available · ${sel.realized >= 0 ? '+' : ''}${capUsd(sel.realized)} realized</small></div>
        <div class="calctl">${seg('pscope', state.scope, SCOPES)}${seg('paccount', state.account, [['live', 'Live'], ['paper', 'Paper']])}</div></div>
      <div class="lvbars">${rows.map(bar).join('')}</div>
      <div class="lvlegend"><span><i class="open"></i>In open trades</span><span><i class="avail"></i>Available</span><span><i class="start"></i>Starting capital</span></div>
      <h3>${state.scope === 'all' ? 'Overall' : AREA_LABEL[state.scope]} level over time</h3>
      <div class="lvchart">${lineSvg(levelSeries(settings, state.scope, entries, { account: state.account, today }))}</div>`;
  };

  host.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pscope) state.scope = b.dataset.pscope;
    else if (b.dataset.paccount) state.account = b.dataset.paccount;
    else if (b.dataset.scope) state.scope = b.dataset.scope;
    else return;
    draw();
  });
  draw();
}
