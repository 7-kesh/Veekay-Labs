import assert from 'node:assert/strict';
import { tradingScore, gaugeSvg, radarSvg, overviewHtml } from './score.js';
const m = { n: 45, wins: 20, losses: 25, flat: 0, win_pct: 44.4, profit_factor: 1.57, payoff: 1.96, expectancy: 20.39 };
const points = ['10-01', '10-02', '10-03', '10-04'].map((d, i) => ({ date: '2026-' + d, pnl: i === 1 ? -30 : 50 }));
const s = tradingScore({ m, points, entryOk: { pct: 80 }, exitOk: { pct: 60 }, risk: 20 });
const by = Object.fromEntries(s.axes.map(a => [a.key, a.score]));
assert.equal(by.win, 74);            // 44.4 / 60
assert.equal(by.pf, 79);             // 1.57 / 2 (rounded)
assert.equal(by.rr, 98);
assert.equal(by.exp, 100);           // 20.39/20 = 1.02R -> capped
assert.equal(by.disc, 70);
assert.equal(by.cons, 75);           // 3 of 4 days >= 0
assert.equal(s.overall, Math.round((74 + 79 + 98 + 100 + 70 + 75) / 6));
assert.equal(s.lowSample, false);
// empty / thin data
const e = tradingScore({ m: { n: 0, wins: 0, losses: 0, flat: 0, win_pct: null, profit_factor: null, payoff: null, expectancy: null } });
assert.equal(e.overall, null); assert.ok(e.axes.every(a => a.score === null));
const w = tradingScore({ m: { n: 5, wins: 5, losses: 0, flat: 0, win_pct: 100, profit_factor: null, payoff: null, expectancy: 30 } });
assert.equal(w.axes.find(a => a.key === 'pf').score, 100, 'no losses -> top score, not missing');
assert.equal(w.lowSample, true);
// losing trader: expectancy negative clamps to 0
assert.equal(tradingScore({ m: { ...m, expectancy: -10 } }).axes.find(a => a.key === 'exp').score, 0);
// svg
const g = gaugeSvg(m); assert.ok(g.includes('var(--pos)') && g.includes('var(--neg)') && g.startsWith('<svg'));
assert.ok(!gaugeSvg({ n: 0, wins: 0, losses: 0, win_pct: null }).includes('var(--pos)'));
const rd = radarSvg(s.axes); assert.equal((rd.match(/<circle/g) || []).length, 6); assert.ok(rd.includes('Risk:Reward'));
assert.ok(!/NaN|undefined/.test(rd + g + overviewHtml(s, m)), 'no NaN/undefined in output');
console.log('score ok');
