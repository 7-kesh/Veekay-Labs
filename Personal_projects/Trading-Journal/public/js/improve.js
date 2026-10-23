// Port of app/improve.py - ranks the key areas to improve from the journal's own data.
// scalp_areas()/focus() only for now (plan_areas() needs options/swing plan rows, ported
// alongside that CRUD). Pure functions over trade rows, matches the Python rounding/ordering.
import { num as calcNum } from './calc.js';
import { VIOLATION_ACTIONS, VIOLATION_DIRECTIVES } from './constants.js';

function usd(v) { return v < 0 ? `-$${(-v).toFixed(2)}` : `$${v.toFixed(2)}`; }

// Drop notes like "(tag to confirm)".
function tag(s) { return s.replace(/\s*\(.*$/, '').trim(); }

function round(v, n = 2) { const f = Math.pow(10, n); return Math.round((v + Number.EPSILON) * f) / f; }

function item(title, evidence, action, { cost = null, n = 0, kind = 'rule', directive = null } = {}) {
  return { title, evidence, action, cost: cost ? round(cost) : null, n, kind, directive: directive || title };
}

function finish(items, totalLoss) {
  items.sort((a, b) => (b.cost || 0) - (a.cost || 0) || b.n - a.n);
  const out = items.slice(0, 6);
  out.forEach((it, i) => {
    it.rank = i + 1;
    const c = it.cost || 0;
    const share = totalLoss ? c / totalLoss : 0;
    it.severity = (c >= 100 || share >= 0.25) ? 'high' : ((c >= 40 || share >= 0.10) ? 'med' : 'low');
    it.share = c ? Math.round(100 * share) : null;
    it.per = (c && it.n) ? round(c / it.n) : null;
  });
  return out;
}

// The few specific things to stop or start now: behaviours that cost money, worst first.
// Narrow on purpose: umbrella items are skipped, so are items touching more than 35% of all
// trades, and items repeating another item's trades.
export function focus(items, m, limit = 3, area = null) {
  const out = [];
  const seen = new Set();
  for (const it of items) {
    if (!['rule', 'behaviour'].includes(it.kind) || !it.cost || out.length >= limit) continue;
    if (m.n && it.n > 0.35 * m.n && m.n >= 10) continue;
    const sig = `${it.n}:${it.cost}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({
      rank: out.length + 1, directive: it.directive, impact: it.severity, area,
      n: it.n, cost: it.cost, per: it.per, share: it.share, action: it.action,
      after: round(m.net + it.cost), net: m.net,
    });
  }
  return out;
}

export function scalpAreas(rows, settings, m) {
  const known = rows.filter(r => r.net_pnl !== null);
  const items = [];
  const totalLoss = m.gross_loss || 0;

  const judged = rows.filter(r => r.entry_valid === 'Y' || r.entry_valid === 'N');
  const bad = known.filter(r => r.entry_valid === 'N');
  const good = known.filter(r => r.entry_valid === 'Y');
  if (bad.length >= 3) {
    const net = bad.reduce((s, r) => s + r.net_pnl, 0);
    items.push(item('Entries that break the rules',
      `${judged.filter(r => r.entry_valid === 'N').length} of ${judged.length} judged entries were invalid. The ${bad.length} with results netted ${usd(net)}` +
      (good.length ? `, against ${usd(good.reduce((s, r) => s + r.net_pnl, 0))} over ${good.length} valid entries.` : '.'),
      'Take a trade only when every gate passes. If one fails, skip it and wait for the next setup.',
      { cost: net < 0 ? -net : null, n: bad.length, kind: 'umbrella', directive: 'Skip any trade where a gate fails' }));
  }

  const byTag = new Map();
  for (const r of known) {
    const tags = new Set((r.violations || '').split(';').map(tag).filter(Boolean));
    for (const t of tags) { if (!byTag.has(t)) byTag.set(t, []); byTag.get(t).push(r.net_pnl); }
  }
  const sortedTags = [...byTag.entries()].sort((a, b) => a[1].reduce((s, v) => s + v, 0) - b[1].reduce((s, v) => s + v, 0)).slice(0, 3);
  for (const [t, vals] of sortedTags) {
    const sum = vals.reduce((s, v) => s + v, 0);
    if (vals.length >= 3 && sum < 0) {
      items.push(item(`Violation: ${t}`, `Tagged on ${vals.length} trades with results; together they netted ${usd(sum)}.`,
        VIOLATION_ACTIONS[t] || 'Review these trades and add a rule or checklist step that prevents the repeat.',
        { cost: -sum, n: vals.length, directive: VIOLATION_DIRECTIVES[t] || `Stop: ${t.toLowerCase()}` }));
    }
  }

  const exBad = known.filter(r => r.exit_valid === 'N');
  const exJudged = rows.filter(r => r.exit_valid === 'Y' || r.exit_valid === 'N');
  if (exBad.length >= 3) {
    const net = exBad.reduce((s, r) => s + r.net_pnl, 0);
    items.push(item('Exits that break the plan',
      `${exJudged.filter(r => r.exit_valid === 'N').length} of ${exJudged.length} judged exits were invalid (early, emotional or off-plan). Those trades netted ${usd(net)}.`,
      'Scale out about 25% of the remaining position at the peak, then manage candle by candle. Exit early only on objective deterioration.',
      { cost: net < 0 ? -net : null, n: exBad.length, directive: 'Follow the exit plan: 25% scale-outs, then candle by candle' }));
  }

  const risk = calcNum(settings.scalp_risk_dollars, 20);
  const big = known.filter(r => r.net_pnl < -risk);
  if (big.length >= 2) {
    const excess = big.reduce((s, r) => s + (-r.net_pnl - risk), 0);
    items.push(item(`Losses bigger than 1R (${usd(risk)})`,
      `${big.length} losses exceeded 1R, by ${usd(excess)} in total. The worst was ${usd(Math.min(...known.map(r => r.net_pnl)))}.`,
      'Put the stop order in at entry and size so a stop-out costs no more than 1R. Do not hold or average down through the stop.',
      { cost: excess, n: big.length, directive: `Cap every loss at 1R (${usd(risk)})` }));
  }

  const emo = new Map();
  for (const r of known) {
    const tags = new Set((r.emotions || '').split(';').map(s => s.trim()).filter(Boolean));
    for (const t of tags) { if (!emo.has(t)) emo.set(t, []); emo.get(t).push(r.net_pnl); }
  }
  const sortedEmo = [...emo.entries()].sort((a, b) => a[1].reduce((s, v) => s + v, 0) - b[1].reduce((s, v) => s + v, 0)).slice(0, 2);
  for (const [t, vals] of sortedEmo) {
    const sum = vals.reduce((s, v) => s + v, 0);
    if (vals.length >= 3 && sum < 0 && t !== 'Calm / planned') {
      items.push(item(`Emotion: ${t}`, `Tagged on ${vals.length} trades; together they netted ${usd(sum)}.`,
        "Name the trigger before the next trade (a hard rule such as 'no re-entry for 5 minutes after a loss'), and stop for the day if it repeats.",
        { cost: -sum, n: vals.length, kind: 'behaviour', directive: `Don't trade while feeling: ${t.toLowerCase()}` }));
    }
  }

  const bySetup = new Map();
  for (const r of known) { if (r.setup) { if (!bySetup.has(r.setup)) bySetup.set(r.setup, []); bySetup.get(r.setup).push(r.net_pnl); } }
  const sortedSetup = [...bySetup.entries()].sort((a, b) => a[1].reduce((s, v) => s + v, 0) - b[1].reduce((s, v) => s + v, 0)).slice(0, 1);
  for (const [s, vals] of sortedSetup) {
    const sum = vals.reduce((s2, v) => s2 + v, 0);
    if (vals.length >= 5 && sum < 0) {
      items.push(item(`Setup ${s} is losing money`, `${vals.length} trades, net ${usd(sum)}.`,
        'Review these trades against the setup definition. Trade it smaller, or pause it, until the entries match the rule.',
        { cost: -sum, n: vals.length, directive: `Pause or shrink Setup ${s} until entries match the rule` }));
    }
  }

  const buckets = new Map();
  for (const r of known) {
    const t = r.entry_time || '';
    if (/^\d\d:\d\d/.test(t)) {
      const key = `${t.slice(0, 2)}:${parseInt(t.slice(3, 5), 10) < 30 ? '00' : '30'}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(r.net_pnl);
    }
  }
  const worstCandidates = [...buckets.entries()].filter(([, v]) => v.length >= 8)
    .map(([k, v]) => [v.reduce((s, x) => s + x, 0), k, v.length]).sort((a, b) => a[0] - b[0]);
  if (worstCandidates.length && worstCandidates[0][0] < -30) {
    const [sum, k, n] = worstCandidates[0];
    items.push(item(`Time of day: entries from ${k}`, `${n} trades in that half hour netted ${usd(sum)}.`,
      'Be pickier in that window, or sit it out. Check whether the setups there are lower quality.',
      { cost: -sum, n, kind: 'behaviour', directive: `Be selective with entries from ${k}` }));
  }

  if (m.breakeven_win_pct && m.win_pct < m.breakeven_win_pct) {
    items.push(item('Win rate is below break-even',
      `You win ${m.win_pct.toFixed(0)}% but need ${m.breakeven_win_pct.toFixed(0)}% at the current average win (${usd(m.avg_win)}) and loss (${usd(m.avg_loss)}).`,
      'Raise the win rate by skipping invalid entries, or raise the average win with the scale-out plan.',
      { n: m.n, kind: 'outcome' }));
  }

  const nostop = rows.filter(r => r.stop === null || r.stop === undefined);
  if (nostop.length >= 5) {
    items.push(item('Stops not recorded', `${nostop.length} of ${rows.length} trades have no stop on file, so risk and R can't be measured for them.`,
      'Fill in the stop on every trade. It is the number the whole risk rule depends on.', { n: nostop.length, kind: 'data' }));
  }

  return finish(items, totalLoss);
}
