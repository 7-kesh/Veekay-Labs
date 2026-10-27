import assert from 'node:assert/strict';
import { dayTotals, monthGrid, yearMonths, calendarHtml } from './calendar.js';

const t = dayTotals([
  { date: '2026-10-15', pnl: 0.58 }, { date: '2026-10-15', pnl: -0.08 },
  { date: '2026-10-06', pnl: -20 }, { date: '2026-09-30', pnl: 5 }, { date: '2026-10-20', pnl: null },
]);
assert.deepEqual(t.get('2026-10-15'), { net: 0.5, n: 2 });
assert.equal(t.has('2026-10-20'), false, 'entries without a P&L are skipped');

const g = monthGrid(2026, 9, t); // October 2026 starts on a Thursday
assert.equal(g.weeks[0].days[0].date, '2026-09-27');
assert.equal(g.weeks[0].days[4].date, '2026-10-01');
assert.equal(g.weeks[0].days[3].inMonth, false);
assert.equal(g.weeks.at(-1).days.some(d => d.date === '2026-10-31'), true, 'last week holds the 31st');
assert.equal(g.weeks.every(w => w.days.length === 7), true);
assert.deepEqual(g.month, { net: -19.5, n: 3, green: 1, red: 1 }, 'the Sep 30 trade is not in October');
const sep30 = g.weeks[0].days[3];
assert.equal(sep30.net, 5, 'day outside the month still shows its own total');
assert.equal(g.weeks[0].net, 0, 'but does not count toward the week total of this month');

const ym = yearMonths('2026', t);
assert.equal(ym[9].net, -19.5); assert.equal(ym[8].net, 5); assert.equal(ym[0].n, 0);

const html = calendarHtml({ account: 'live', view: 'month', y: 2026, m: 9 }, t, 1000);
assert.ok(html.includes('2026/10') && html.includes('-$19.50') && html.includes('+$0.50'), 'month html');
assert.ok(!/NaN|undefined/.test(html), 'no NaN/undefined');
const yh = calendarHtml({ account: 'paper', view: 'year', y: 2026, m: 9 }, t, 0);
assert.ok(yh.includes('Oct') && !/NaN|undefined/.test(yh), 'year html');
console.log('calendar ok');
