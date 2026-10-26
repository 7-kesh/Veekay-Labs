import assert from 'node:assert/strict';
import { validateWrapup, parseWrapupText } from './wrapup.js';
import { rankImprovements, beforeAfter, metricValue, targetCost } from './improvement-rank.js';

const good = {
  schema: 'tj-wrapup/1', date: '2026-10-26',
  journal_entry: { summary: 'Choppy day.', trades: [
    { trade_no: 'T104', verdict: 'Entry invalid, early exit', category: 'C', violations: ['Early exit', 'Some new tag'], lesson: 'Wait for C2.' }] },
  learnings: [{ text: 'C2 must cross intrabar', trade_nos: ['T104'] }],
  improvements: [
    { text: 'Hold to the exit plan', target: { type: 'violation', value: 'Early exit' }, trade_nos: ['T104'] },
    { text: 'Raise Setup B win rate', target: { type: 'metric', value: 'win_rate', setup: 'B' }, trade_nos: [] },
    { text: 'Be calmer', target: { type: 'none' }, trade_nos: [] }],
  strategy_flags: ['Consider 0.15 extension'],
};
let r = validateWrapup(good);
assert.ok(r.ok, r.errors.join('\n'));
assert.equal(r.warnings.length, 1);
assert.equal(r.data.improvements[1].target.setup, 'B');
assert.ok(validateWrapup('```json\n' + JSON.stringify(good) + '\n```').ok, 'fenced block accepted');

const bad = (mut) => { const o = JSON.parse(JSON.stringify(good)); mut(o); return validateWrapup(o); };
assert.ok(!validateWrapup('{nope').ok);
assert.ok(!bad(o => { o.schema = 'tj-wrapup/2'; }).ok);
assert.ok(!bad(o => { o.date = '10/26/2026'; }).ok);
assert.ok(!bad(o => { o.journal_entry.trades[0].trade_no = '104'; }).ok);
assert.ok(!bad(o => { o.journal_entry.trades[0].category = 'Z'; }).ok);
assert.ok(!bad(o => { o.improvements[0].target.value = 'Not a tag'; }).ok);
assert.ok(!bad(o => { o.improvements[1].target.value = 'reset_breaches'; }).ok);
assert.ok(!bad(o => { delete o.learnings; }).ok);
const multi = bad(o => { o.schema = 'x'; o.date = 'y'; });
assert.equal(multi.errors.length, 2, 'all problems reported, not just the first');

// ---- ranking / before-after
const T = (date, net, v = '', setup = 'B', r_multiple = net / 20) => ({ date, net_pnl: net, violations: v, setup, r_multiple });
const trades = [
  T('2026-10-01', -30, 'Early exit'), T('2026-10-02', -10, 'Early exit; Late entry / setup expired'),
  T('2026-10-03', 40), T('2026-10-04', -50, 'Late entry / setup expired'),
  T('2026-10-10', 20), T('2026-10-11', 30), T('2026-10-12', -10, 'Early exit'), T('2026-10-13', 25), T('2026-10-14', 15), T('2026-10-15', 10),
];
const items = [
  { id: 1, date: '2026-10-05', text: 'a', status: 'proposed', target_type: 'violation', target_value: 'Early exit' },
  { id: 2, date: '2026-10-05', text: 'b', status: 'adopted', target_type: 'violation', target_value: 'Late entry / setup expired', adopted_on: '2026-10-10', target_setup: null },
  { id: 3, date: '2026-10-06', text: 'c', status: 'proposed', target_type: 'metric', target_value: 'win_rate' },
  { id: 4, date: '2026-10-06', text: 'd', status: 'dropped', target_type: 'none' },
];
assert.deepEqual(targetCost(items[0], trades), { cost: 50, n: 3 });
const ranked = rankImprovements(items, trades);
assert.deepEqual(ranked.map(i => i.id), [2, 1, 3], 'dropped excluded; higher dollar cost first; metric last');
assert.equal(ranked[0].cost, 60);
const ba = beforeAfter(items[1], trades);
assert.ok(ba.enough);
assert.equal(ba.before.tagged, 2); assert.equal(ba.after.tagged, 0); assert.equal(ba.after.trades, 6);
assert.equal(beforeAfter({ ...items[1], adopted_on: '2026-10-14' }, trades).enough, false);
assert.equal(beforeAfter(items[0], trades), null, 'not adopted -> no before/after');
assert.equal(metricValue('win_rate', trades), 60);
assert.equal(metricValue('avg_loser', trades), -25);
assert.equal(metricValue('avg_winner', trades), 23.33);
assert.equal(beforeAfter({ ...items[2], adopted_on: '2026-10-10' }, trades).after.value, 83.33);
console.log('wrapup + improvement-rank ok');

// ---- journal export round trip
import { dayToWrapup, dayToJson, batchToJson, dayToMarkdown, groupDays } from './journal-export.js';
import { validateAny } from './wrapup.js';
const rows = groupDays(
  [{ date: '2026-10-26', summary: 'Choppy day.', trades: [{ trade_no: 'T104', verdict: 'v', category: 'C', violations: ['Early exit'], lesson: 'l|x' }] }],
  [{ date: '2026-10-26', text: 'learn', trade_nos: ['T104'] }],
  [{ date: '2026-10-26', text: 'imp', target_type: 'violation', target_value: 'Early exit', target_setup: null, trade_nos: [], status: 'adopted', adopted_on: '2026-10-27', resolved_on: null },
   { date: '2026-10-26', text: 'imp2', target_type: 'none', target_value: null, target_setup: null, trade_nos: [], status: 'proposed' }]);
assert.equal(rows.length, 1);
const back = validateAny(dayToJson(rows[0]));
assert.ok(back.ok, back.errors.join('\n'));
assert.equal(back.days[0].improvements[0].status, 'adopted');
assert.equal(back.days[0].improvements[0].adopted_on, '2026-10-27');
const two = [rows[0], { ...rows[0], date: '2026-10-27' }];
const b = validateAny(batchToJson(two));
assert.ok(b.ok && b.days.length === 2, b.errors.join('\n'));
const badBatch = JSON.parse(batchToJson(two)); badBatch.wrapups[1].date = 'nope';
const bb = validateAny(badBatch);
assert.ok(!bb.ok && bb.errors[0].startsWith('wrapups[1].'), 'batch errors name the day');
assert.ok(!validateAny({ schema: 'tj-wrapup-batch/1', wrapups: [] }).ok);
assert.ok(dayToMarkdown(rows[0]).includes('l\\|x'), 'pipes escaped in markdown table');
console.log('journal export ok');
