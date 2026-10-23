// Port of app/static/charts.js - hand-built inline SVG, no libraries. Colors come from CSS
// custom properties so they stay in sync with the rest of the app.
const NS = 'http://www.w3.org/2000/svg';
let tip = null;
function getTip() {
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.appendChild(tip); }
  return tip;
}

function el(tag, attrs, parent, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text !== undefined) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
function usd(v, d = 2) { return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(d); }
function compact(v) {
  const a = Math.abs(v);
  const s = a >= 1000 ? (a / 1000).toFixed(a % 1000 ? 1 : 0) + 'K' : String(Math.round(a * 100) / 100);
  return (v < 0 ? '-$' : '$') + s;
}
function niceTicks(lo, hi, count) {
  if (lo === hi) hi = lo + 1;
  const raw = (hi - lo) / count, p = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = p;
  [1, 2, 2.5, 5, 10].some(m => { step = m * p; return raw <= step; });
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for (let v = a; v <= b + 1e-9; v += step) t.push(Math.round(v * 1e6) / 1e6);
  return t;
}
function roundedCol(x, y, w, h, up, r) {
  r = Math.min(r, w / 2, h);
  if (h <= 0) return '';
  return up
    ? `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
    : `M${x},${y}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w - r}Q${x + w},${y + h} ${x + w},${y + h - r}V${y}Z`;
}
function showTip(evt, rows, keyed) {
  const t = getTip();
  t.textContent = '';
  rows.forEach(r => {
    const line = document.createElement('div');
    const v = document.createElement('span'); v.className = 'tv'; v.textContent = r.value; line.appendChild(v);
    const l = document.createElement('span'); l.className = 'tl';
    if (keyed) { const k = document.createElement('i'); k.className = 'tk'; if (r.color) k.style.borderTopColor = r.color; l.appendChild(k); }
    l.appendChild(document.createTextNode(r.label)); line.appendChild(l);
    t.appendChild(line);
  });
  t.hidden = false;
  let x = evt.clientX + 14, y = evt.clientY + 14;
  const w = t.offsetWidth, h = t.offsetHeight;
  if (x + w > window.innerWidth - 8) x = evt.clientX - w - 14;
  if (y + h > window.innerHeight - 8) y = evt.clientY - h - 14;
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
function hideTip() { if (tip) tip.hidden = true; }

function frame(host, H, m) {
  const W = Math.max(300, host.clientWidth), svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  return { svg, W, H, m, iw: W - m.l - m.r, ih: H - m.t - m.b };
}
function yAxis(f, svg, ticks, y, fmt) {
  ticks.forEach(t => {
    el('line', { x1: f.m.l, x2: f.W - f.m.r, y1: y(t), y2: y(t), class: t === 0 ? 'zero' : 'gl' }, svg);
    el('text', { x: f.m.l - 8, y: y(t) + 4, 'text-anchor': 'end' }, svg, fmt(t));
  });
}
function xLabels(f, svg, pts, xi) {
  const idx = [0, Math.floor((pts.length - 1) / 3), Math.floor(2 * (pts.length - 1) / 3), pts.length - 1];
  idx.filter((v, i) => idx.indexOf(v) === i).forEach((i, k, arr) => {
    el('text', { x: xi(i), y: f.H - 8, 'text-anchor': k === 0 ? 'start' : (k === arr.length - 1 ? 'end' : 'middle') }, svg, pts[i].date.slice(5) || ('#' + pts[i].i));
  });
}
function scrub(f, svg, n, xi, onIdx, onLeave, indexAt) {
  const hit = el('rect', { x: f.m.l, y: f.m.t, width: f.iw, height: f.ih, class: 'hit', tabindex: 0 }, svg);
  let cur = n - 1;
  function at(evt) {
    const r = svg.getBoundingClientRect(), x = (evt.clientX - r.left) * (f.W / r.width);
    const i = indexAt ? indexAt(x) : Math.round((x - f.m.l) / (n > 1 ? f.iw / (n - 1) : 1));
    return Math.max(0, Math.min(n - 1, i));
  }
  hit.addEventListener('pointermove', e => { cur = at(e); onIdx(cur, e); });
  hit.addEventListener('pointerleave', onLeave);
  hit.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); cur = Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)));
    const r = svg.getBoundingClientRect(); onIdx(cur, { clientX: r.left + xi(cur) * (r.width / f.W), clientY: r.top + f.m.t });
  });
  hit.addEventListener('blur', onLeave);
}

const AREA = { scalp: ['Scalp', 'var(--c-scalp)'], options: ['Options', 'var(--c-options)'], swing: ['Swing', 'var(--c-swing)'], total: ['All areas', 'var(--ink)'] };
function dayMs(d) { return Date.parse(d + 'T00:00:00'); }

function hbars(host, rows, max, fmt, note) {
  const W = Math.max(300, host.clientWidth), rowH = 34, H = rows.length * rowH + 6, lw = 150;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  rows.forEach((r, i) => {
    const y = 3 + i * rowH, w = Math.max(2, (W - lw - 70) * r.v / max);
    el('text', { x: 0, y: y + 19 }, svg, r.name);
    const b = el('path', { d: `M${lw},${y + 4}H${lw + w - 4}Q${lw + w},${y + 4} ${lw + w},${y + 8}V${y + 20}Q${lw + w},${y + 24} ${lw + w - 4},${y + 24}H${lw}Z`, class: 'mark ' + r.cls }, svg);
    el('text', { x: lw + w + 8, y: y + 19, class: 'val' }, svg, fmt(r.v));
    b.addEventListener('pointermove', e => showTip(e, [{ value: fmt(r.v), label: r.name.replace(/^[▲▼] /, '') }]));
    b.addEventListener('pointerleave', hideTip);
  });
  el('line', { x1: lw, x2: lw, y1: 0, y2: H, class: 'zero' }, svg);
  host.appendChild(svg);
  if (note) { const p = document.createElement('div'); p.className = 'legend'; p.textContent = note; host.appendChild(p); }
}

const charts = {
  equity(host, d) {
    const pts = d.points, n = pts.length, H = 270, f = frame(host, H, { l: 56, r: 56, t: 14, b: 30 }), svg = f.svg;
    const lo = Math.min(0, ...pts.map(p => p.cum)), hi = Math.max(0, ...pts.map(p => p.cum));
    const ticks = niceTicks(lo, hi, 4), ymin = ticks[0], ymax = ticks[ticks.length - 1];
    const y = v => f.m.t + f.ih - (v - ymin) / (ymax - ymin) * f.ih;
    const xi = i => f.m.l + (n > 1 ? i / (n - 1) : 0.5) * f.iw;
    yAxis(f, svg, ticks, y, compact); xLabels(f, svg, pts, xi);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + xi(i).toFixed(1) + ',' + y(p.cum).toFixed(1)).join('');
    el('path', { d: line + `L${xi(n - 1)},${y(0)}L${xi(0)},${y(0)}Z`, class: 'area' }, svg);
    el('path', { d: line, class: 'ln' }, svg);
    const last = pts[n - 1];
    el('circle', { cx: xi(n - 1), cy: y(last.cum), r: 4, class: 'dot' }, svg);
    el('text', { x: xi(n - 1) + 9, y: y(last.cum) + 4, class: 'val' }, svg, usd(last.cum, 0));
    const cross = el('line', { y1: f.m.t, y2: f.m.t + f.ih, class: 'cross' }, svg); cross.style.display = 'none';
    const dot = el('circle', { r: 4, class: 'dot' }, svg); dot.style.display = 'none';
    scrub(f, svg, n, xi, (i, e) => {
      const p = pts[i]; cross.setAttribute('x1', xi(i)); cross.setAttribute('x2', xi(i)); cross.style.display = '';
      dot.setAttribute('cx', xi(i)); dot.setAttribute('cy', y(p.cum)); dot.style.display = '';
      showTip(e, [{ value: usd(p.cum), label: 'Cumulative after ' + p.label }, { value: (p.pnl >= 0 ? '▲ +' : '▼ ') + usd(p.pnl), label: 'This trade · ' + p.date }], true);
    }, () => { cross.style.display = 'none'; dot.style.display = 'none'; hideTip(); });
    host.appendChild(svg);
  },
  bars(host, d) {
    const pts = d.points, n = pts.length, H = 250, f = frame(host, H, { l: 56, r: 16, t: 14, b: 30 }), svg = f.svg;
    const vals = pts.map(p => p.pnl), ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 4);
    const ymin = ticks[0], ymax = ticks[ticks.length - 1], y = v => f.m.t + f.ih - (v - ymin) / (ymax - ymin) * f.ih;
    const band = f.iw / n, bw = Math.max(2, Math.min(24, band - 2)), xc = i => f.m.l + band * (i + 0.5);
    yAxis(f, svg, ticks, y, compact); xLabels(f, svg, pts, xc);
    const marks = pts.map((p, i) => {
      const h = Math.abs(y(p.pnl) - y(0));
      if (p.pnl === 0) return el('rect', { x: xc(i) - bw / 2, y: y(0) - 1, width: bw, height: 2, class: 'mark flat' }, svg);
      const up = p.pnl > 0, top = up ? y(p.pnl) : y(0);
      return el('path', { d: roundedCol(xc(i) - bw / 2, top, bw, Math.max(h, 1), up, 4), class: 'mark ' + (up ? 'pos' : 'neg') }, svg);
    });
    let prev = null;
    scrub(f, svg, n, xc, (i, e) => {
      if (prev !== null) marks[prev].classList.remove('on'); marks[i].classList.add('on'); prev = i;
      const p = pts[i]; showTip(e, [{ value: (p.pnl >= 0 ? '▲ +' : '▼ ') + usd(p.pnl), label: p.label + ' · ' + p.date }]);
    }, () => { if (prev !== null) marks[prev].classList.remove('on'); prev = null; hideTip(); },
    x => Math.floor((x - f.m.l) / band));
    host.appendChild(svg);
  },
  split(host, d) {
    const m = d.m, W = Math.max(300, host.clientWidth), H = 44, svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    const parts = [['pos', m.wins, '▲ Wins'], ['neg', m.losses, '▼ Losses'], ['flat', m.flat, 'Flat']].filter(p => p[1] > 0);
    const gap = 2, usable = W - gap * (parts.length - 1);
    let x = 0;
    parts.forEach(p => {
      const w = usable * p[1] / m.n, pct = Math.round(100 * p[1] / m.n) + '%';
      const r = el('rect', { x, y: 6, width: Math.max(w, 1), height: 30, rx: 4, class: 'mark ' + p[0] }, svg);
      if (w > pct.length * 8 + 20) el('text', { x: x + w / 2, y: 26, 'text-anchor': 'middle', style: 'fill:#fff;font-weight:700;font-size:13px' }, svg, pct);
      r.addEventListener('pointermove', e => showTip(e, [{ value: p[1] + ' trades (' + pct + ')', label: p[2].slice(2) || p[2] }]));
      r.addEventListener('pointerleave', hideTip);
      x += w + gap;
    });
    host.appendChild(svg);
    const lg = document.createElement('div'); lg.className = 'legend';
    [['pos', '▲ Wins', m.wins, m.win_pct], ['neg', '▼ Losses', m.losses, m.loss_pct]].concat(m.flat ? [['flat', 'Flat', m.flat, Math.round(1000 * m.flat / m.n) / 10]] : []).forEach(r => {
      const s = document.createElement('span'), i = document.createElement('i'); i.className = r[0]; s.appendChild(i);
      s.appendChild(document.createTextNode(r[1] + ' ' + r[2] + ' (' + r[3] + '%)')); lg.appendChild(s);
    });
    host.appendChild(lg);
  },
  needed(host, d) {
    const m = d.m;
    if (m.breakeven_win_pct === null) { host.textContent = 'Needs at least one win and one loss.'; return; }
    hbars(host, [{ name: 'Your win rate', v: m.win_pct, cls: 'have' }, { name: 'Needed to break even', v: m.breakeven_win_pct, cls: 'need' }], 100,
      v => v.toFixed(1) + '%', 'At your average win and loss sizes');
  },
  margins(host, d) {
    const m = d.m;
    if (m.avg_win === null || m.avg_loss === null) { host.textContent = 'Needs at least one win and one loss.'; return; }
    const rows = [{ name: '▲ Average win', v: m.avg_win, cls: 'pos' }, { name: '▼ Average loss', v: m.avg_loss, cls: 'neg' },
      { name: '▲ Best win', v: m.best, cls: 'pos' }, { name: '▼ Worst loss', v: m.worst, cls: 'neg' }];
    hbars(host, rows, Math.max(m.best, m.worst) * 1.05, v => usd(v), 'Size of the typical and extreme trade, in dollars');
  },
  hist(host, d) {
    const bins = d.bins, n = bins.length, H = 230, f = frame(host, H, { l: 44, r: 16, t: 14, b: 44 }), svg = f.svg;
    const cmax = Math.max(...bins.map(b => b.n)), ticks = niceTicks(0, cmax, 4).filter(t => t === Math.round(t));
    const ymax = ticks[ticks.length - 1], y = v => f.m.t + f.ih - v / ymax * f.ih;
    ticks.forEach(t => { el('line', { x1: f.m.l, x2: f.W - f.m.r, y1: y(t), y2: y(t), class: t === 0 ? 'zero' : 'gl' }, svg); el('text', { x: f.m.l - 8, y: y(t) + 4, 'text-anchor': 'end' }, svg, String(t)); });
    const band = f.iw / n, bw = Math.min(24 * 2, band - 2);
    bins.forEach((b, i) => {
      const x = f.m.l + band * i + (band - bw) / 2, h = y(0) - y(b.n);
      const r = b.n ? el('path', { d: roundedCol(x, y(b.n), bw, h, true, 4), class: 'mark ' + (b.sign > 0 ? 'pos' : 'neg') }, svg) : null;
      const hitr = el('rect', { x: f.m.l + band * i, y: f.m.t, width: band, height: f.ih, class: 'hit' }, svg);
      hitr.addEventListener('pointermove', e => { if (r) r.classList.add('on'); showTip(e, [{ value: b.n + (b.n === 1 ? ' trade' : ' trades'), label: usd(b.lo, 0) + ' to ' + usd(b.hi, 0) + (b.sign > 0 ? ' (wins)' : ' (losses)') }]); });
      hitr.addEventListener('pointerleave', () => { if (r) r.classList.remove('on'); hideTip(); });
      if (n <= 14 || i % 2 === 0) el('text', { x: f.m.l + band * i, y: f.H - 24, 'text-anchor': 'middle' }, svg, compact(b.lo));
    });
    el('text', { x: f.m.l + band * n, y: f.H - 24, 'text-anchor': 'middle' }, svg, compact(bins[n - 1].hi));
    el('text', { x: f.m.l + f.iw / 2, y: f.H - 4, 'text-anchor': 'middle' }, svg, 'Trade result ($)  ·  bar height = number of trades');
    host.appendChild(svg);
  },
  // One line per trade type plus the combined total, on a shared date axis.
  multi(host, d) {
    const keys = ['scalp', 'options', 'swing', 'total'].filter(k => d.series[k] && d.series[k].length);
    const all = [].concat(...keys.map(k => d.series[k]));
    const t0 = Math.min(...all.map(p => dayMs(p.date))), t1 = Math.max(...all.map(p => dayMs(p.date)));
    const vals = all.map(p => p.cum);
    const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 4);
    const f = frame(host, 290, { l: 56, r: 76, t: 14, b: 30 }), svg = f.svg, ymin = ticks[0], ymax = ticks[ticks.length - 1];
    const y = v => f.m.t + f.ih - (v - ymin) / (ymax - ymin) * f.ih;
    const x = ms => f.m.l + (t1 > t0 ? (ms - t0) / (t1 - t0) : 0.5) * f.iw;
    yAxis(f, svg, ticks, y, compact);
    [t0, t0 + (t1 - t0) / 2, t1].forEach((ms, i) => {
      el('text', { x: x(ms), y: f.H - 8, 'text-anchor': i === 0 ? 'start' : (i === 2 ? 'end' : 'middle') }, svg, new Date(ms).toISOString().slice(5, 10));
    });
    const lastY = [];
    keys.forEach(k => {
      const pts = d.series[k], path = pts.map((p, i) => (i ? 'L' : 'M') + x(dayMs(p.date)).toFixed(1) + ',' + y(p.cum).toFixed(1)).join('');
      el('path', { d: path, class: 'ln', style: 'stroke:' + AREA[k][1] + (k === 'total' ? ';stroke-width:3' : '') }, svg);
      const last = pts[pts.length - 1], ly = y(last.cum);
      el('circle', { cx: x(dayMs(last.date)), cy: ly, r: 4, class: 'dot', style: 'fill:' + AREA[k][1] }, svg);
      if (lastY.every(v => Math.abs(v - ly) > 13)) {
        lastY.push(ly); el('text', { x: x(dayMs(last.date)) + 9, y: ly + 4, class: 'val' }, svg, usd(last.cum, 0));
      }
    });
    const cross = el('line', { y1: f.m.t, y2: f.m.t + f.ih, class: 'cross' }, svg); cross.style.display = 'none';
    const hit = el('rect', { x: f.m.l, y: f.m.t, width: f.iw, height: f.ih, class: 'hit' }, svg);
    const dates = Array.from(new Set(all.map(p => p.date))).sort();
    function valueAt(k, date) { let v = null; d.series[k].forEach(p => { if (p.date <= date) v = p.cum; }); return v; }
    hit.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * (f.W / r.width), ms = t0 + (px - f.m.l) / f.iw * (t1 - t0);
      const best = dates.reduce((a, b) => Math.abs(dayMs(b) - ms) < Math.abs(dayMs(a) - ms) ? b : a);
      cross.setAttribute('x1', x(dayMs(best))); cross.setAttribute('x2', x(dayMs(best))); cross.style.display = '';
      showTip(e, keys.map(k => { const v = valueAt(k, best); return { value: v === null ? '–' : usd(v), label: AREA[k][0] + ' · ' + best, color: AREA[k][1] }; }), true);
    });
    hit.addEventListener('pointerleave', () => { cross.style.display = 'none'; hideTip(); });
    host.appendChild(svg);
    const lg = document.createElement('div'); lg.className = 'legend';
    keys.forEach(k => {
      const s = document.createElement('span'), i = document.createElement('i'); i.className = 'ln-key'; i.style.borderTopColor = AREA[k][1]; s.appendChild(i);
      s.appendChild(document.createTextNode(AREA[k][0])); lg.appendChild(s);
    });
    host.appendChild(lg);
  },
  // Net result per area: bars grow right for profit and left for loss from a shared zero line.
  areabars(host, d) {
    const rows = d.areas.filter(a => a.n > 0);
    if (!rows.length) { host.textContent = 'No closed trades yet.'; return; }
    const W = Math.max(300, host.clientWidth), rowH = 40, H = rows.length * rowH + 8, lw = 78;
    const vs = rows.map(a => a.net), lo = Math.min(0, ...vs), hi = Math.max(0, ...vs);
    const left = lw + (lo < 0 ? 70 : 8), right = W - (hi > 0 ? 76 : 16), span = (hi - lo) || 1;
    const x = v => left + (v - lo) / span * (right - left);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    rows.forEach((a, i) => {
      const yy = 4 + i * rowH, x0 = x(0), x1 = x(a.net), pos = a.net >= 0, bx = Math.min(x0, x1), bw = Math.max(2, Math.abs(x1 - x0));
      el('text', { x: 0, y: yy + 24 }, svg, AREA[a.kind][0]);
      const b = el('rect', { x: bx, y: yy + 7, width: bw, height: 24, rx: 4, class: 'mark ' + (pos ? 'pos' : 'neg') }, svg);
      el('text', { x: pos ? x1 + 8 : x1 - 8, y: yy + 24, 'text-anchor': pos ? 'start' : 'end', class: 'val' }, svg, (pos ? '▲ ' : '▼ ') + usd(a.net));
      b.addEventListener('pointermove', e => showTip(e, [{ value: usd(a.net), label: AREA[a.kind][0] + ' · ' + a.n + ' trades' }]));
      b.addEventListener('pointerleave', hideTip);
    });
    el('line', { x1: x(0), x2: x(0), y1: 0, y2: H, class: 'zero' }, svg);
    host.appendChild(svg);
  },
  areacount(host, d) {
    const rows = d.areas.filter(a => a.n > 0);
    if (!rows.length) { host.textContent = 'No closed trades yet.'; return; }
    hbars(host, rows.map(a => ({ name: AREA[a.kind][0], v: a.n, cls: 'a-' + a.kind })),
      Math.max(...rows.map(a => a.n)) * 1.05, v => v + ' trades', 'Closed trades with a result');
  },
};

// Call after the chart host elements (.chart[data-kind][data-chart]) are in the DOM, scoped
// to `root` (defaults to the whole document). DATA: {portfolio-mode: the data itself} or
// {scalp: {...}, options: {...}, swing: {...}} keyed by kind.
export function renderCharts(root, DATA) {
  (root || document).querySelectorAll('.chart').forEach(host => {
    host.textContent = '';
    const kind = host.dataset.kind, d = kind === 'portfolio' ? DATA : DATA[kind];
    if (d && (kind === 'portfolio' || d.m.n)) charts[host.dataset.chart](host, d);
  });
}
