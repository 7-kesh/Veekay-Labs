import assert from 'node:assert/strict';
import { checkSize, checkStopRecorded, check5minReset, checkCategoryConsistency, run } from './rule-engine.js';

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

console.log("all rule-engine.js parity tests passed");
