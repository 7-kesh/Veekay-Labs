import assert from 'node:assert/strict';
import { checkSize, checkStopRecorded, check5minReset, checkCategoryConsistency, run, runStrategy } from './rule-engine.js';

const by = (flags, name) => flags.find(f => f.check === name);

assert.equal(checkSize({ entry_price: "8.50", stop: "8.10", shares: "50" }, 20).status, "pass");
assert.equal(checkSize({ entry_price: "8.50", stop: "8.10", shares: "100" }, 20).status, "fail");
assert.equal(checkSize({ entry_price: "8.50", stop: "", shares: "50" }, 20).status, "insufficient_evidence");

assert.equal(checkStopRecorded({ stop: "8.10" }).status, "pass");
assert.equal(checkStopRecorded({ stop: "" }).status, "fail");

assert.equal(check5minReset({ entry_time: "09:30" }, null).status, "pass");
assert.equal(check5minReset({ entry_time: "09:33" }, "09:30").status, "fail");
assert.equal(check5minReset({ entry_time: "09:36" }, "09:30").status, "pass");

assert.equal(checkCategoryConsistency({ category: "A", violations: [] }).status, "pass");
assert.equal(checkCategoryConsistency({ category: "A", violations: ["Extended / chase"] }).status, "fail");
assert.equal(checkCategoryConsistency({ category: "B", violations: [] }).status, "fail");
assert.equal(checkCategoryConsistency({ category: "B", violations: ["Extended / chase"] }).status, "pass");

{
  const flags = run({ entry_price: "8.50", stop: "8.10", shares: "50", entry_time: "09:30", category: "A", violations: [] }, null, 20);
  assert.deepEqual(new Set(flags.map(f => f.check)), new Set(["size", "stop_recorded", "process_5min_reset", "category_consistency"]));
  assert.ok(flags.every(f => f.status === "pass"));
}

// ---- full strategy check
const clean = {
  setup: 'A', entry_price: '8.50', stop: '8.20', shares: '50', entry_time: '09:40', support_below: '8.20', resistance_above: '9.00',
  structure_valid: 'Y', trigger_valid: 'Y', extended: 'N', ema_alignment: 'Y', mom_sign: 'Positive', mom_direction: 'Increasing',
  ttm_color: 'Green', ttm_direction: 'Increasing', entry_valid: 'Y', exit_valid: 'Y', exit_time: '09:55', category: 'A', violations: [],
};
const st = (r, k) => r.checks.find(c => c.check === k).status;
{
  const r = runStrategy(clean, { priorExitTime: null, riskDollars: 20 });
  assert.equal(r.summary.fail, 0, JSON.stringify(r.checks.filter(c => c.status === 'fail')));
  assert.equal(st(r, 'room'), 'pass'); assert.equal(st(r, 'size'), 'pass'); assert.equal(st(r, 'momttm'), 'pass');
  assert.equal(st(r, 'danger'), 'manual', 'A/B danger structure needs the chart');
}
{ // not enough room: resistance 8.60 vs 1R 0.30
  const r = runStrategy({ ...clean, resistance_above: '8.60', category: 'B', violations: [] }, { riskDollars: 20 });
  assert.equal(st(r, 'room'), 'fail');
  assert.equal(st(r, 'entry_valid'), 'fail', 'valid entry despite failed room');
  assert.match(r.checks.find(c => c.check === 'tags_missing').message, /Inadequate room to resistance/);
}
{ // MOM negative and falling fails; positive but falling only warns
  assert.equal(st(runStrategy({ ...clean, mom_sign: 'Negative', mom_direction: 'Decreasing' }), 'momttm'), 'fail');
  assert.equal(st(runStrategy({ ...clean, mom_sign: 'Positive', mom_direction: 'Decreasing' }), 'momttm'), 'warn');
  assert.equal(st(runStrategy({ ...clean, ttm_color: 'Red', ttm_direction: 'Decreasing' }), 'momttm'), 'fail');
}
{ // extended, oversized and too-wide stop
  const r = runStrategy({ ...clean, extended: 'Y', stop: '7.90', shares: '50' }, { riskDollars: 20 });
  assert.equal(st(r, 'extension'), 'fail'); assert.equal(st(r, 'size'), 'fail'); assert.equal(st(r, 'stop_distance'), 'warn');
}
{ // category C with a valid entry contradicts itself; B without tags fails
  assert.equal(st(runStrategy({ ...clean, category: 'C', violations: ['No established support'] }), 'category'), 'fail');
  assert.equal(st(runStrategy({ ...clean, category: 'B', violations: [] }), 'category'), 'fail');
}
{ // Setup C: category X, evidence fields
  const r = runStrategy({ ...clean, setup: 'C', category: 'X', ttm_color: 'Yellow' }, { riskDollars: 20, setupC: { declared_before_entry: 'Y', ema_hold_2candle: 'Y', crossed_prev_candle_high: 'N', room_vs_risk: 'tight', danger_structure: 'none' } });
  assert.equal(st(r, 'c_cross'), 'fail'); assert.equal(st(r, 'c_room'), 'warn'); assert.equal(st(r, 'c_yellow'), 'warn');
  assert.equal(st(r, 'c_category'), 'pass'); assert.equal(st(r, 'danger'), 'pass');
}
{ // blank form: nothing invented
  const r = runStrategy({ violations: [] }, { riskDollars: 20 });
  assert.equal(r.summary.fail, 1, 'only "stop not recorded" fails on an empty form');
  assert.ok(r.summary.insufficient_evidence >= 6);
}
{ // 5 minute reset
  assert.equal(st(runStrategy({ ...clean, entry_time: '09:33' }, { priorExitTime: '09:30' }), 'reset'), 'fail');
}

console.log("all rule-engine.js parity tests passed");
