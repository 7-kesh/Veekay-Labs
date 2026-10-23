import assert from 'node:assert/strict';
import { analyse, histogram } from './perf.js';

{
  const items = [30, -10, -10, 20, -10, 0].map(p => ({ label: 'a', date: 'd', pnl: p, r: null }));
  const a = analyse(items).m;
  assert.equal(a.n, 6); assert.equal(a.wins, 2); assert.equal(a.losses, 3); assert.equal(a.flat, 1);
  assert.equal(a.net, 20); assert.equal(a.avg_win, 25); assert.equal(a.avg_loss, 10); assert.equal(a.payoff, 2.5);
  assert.equal(a.profit_factor, 1.67); assert.equal(a.breakeven_win_pct, 28.6); assert.equal(a.max_drawdown, 20);

  const bins = histogram([30, -10, -10, 20, -10, 0]);
  assert.equal(bins.reduce((s, b) => s + b.n, 0), 6);
  assert.ok(bins.every(b => b.lo * b.hi >= 0));
}

{
  const m = analyse([]).m;
  assert.equal(m.n, 0); assert.equal(m.win_pct, null); assert.equal(m.expectancy, null); assert.equal(m.avg_win, null);
}

console.log('all perf.js parity tests passed');
