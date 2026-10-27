import assert from 'node:assert/strict';
import { openCost, capitalSummary, overallSummary, levelSeries, stripHtml, startingCapital } from './capital.js';

const settings = { capital_scalp: '2000', capital_options: '$3,000', capital_swing: '0' };
assert.equal(startingCapital(settings, 'options'), 3000, 'currency formatting is tolerated');

// HPE: 1 contract at $4.55 = $455 tied up
assert.equal(openCost('options', { status: 'open', actual_entry: 4.55, entry_price: 4.4, qty: 1 }), 455, 'actual entry wins over planned');
assert.equal(openCost('options', { status: 'planned', entry_price: 4.55, qty: 1 }), null, 'planned is not open');
assert.equal(openCost('options', { status: 'closed', entry_price: 4.55, qty: 1 }), null);
assert.equal(openCost('swing', { status: 'open', entry_price: 50, qty: 10 }), 500);
assert.equal(openCost('scalp', { net_pnl: null, entry_price: 8.45, shares: null }), null, 'import row without shares is not a position');
assert.equal(openCost('scalp', { net_pnl: null, entry_price: 10, shares: 50, exits_text: '' }), 500);
assert.equal(openCost('scalp', { net_pnl: null, entry_price: 10, shares: 50, exits_text: 'exit 11' }), null, 'has exits');
assert.equal(openCost('scalp', { net_pnl: 5, entry_price: 10, shares: 50 }), null, 'has a result');

const open = [{ kind: 'options', id: 2, account: 'live', cost: 455 }, { kind: 'options', id: 9, account: 'paper', cost: 100 }];
const entries = [{ kind: 'options', pnl: 109.96, account: 'live', date: '2026-10-30' }, { kind: 'scalp', pnl: -20, account: 'live', date: '2026-10-26' }, { kind: 'scalp', pnl: 50, account: 'paper', date: '2026-10-26' }];

const o = capitalSummary(settings, 'options', entries, open, { account: 'live' });
assert.deepEqual([o.start, o.realized, o.level, o.inOpen, o.available, o.openCount], [3000, 109.96, 3109.96, 455, 2654.96, 1]);
assert.equal(capitalSummary(settings, 'options', entries, open, { account: 'paper' }).inOpen, 100, 'paper pool is separate from live');
assert.equal(capitalSummary(settings, 'options', entries, open, { account: 'live', excludeId: 2 }).inOpen, 0, 'editing the open plan frees its own cost');
const sw = capitalSummary(settings, 'swing', entries, open, { account: 'live' });
assert.equal(sw.set, false, 'swing with 0 capital is "not set"');
const all = overallSummary(settings, entries, open, { account: 'live' });
assert.equal(all.start, 5000); assert.equal(all.level, 5089.96); assert.equal(all.available, 4634.96);

const ls = levelSeries(settings, 'all', entries, { account: 'live', today: '2026-10-27' });
assert.equal(ls.start, 5000);
assert.deepEqual(ls.points.map(p => [p.date, p.level]), [['2026-10-26', 4980], ['2026-10-27', 5089.96]], 'future date plotted on today');
assert.equal(levelSeries(settings, 'scalp', entries, { account: 'all', today: '2026-10-27' }).points.at(-1).level, 2030);

assert.ok(stripHtml(o, 'Options').includes('$2,654.96') && !/NaN|undefined/.test(stripHtml(o, 'Options')));
assert.ok(stripHtml(sw, 'Swing').includes('Settings'));
console.log('capital ok');
