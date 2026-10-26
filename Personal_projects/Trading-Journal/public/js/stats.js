// Port of app/routes.py's _stats_data()/_portfolio() - the data aggregation behind every
// stats page. Pure data shaping over already-ported perf.js/improve.js; no new math here.
import { listScalpTrades, listPlans, getSettings } from './db.js';
import { analyse } from './perf.js';
import { scalpAreas, planAreas, focus } from './improve.js';
import { EXIT_SCENARIOS } from './constants.js';
import { periodBounds } from './period.js';

export const KINDS = ['options', 'swing'];
const KIND_LABEL = { scalp: 'Scalp', options: 'Options', swing: 'Swing' };

export { periodBounds };

function win(v) { return v !== null && v !== undefined && v > 0; }
function avg(vals) { vals = vals.filter(v => v !== null && v !== undefined); return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100 : null; }
function rate(rows, col) {
  const got = rows.map(r => r[col]).filter(v => v === 'Y' || v === 'N');
  const y = got.filter(v => v === 'Y').length;
  return { y, of: got.length, pct: got.length ? Math.round(100 * y / got.length) : null };
}
function counterTop(items, n) {
  const m = new Map();
  for (const it of items) m.set(it, (m.get(it) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}
function monday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export async function statsData(period = 'all', account = 'all') {
  const [lo, hi] = periodBounds(period);
  const settings = await getSettings();
  const rows = await listScalpTrades({ lo, hi, account });
  const known = rows.filter(r => r.net_pnl !== null);
  const wins = known.filter(r => win(r.net_pnl));
  const rs = known.map(r => r.r_multiple).filter(v => v !== null && v !== undefined);

  const scalp = {
    n: rows.length, known: known.length, wins: wins.length, losses: known.length - wins.length,
    win_pct: known.length ? Math.round(1000 * wins.length / known.length) / 10 : null,
    net: Math.round(known.reduce((s, r) => s + r.net_pnl, 0) * 100) / 100,
    avg_r: rs.length ? Math.round(rs.reduce((s, v) => s + v, 0) / rs.length * 100) / 100 : null,
    entry_ok: rate(rows, 'entry_valid'), exit_ok: rate(rows, 'exit_valid'),
    categories: counterTop(rows.map(r => r.category || '-'), 100),
    violations: counterTop(rows.flatMap(r => (r.violations || '').split(';').map(s => s.trim()).filter(Boolean)), 8),
    emotions: counterTop(rows.flatMap(r => (r.emotions || '').split(';').map(s => s.trim()).filter(Boolean)), 8),
  };

  const ordered = [...known].sort((a, b) => (a.date + (a.entry_time || '')).localeCompare(b.date + (b.entry_time || '')) || a.id - b.id);
  const charts = { scalp: analyse(ordered.map(r => ({ label: `${r.trade_no} ${r.ticker}`, date: r.date, pnl: r.net_pnl, r: r.r_multiple }))) };
  const areas = { scalp: scalpAreas(rows, settings, charts.scalp.m) };

  const bySetup = new Map();
  const byWeek = new Map();
  for (const r of rows) {
    const key = r.setup || 'not recorded';
    if (!bySetup.has(key)) bySetup.set(key, [0, 0, 0]);
    const s = bySetup.get(key); s[0] += 1;
    if (r.net_pnl !== null) {
      s[1] += win(r.net_pnl) ? 1 : 0; s[2] += r.net_pnl;
      const wk = monday(r.date);
      if (!byWeek.has(wk)) byWeek.set(wk, [0, 0]);
      const w = byWeek.get(wk); w[0] += 1; w[1] += r.net_pnl;
    }
  }

  const plans = {};
  for (const kind of KINDS) {
    const pr = await listPlans(kind, { account });
    const prFiltered = lo ? pr.filter(p => p.plan_date >= lo && p.plan_date <= hi) : pr;
    const closed = prFiltered.filter(p => p.status === 'closed');
    const byExit = [...closed].sort((a, b) => ((a.exit_date || a.plan_date) + '').localeCompare((b.exit_date || b.plan_date) + '') || a.id - b.id);
    charts[kind] = analyse(byExit.filter(p => p.realized_pl !== null && p.realized_pl !== undefined)
      .map(p => ({ label: `${p.ticker} ${p.direction}`, date: p.exit_date || p.plan_date, pnl: p.realized_pl, r: p.realized_r })));
    areas[kind] = planAreas(kind, prFiltered, settings, charts[kind].m);
    plans[kind] = {
      n: prFiltered.length, open: prFiltered.filter(p => p.status === 'planned' || p.status === 'open').length, closed: closed.length,
      wins: closed.filter(p => win(p.realized_pl)).length,
      net: Math.round(closed.reduce((s, p) => s + (p.realized_pl || 0), 0) * 100) / 100,
      avg_plan_rr: avg(closed.map(p => p.rr)), avg_r: avg(closed.map(p => p.realized_r)),
      entry_ok: rate(prFiltered, 'entry_followed'), exit_ok: rate(prFiltered, 'exit_followed'),
      scenarios: counterTop(closed.map(p => p.exit_scenario).filter(Boolean), 100),
    };
  }

  const focusByKind = {};
  for (const k of ['scalp', ...KINDS]) focusByKind[k] = focus(areas[k], charts[k].m, 3, k);

  return {
    period, account, charts, areas, focus: focusByKind, scalp,
    by_setup: [...bySetup.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    by_week: [...byWeek.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12),
    plans, scenario_label: Object.fromEntries(EXIT_SCENARIOS.map(([k, t]) => [k, t])),
  };
}

function byDay(points) {
  const days = {};
  for (const p of points) days[p.date] = p.cum;
  return Object.entries(days).sort((a, b) => a[0].localeCompare(b[0])).map(([date, cum]) => ({ date, cum }));
}

export function portfolio(d) {
  const kinds = ['scalp', ...KINDS];
  const merged = kinds.flatMap(k => d.charts[k].points.map(p => ({ label: `${KIND_LABEL[k]} ${p.label}`, date: p.date, pnl: p.pnl, r: null })));
  merged.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const total = analyse(merged);

  const series = {};
  for (const k of kinds) series[k] = byDay(d.charts[k].points);
  series.total = byDay(total.points);

  const leaks = kinds.flatMap(k => d.focus[k]).sort((a, b) => b.cost - a.cost).slice(0, 5);

  return {
    total, series, leaks, kinds,
    chartjson: { series, areas: kinds.map(k => ({ kind: k, net: d.charts[k].m.net, n: d.charts[k].m.n })) },
  };
}
