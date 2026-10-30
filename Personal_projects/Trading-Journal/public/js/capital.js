// Capital per area. Each area (scalp / options / swing) has its own starting capital in Settings.
//   level     = starting capital + realized P&L so far (the portfolio amount, kept up to date)
//   in open   = money tied up in trades that are still open (options: premium x 100 x contracts)
//   available = level - in open  (what a new trade can be sized against)
// Pure (no DOM / network), so it is unit tested in Node.
export const AREAS = ['scalp', 'options', 'swing', 'futures'];
export const AREA_LABEL = { scalp: 'Scalp', options: 'Options', swing: 'Swing', futures: 'Futures' };
const MULT = { scalp: 1, options: 100, swing: 1, futures: 1 };
const r2 = v => Math.round(v * 100) / 100;
const n = v => { const x = parseFloat(String(v ?? '').replace(/[$,]/g, '')); return Number.isFinite(x) ? x : 0; };

export function startingCapital(settings, kind) { return n(settings['capital_' + kind]); }

// Cost of one open position, or null when the row is not an open position.
// scalp: no result yet, no exits typed, and it has both an entry and shares (old imports without
// shares are incomplete rows, not open trades). options / swing: status 'open'.
export function openCost(kind, row) {
  if (kind === 'scalp') {
    if (row.net_pnl !== null && row.net_pnl !== undefined) return null;
    if (String(row.exits_text || '').trim()) return null;
    return n(row.entry_price) > 0 && n(row.shares) > 0 ? r2(n(row.entry_price) * n(row.shares)) : null;
  }
  if (row.status !== 'open') return null;
  if (kind === 'futures') return n(row.margin_used) > 0 ? r2(n(row.margin_used)) : null; // futures ties up margin, not price x size
  const px = n(row.actual_entry) > 0 ? n(row.actual_entry) : n(row.entry_price);
  return px > 0 && n(row.qty) > 0 ? r2(px * MULT[kind] * n(row.qty)) : null;
}

// entries: [{kind, pnl, account}]; open: [{kind, id, account, cost}].
// opts.account: 'live' | 'paper' | 'all'; opts.excludeId drops one open position (the plan being edited).
export function capitalSummary(settings, kind, entries, open, { account = 'all', excludeId = null } = {}) {
  const inAcct = a => account === 'all' || a === account;
  const start = startingCapital(settings, kind);
  const realized = r2(entries.filter(e => e.kind === kind && inAcct(e.account)).reduce((s, e) => s + (e.pnl || 0), 0));
  const positions = open.filter(o => o.kind === kind && inAcct(o.account) && (excludeId === null || o.id !== excludeId));
  const inOpen = r2(positions.reduce((s, o) => s + o.cost, 0));
  const level = r2(start + realized);
  return { kind, start, realized, level, inOpen, available: r2(level - inOpen), openCount: positions.length, set: start > 0 || level > 0 };
}

export function overallSummary(settings, entries, open, opts) {
  const parts = AREAS.map(k => capitalSummary(settings, k, entries, open, opts));
  const sum = f => r2(parts.reduce((s, p) => s + p[f], 0));
  return { kind: 'all', start: sum('start'), realized: sum('realized'), level: sum('level'), inOpen: sum('inOpen'), available: sum('available'),
    openCount: parts.reduce((s, p) => s + p.openCount, 0), set: parts.some(p => p.set) };
}

// Portfolio level over time for a scope ('all' or an area): starting capital, then one point per
// trading day. Dates after today are plotted on today (a placeholder exit date is still realized P&L).
export function levelSeries(settings, scope, entries, { account = 'all', today } = {}) {
  const kinds = scope === 'all' ? AREAS : [scope];
  const start = kinds.reduce((s, k) => s + startingCapital(settings, k), 0);
  const byDay = new Map();
  for (const e of entries) {
    if (!kinds.includes(e.kind) || !(account === 'all' || e.account === account) || !e.date) continue;
    const d = today && e.date > today ? today : e.date;
    byDay.set(d, r2((byDay.get(d) || 0) + e.pnl));
  }
  let level = start;
  const points = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, pnl]) => ({ date, level: (level = r2(level + pnl)), pnl }));
  return { start, points };
}

const usd = v => (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export { usd as capUsd };

// One-line portfolio strip for forms and list headers.
export function stripHtml(s, label) {
  if (!s.set) return `<div class="capstrip unset"><b>${label} portfolio</b> not set - add the starting capital in <a href="#/settings">Settings</a>.</div>`;
  return `<div class="capstrip${s.available < 0 ? ' over' : ''}"><b>${label} portfolio</b>
    <span>Level <i>${usd(s.level)}</i></span><span>In open trades <i>${usd(s.inOpen)}</i>${s.openCount ? ` <small>(${s.openCount})</small>` : ''}</span>
    <span>Available <i class="av">${usd(s.available)}</i></span></div>`;
}
