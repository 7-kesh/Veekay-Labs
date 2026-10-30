// Port of app/improve.py - ranks the key areas to improve from the journal's own data.
// scalp_areas()/focus() only for now (plan_areas() needs options/swing plan rows, ported
// alongside that CRUD). Pure functions over trade rows, matches the Python rounding/ordering.
import { num as calcNum } from './calc.js';
import { VIOLATION_ACTIONS, VIOLATION_DIRECTIVES, OPTIONS_CHECKLIST, SWING_CHECKLIST, EXIT_SCENARIOS } from './constants.js';

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

export function planAreas(kind, plans, settings, m) {
  const closed = plans.filter(p => p.status === 'closed' && p.realized_pl !== null && p.realized_pl !== undefined);
  const items = [];
  const totalLoss = m.gross_loss || 0;

  function split(col) {
    return [closed.filter(p => p[col] === 'N'), closed.filter(p => p[col] === 'Y')];
  }
  for (const [col, title, action, directive] of [
    ['exit_followed', 'Exits that break the plan',
      'Decide the exit before entering and set the stop and target orders at entry. If the setup is invalid, exit by the rule, not by feel.',
      'Exit only at target, stop or a written invalidation'],
    ['entry_followed', 'Entries that skip the checklist',
      'Do not enter until every checklist item is ticked, including the entry trigger.',
      'Tick the whole checklist before you enter'],
  ]) {
    const [no, yes] = split(col);
    if (no.length) {
      const net = no.reduce((s, p) => s + p.realized_pl, 0);
      let ev = `${no.length} of ${no.length + yes.length} closed trades did not follow the plan; they netted ${usd(net)}`;
      ev += yes.length ? `, against ${usd(yes.reduce((s, p) => s + p.realized_pl, 0))} over ${yes.length} that did.` : '.';
      items.push(item(title, ev, action, { cost: net < 0 ? -net : null, n: no.length, directive }));
    }
  }

  const badExit = new Map();
  for (const p of closed) {
    if (['panic', 'held', 'early'].includes(p.exit_scenario)) {
      if (!badExit.has(p.exit_scenario)) badExit.set(p.exit_scenario, []);
      badExit.get(p.exit_scenario).push(p.realized_pl);
    }
  }
  const labels = Object.fromEntries(EXIT_SCENARIOS.map(([k, t]) => [k, t]));
  const styleLabel = { panic: 'panic', held: 'holding past the stop', early: 'taking profit early out of comfort' };
  for (const [k, vals] of badExit) {
    const sum = vals.reduce((s, v) => s + v, 0);
    items.push(item(`Exit style: ${(labels[k] || k).toLowerCase()}`, `${vals.length} trade(s), net ${usd(sum)}.`,
      'Use predefined exits only: planned target, planned stop, or a written invalidation rule.',
      { cost: sum < 0 ? -sum : null, n: vals.length, kind: 'behaviour', directive: `No exits by ${styleLabel[k]}` }));
  }

  const over = closed.filter(p => p.planned_loss && p.realized_pl < 0 && -p.realized_pl > p.planned_loss);
  if (over.length) {
    const extra = over.reduce((s, p) => s + (-p.realized_pl - p.planned_loss), 0);
    items.push(item('Losses bigger than planned', `${over.length} trade(s) lost more than the planned loss, by ${usd(extra)} in total.`,
      'Honor the stop. If a stop is not going to be honored, size the trade smaller so the real risk matches the plan.',
      { cost: extra, n: over.length, directive: 'Honor the stop on every trade' }));
  }

  const overbudget = plans.filter(p => p.planned_loss && p.account_balance && p.risk_pct !== null && p.risk_pct !== undefined
    && p.planned_loss > p.account_balance * p.risk_pct / 100 + 1e-9);
  if (overbudget.length) {
    items.push(item('Plans over the risk budget',
      `${overbudget.length} of ${plans.length} plans risk more than the ${overbudget[0].risk_pct}% budget (largest planned loss ${usd(Math.max(...overbudget.map(p => p.planned_loss)))}).`,
      `Use the Max ${kind === 'swing' ? 'shares' : 'contracts'} figure in the forecast row, or move the stop, before you enter.`,
      { n: overbudget.length, kind: 'data', directive: 'Size every plan within the risk budget' }));
  }

  // Futures: the rule-violation chips ticked on a trade, costed by what those trades lost.
  if (kind === 'futures') {
    const byTag = new Map();
    for (const p of closed) for (const t of (p.violations || [])) { if (!byTag.has(t)) byTag.set(t, []); byTag.get(t).push(p.realized_pl); }
    for (const [t, vals] of byTag) {
      const net = vals.reduce((a, v) => a + v, 0);
      if (net >= 0) continue;
      items.push(item(`Violation: ${t}`, `${vals.length} closed trade(s) tagged "${t}" netted ${usd(net)}.`,
        'Make this a pre-trade check: if it applies, skip the trade or fix it before entering.',
        { cost: -net, n: vals.length, directive: `Stop: ${t.toLowerCase()}` }));
    }
  }

  if (m.avg_win_r !== null && m.avg_win_r !== undefined && closed.length) {
    const planRR = closed.filter(p => p.rr).map(p => p.rr);
    const realR = closed.filter(p => p.realized_r !== null && p.realized_r !== undefined).map(p => p.realized_r);
    if (planRR.length && realR.length) {
      const avgReal = realR.reduce((s, v) => s + v, 0) / realR.length, avgPlan = planRR.reduce((s, v) => s + v, 0) / planRR.length;
      if (avgReal < 0.5 * avgPlan) {
        items.push(item('Realized R is far below planned R', `You plan about ${avgPlan.toFixed(2)}R and realize about ${avgReal.toFixed(2)}R on average.`,
          'Targets may be too far or exits too early. Compare the planned target with where price actually turned, and adjust the plan or hold to it.',
          { n: closed.length, kind: 'outcome' }));
      }
    }
  }

  const skipped = new Map();
  const names = Object.fromEntries(kind === 'options' ? OPTIONS_CHECKLIST : SWING_CHECKLIST);
  for (const p of plans) {
    if (p.actual_entry !== null && p.actual_entry !== undefined && p.checklist) {
      for (const [k, v] of Object.entries(p.checklist)) if (!v) skipped.set(k, (skipped.get(k) || 0) + 1);
    }
  }
  if (skipped.size) {
    const [k, c] = [...skipped.entries()].sort((a, b) => b[1] - a[1])[0];
    items.push(item('Checklist step skipped most often', `"${names[k] || k}" was not ticked on ${c} entered trade(s).`,
      'Make this the step you do first, before the chart looks exciting.',
      { n: c, kind: 'behaviour', directive: `Never skip: ${(names[k] || k).split(':')[0].toLowerCase()}` }));
  }

  if (m.breakeven_win_pct && m.win_pct < m.breakeven_win_pct) {
    items.push(item('Win rate is below break-even',
      `You win ${m.win_pct.toFixed(0)}% but need ${m.breakeven_win_pct.toFixed(0)}% at the current average win (${usd(m.avg_win)}) and loss (${usd(m.avg_loss)}).`,
      'Either raise the win rate with stricter entries, or widen the reward-to-risk of each plan.', { n: m.n, kind: 'outcome' }));
  }

  const today = new Date();
  const stale = plans.filter(p => (p.status === 'planned' || p.status === 'open') && p.plan_date);
  const old = stale.filter(p => (today - new Date(p.plan_date + 'T00:00:00')) / 86400000 >= 7);
  if (old.length) {
    items.push(item('Plans waiting for actuals', `${old.length} plan(s) have sat open for a week or more without actuals.`,
      'Close them out or cancel them. The plan-vs-actual comparison only works with actuals.', { n: old.length, kind: 'data' }));
  }

  return finish(items, totalLoss);
}
