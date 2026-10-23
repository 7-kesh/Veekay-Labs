import assert from 'node:assert/strict';
import { parseExits, scalpResult, optionsPlan, swingPlan, realized } from './calc.js';

assert.deepEqual(parseExits("50@7.11; 75@7.42", 200), [[50, 7.11], [75, 7.42]]);
assert.deepEqual(parseExits("7.42", 50), [[50, 7.42]]);
assert.deepEqual(parseExits("50@7.85 stop", 100), [[50, 7.85]]);
assert.deepEqual(parseExits("20@8.55 (09:40)", 20), [[20, 8.55]]);
assert.equal(parseExits("exit 3.30", 50), null);
assert.equal(parseExits("", 50), null);

{
  const r = scalpResult(8.50, 20, 8.10, "20@8.55", 0);
  assert.equal(r.planned_risk, 8.0); assert.equal(r.gross_pnl, 1.0); assert.equal(r.net_pnl, 1.0);
}
{
  const r = scalpResult(10, 100, 9.8, "50@10.4; 50@10.2", 2);
  assert.equal(r.gross_pnl, 30.0); assert.equal(r.net_pnl, 28.0); assert.equal(r.planned_risk, 20.0);
  assert.equal(r.r_multiple, 1.4); assert.equal(r.open_shares, 0);
}
{
  const r = optionsPlan(5.10, 3.60, 10.00, 1, 1500, 5, "put", 148);
  assert.equal(r.investment, 510.0); assert.equal(r.risk_budget, 75.0);
  assert.equal(r.planned_loss, 150.0); assert.equal(r.potential_profit, 490.0);
  assert.equal(r.rr, 3.27); assert.equal(r.within_budget, false); assert.equal(r.affordable, true);
  assert.equal(r.breakeven, 142.9);
}
{
  const r = swingPlan(50, 47, 56, 5, 1500, 1);
  assert.equal(r.planned_loss, 15.0); assert.equal(r.potential_profit, 30.0); assert.equal(r.rr, 2.0);
  assert.equal(r.max_shares, 5); assert.equal(r.assessment, "QUALIFIED");
}
{
  const r = realized("options", "call", 1, 5.10, 6.20, 0.04, 150);
  assert.equal(r.realized_pl, 109.96); assert.equal(r.roi, 21.56); assert.equal(r.realized_r, 0.73);
}

console.log("all calc.js parity tests passed");
