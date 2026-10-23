// Port of app/weekly.py - the weekly wrap-up ritual. Almost entirely reuses perf.js/improve.js,
// the same functions the stats pages use, scoped to one week's rows - nothing here needs a
// Claude call.
import { listScalpTrades } from './db.js';
import { analyse } from './perf.js';
import { scalpAreas, focus } from './improve.js';
import * as setupC from './setup-c.js';
import { changeLog } from './strategy.js';
import { supabase } from './supabase-client.js';

function iso(d) { return d.toISOString().slice(0, 10); }

// Monday..Friday (ISO dates) for the week containing `ref` (default today).
export function weekBounds(ref = null) {
  const d = ref ? new Date(ref + 'T00:00:00') : new Date();
  const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(d); monday.setDate(d.getDate() - dow);
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
  return [iso(monday), iso(friday)];
}

function win(v) { return v !== null && v !== undefined && v > 0; }

function byDay(rows, monday) {
  const days = [];
  const m = new Date(monday + 'T00:00:00');
  for (let i = 0; i < 5; i++) { const d = new Date(m); d.setDate(m.getDate() + i); days.push(iso(d)); }
  const out = {};
  for (const d of days) out[d] = { date: d, trades: 0, net: 0, cats: {} };
  for (const r of rows) {
    if (!(r.date in out)) continue;
    const o = out[r.date];
    o.trades += 1;
    const c = r.category || '-';
    o.cats[c] = (o.cats[c] || 0) + 1;
    if (r.net_pnl !== null) o.net += r.net_pnl;
  }
  for (const d of days) out[d].net = Math.round(out[d].net * 100) / 100;
  return days.map(d => out[d]);
}

// Setup A/B only - Setup C is never folded into this, X-category trades are excluded.
export function tally2candle(rows) {
  const counts = { success: 0, fail: 0, contaminated: 0 };
  for (const r of rows) {
    if ((r.setup === 'A' || r.setup === 'B') && r.tally_2candle && counts[r.tally_2candle] !== undefined) counts[r.tally_2candle] += 1;
  }
  const scored = counts.success + counts.fail;
  const rate = scored ? Math.round(1000 * counts.success / scored) / 10 : null;
  return { ...counts, rate };
}

export async function weeklyReview(settings, ref = null) {
  const [monday, friday] = weekBounds(ref);
  const rows = await listScalpTrades({ lo: monday, hi: friday });
  const known = rows.filter(r => r.net_pnl !== null);
  const wins = known.filter(r => win(r.net_pnl));

  const ordered = [...known].sort((a, b) => (a.date + (a.entry_time || '')).localeCompare(b.date + (b.entry_time || '')) || a.id - b.id);
  const m = analyse(ordered.map(r => ({ label: `${r.trade_no} ${r.ticker}`, date: r.date, pnl: r.net_pnl, r: r.r_multiple }))).m;
  const areas = scalpAreas(rows, settings, m);
  const actionItems = focus(areas, m, 3, 'scalp');

  const setupCIds = rows.filter(r => r.setup === 'C').map(r => r.id);
  const scTally = { X: 0, C: 0, E: 0, 'not recorded': 0 };
  for (const tid of setupCIds) {
    const row = await setupC.get(tid);
    const key = row && row.result ? row.result : 'not recorded';
    scTally[key] = (scTally[key] || 0) + 1;
  }

  const { data: changes, error } = await supabase.from('strategy_change_log').select('*')
    .gte('date', monday).lte('date', friday).order('id');
  if (error) throw error;

  const categories = {};
  for (const r of rows) { const c = r.category || '-'; categories[c] = (categories[c] || 0) + 1; }
  const entryJudged = rows.filter(r => r.entry_valid === 'Y' || r.entry_valid === 'N');
  const exitJudged = rows.filter(r => r.exit_valid === 'Y' || r.exit_valid === 'N');

  return {
    monday, friday,
    n: rows.length, known: known.length, wins: wins.length, losses: known.length - wins.length,
    win_pct: known.length ? Math.round(1000 * wins.length / known.length) / 10 : null,
    net: Math.round(known.reduce((s, r) => s + r.net_pnl, 0) * 100) / 100,
    categories: Object.entries(categories).sort((a, b) => b[1] - a[1]),
    entry_ok: rows.length ? Math.round(100 * rows.filter(r => r.entry_valid === 'Y').length / rows.length * 10) / 10 : null,
    exit_ok: rows.length ? Math.round(100 * rows.filter(r => r.exit_valid === 'Y').length / rows.length * 10) / 10 : null,
    days: byDay(rows, monday),
    tally_2candle: tally2candle(rows),
    setup_c_tally: scTally,
    changes: changes || [],
    action_items: actionItems,
  };
}

export async function getWeeklyNotes(monday) {
  const { data, error } = await supabase.from('weekly_notes').select('*').eq('week_start', monday).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveWeeklyNotes(monday, actionItems, weekendPrep, notes) {
  const { error } = await supabase.from('weekly_notes').upsert({
    week_start: monday, action_items: actionItems, weekend_prep: weekendPrep, notes: notes,
  }, { onConflict: 'week_start' });
  if (error) throw error;
}
