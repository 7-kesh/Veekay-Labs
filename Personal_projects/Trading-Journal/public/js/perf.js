// Port of app/perf.py - performance metrics and chart data for a series of closed trades.
// Pure functions, no DB/network - easy to parity-test against the Python version.

function round(v, n = 2) {
  const f = Math.pow(10, n);
  return Math.round((v + Number.EPSILON) * f) / f;
}

function niceStep(raw) {
  if (raw <= 0) return 1.0;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * p) return m * p;
  return 10 * p;
}

// Dollar bins with a boundary at zero, so every bin is entirely wins or entirely losses.
export function histogram(values, targetBins = 10) {
  if (!values.length) return [];
  const lo = Math.min(...values), hi = Math.max(...values);
  const step = niceStep((hi - lo) / targetBins || 1);
  const start = Math.floor(lo / step) * step;
  const bins = [];
  for (let x = start; x <= hi + 1e-9; x += step) bins.push({ lo: round(x, 4), hi: round(x + step, 4), n: 0 });
  for (const v of values) {
    const i = Math.min(Math.floor((v - start) / step), bins.length - 1);
    bins[i].n += 1;
  }
  for (const b of bins) b.sign = (b.lo + b.hi) / 2 > 0 ? 1 : -1;
  return bins;
}

function usd(v) { return `$${v.toFixed(2)}`; }

export function insights(m) {
  const out = [];
  if (m.n < 5) return [`Only ${m.n} closed trades so far. Treat the numbers below as a first look, not a verdict.`];
  if (m.avg_win && m.avg_loss) {
    out.push(`Winning margin vs losing margin: the average win is ${usd(m.avg_win)} and the average loss is ${usd(m.avg_loss)}, so a win is ${m.payoff.toFixed(2)}× a loss.`);
    const gap = m.win_pct - m.breakeven_win_pct;
    if (gap >= 0) {
      out.push(`At these margins you need to win ${m.breakeven_win_pct.toFixed(0)}% of trades to break even. You win ${m.win_pct.toFixed(0)}%, which is ${gap.toFixed(0)} points above that.`);
    } else {
      out.push(`At these margins you need to win ${m.breakeven_win_pct.toFixed(0)}% of trades to break even. You win ${m.win_pct.toFixed(0)}%, which is ${(-gap).toFixed(0)} points short. Either the wins must get larger or the losses smaller.`);
    }
  } else if (m.avg_loss && !m.avg_win) {
    out.push('No winning trades in this period.');
  }
  if (m.profit_factor) out.push(`Profit factor ${m.profit_factor.toFixed(2)}: every $1 lost earned back ${usd(m.profit_factor)}.`);
  if (m.worst && m.avg_loss && m.worst > 2 * m.avg_loss) {
    out.push(`The worst loss (${usd(m.worst)}) is ${(m.worst / m.avg_loss).toFixed(1)}× the average loss. One oversized loss is doing much of the damage; check whether the stop was honored.`);
  }
  if (m.best && m.avg_win && m.best > 3 * m.avg_win) {
    out.push(`The best win (${usd(m.best)}) is ${(m.best / m.avg_win).toFixed(1)}× the average win. Results lean on a few big winners.`);
  }
  if (m.avg_win_r && m.avg_loss_r) out.push(`In R terms: average win ${m.avg_win_r.toFixed(2)}R against average loss ${m.avg_loss_r.toFixed(2)}R.`);
  out.push(`Expectancy is ${m.expectancy >= 0 ? usd(m.expectancy) : '-' + usd(-m.expectancy)} per trade; the largest peak-to-trough drawdown was ${usd(m.max_drawdown)}.`);
  return out;
}

// items: [{label, date, pnl, r}] in time order. Returns metrics, points and plain-English insights.
export function analyse(items) {
  const pts = [];
  let cum = 0, peak = 0, maxDd = 0;
  items.forEach((it, idx) => {
    cum += it.pnl;
    peak = Math.max(peak, cum);
    maxDd = Math.max(maxDd, peak - cum);
    pts.push({ i: idx + 1, label: it.label, date: it.date, pnl: round(it.pnl), cum: round(cum) });
  });
  const wins = items.filter(it => it.pnl > 0).map(it => it.pnl);
  const losses = items.filter(it => it.pnl < 0).map(it => -it.pnl);
  const n = items.length;
  const m = {
    n, wins: wins.length, losses: losses.length, flat: n - wins.length - losses.length,
    net: round(cum), max_drawdown: round(maxDd),
    win_pct: null, loss_pct: null, expectancy: null,
  };
  if (n) {
    m.win_pct = round(100 * wins.length / n, 1);
    m.loss_pct = round(100 * losses.length / n, 1);
    m.expectancy = round(cum / n);
  }
  m.gross_profit = round(wins.reduce((a, b) => a + b, 0));
  m.gross_loss = round(losses.reduce((a, b) => a + b, 0));
  m.avg_win = wins.length ? round(wins.reduce((a, b) => a + b, 0) / wins.length) : null;
  m.avg_loss = losses.length ? round(losses.reduce((a, b) => a + b, 0) / losses.length) : null;
  m.best = wins.length ? round(Math.max(...wins)) : null;
  m.worst = losses.length ? round(Math.max(...losses)) : null;
  m.payoff = (wins.length && losses.length) ? round(m.avg_win / m.avg_loss) : null;
  m.profit_factor = (losses.length && wins.length) ? round(m.gross_profit / m.gross_loss) : null;
  m.breakeven_win_pct = (wins.length && losses.length) ? round(100 * m.avg_loss / (m.avg_win + m.avg_loss), 1) : null;
  const rw = items.filter(it => it.r !== null && it.r !== undefined && it.pnl > 0).map(it => it.r);
  const rl = items.filter(it => it.r !== null && it.r !== undefined && it.pnl < 0).map(it => -it.r);
  m.avg_win_r = rw.length ? round(rw.reduce((a, b) => a + b, 0) / rw.length) : null;
  m.avg_loss_r = rl.length ? round(rl.reduce((a, b) => a + b, 0) / rl.length) : null;
  return { m, points: pts, bins: histogram(items.map(it => it.pnl)), insights: insights(m) };
}
