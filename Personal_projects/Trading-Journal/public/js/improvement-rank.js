// Ranks imported improvements by what their target costs in the real trades, and measures a
// target before vs after an improvement was adopted. Plain arithmetic, no AI. Pure (Node-testable).

export const MIN_AFTER_TRADES = 5;

const tagsOf = r => new Set(String(r.violations || '').split(';').map(s => s.trim()).filter(Boolean));
const pnl = r => (typeof r.net_pnl === 'number' ? r.net_pnl : null);
const closed = trades => trades.filter(r => pnl(r) !== null);
const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const round2 = v => (v === null ? null : Math.round(v * 100) / 100);

function scope(trades, target) {
  const base = closed(trades);
  return target && target.setup ? base.filter(r => r.setup === target.setup) : base;
}

// Metric value over a set of trades (null when there is nothing to measure).
export function metricValue(metric, trades) {
  const t = closed(trades);
  if (metric === 'win_rate') return t.length ? round2(100 * t.filter(r => pnl(r) > 0).length / t.length) : null;
  if (metric === 'avg_loser') return round2(mean(t.filter(r => pnl(r) < 0).map(pnl)));
  if (metric === 'avg_winner') return round2(mean(t.filter(r => pnl(r) > 0).map(pnl)));
  if (metric === 'avg_r') return round2(mean(t.filter(r => typeof r.r_multiple === 'number').map(r => r.r_multiple)));
  return null;
}

// Dollar cost of a violation target over the given trades: the net P&L lost on trades carrying
// the tag (0 when those trades netted positive). Metric / none targets have no dollar cost.
export function targetCost(item, trades) {
  if (item.target_type !== 'violation') return { cost: null, n: 0 };
  const tagged = closed(trades).filter(r => tagsOf(r).has(item.target_value));
  const sum = tagged.reduce((s, r) => s + pnl(r), 0);
  return { cost: sum < 0 ? round2(-sum) : 0, n: tagged.length };
}

// Active (proposed/adopted) first, violation targets by dollar cost, then the rest newest first.
export function rankImprovements(items, trades) {
  return items
    .filter(i => i.status === 'proposed' || i.status === 'adopted')
    .map(i => ({ ...i, ...targetCost(i, trades) }))
    .sort((a, b) => {
      const ca = a.cost ?? -1, cb = b.cost ?? -1;
      if (ca !== cb) return cb - ca;
      return String(b.date).localeCompare(String(a.date)) || b.id - a.id;
    });
}

// Before/after the adoption date. `enough` is false until MIN_AFTER_TRADES trades exist after it.
export function beforeAfter(item, trades) {
  if (!item.adopted_on) return null;
  const target = { setup: item.target_setup };
  const all = scope(trades, target);
  const before = all.filter(r => r.date < item.adopted_on);
  const after = all.filter(r => r.date >= item.adopted_on);
  const side = (rows) => {
    if (item.target_type === 'violation') {
      const tagged = rows.filter(r => tagsOf(r).has(item.target_value));
      return { trades: rows.length, tagged: tagged.length,
        rate: rows.length ? round2(100 * tagged.length / rows.length) : null,
        net: round2(tagged.reduce((s, r) => s + pnl(r), 0)) };
    }
    if (item.target_type === 'metric') return { trades: rows.length, value: metricValue(item.target_value, rows) };
    return { trades: rows.length };
  };
  return { enough: after.length >= MIN_AFTER_TRADES, before: side(before), after: side(after) };
}
