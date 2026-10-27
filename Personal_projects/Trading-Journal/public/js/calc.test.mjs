import assert from 'node:assert/strict';
import { parseExits, scalpResult, optionsPlan, swingPlan, realized, liquidityVerdict, premiumAt, stockAtPremium, optionsSanity, pctOf, bsPrice, premiumAtModel, stockAtPremiumModel, estimateOptionPremiums } from './calc.js';

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

{
  // premium from delta: call +$1 stock at 0.5 delta -> +0.50; put mirrors; floor at 0
  assert.equal(premiumAt(101, 100, 0.5, 2, 'call'), 2.5);
  assert.equal(premiumAt(95, 100, 0.5, 2, 'call'), 0);
  assert.equal(premiumAt(99, 100, -0.4, 2, 'put'), 2.4);
  assert.equal(premiumAt(99, 100, null, 2), null);
  assert.equal(stockAtPremium(1.5, 100, 0.5, 2, 'call'), 99);
  assert.equal(stockAtPremium(1.5, 100, 0.5, 2, 'put'), 101);
  // liquidity
  assert.equal(liquidityVerdict(0.05, 4.55, 1139, 5627).verdict, 'liquid');
  assert.equal(liquidityVerdict(0.6, 4.55, 1139, 5627).verdict, 'illiquid');
  assert.equal(liquidityVerdict(0.1, 4.55, 100, 5627).verdict, 'marginal');
  assert.equal(liquidityVerdict(null, 4.55, null, null).verdict, null);
  // sanity
  assert.equal(optionsSanity('call', 770.69, 59, 62, 60).length, 3);
  assert.deepEqual(optionsSanity('call', 77, 75, 80, 78), []);
  assert.deepEqual(optionsSanity('put', 77, 79, 74, 76), []);
  assert.equal(optionsSanity('put', 77, 75, 74, 76).length, 1);
}

assert.equal(pctOf(35, 1500), 2.33);
assert.equal(pctOf(-171.87, 1500), -11.46);
assert.equal(pctOf(10, 0), null);
assert.equal(pctOf(null, 1500), null);

{
  // gamma adds 0.5*g*x^2, theta subtracts |theta|*days; stockAtPremium inverts it
  assert.equal(premiumAt(98, 100, 0.5, 2, 'call', { gamma: 0.1 }), 1.2);          // 2 - 1 + 0.5*0.1*4
  assert.equal(premiumAt(100, 100, 0.5, 2, 'call', { theta: -0.15, days: 2 }), 1.7);
  assert.equal(premiumAt(101, 100, 0.5, 2, 'call', { gamma: 0.1, theta: -0.1, days: 1 }), 2.45); // 2+.5+.05-.1
  const back = stockAtPremium(1.2, 100, 0.5, 2, 'call', { gamma: 0.1 });
  assert.equal(back, 98);
  assert.equal(stockAtPremium(1.7, 100, 0.5, 2, 'call', { theta: -0.15, days: 2 }), 100);
  assert.equal(stockAtPremium(1, 100, 0.5, 2, 'put', { gamma: 0.1 }) > 100, true);
  assert.equal(stockAtPremium(0.5, 100, 0.5, 2, 'put', { gamma: 0.1 }), null); // gamma alone can't take it that low
}

{
  // Black-Scholes reference: S=100 K=100 T=1 r=0.05 sigma=0.2 -> call 10.4506, put 5.5735
  assert.ok(Math.abs(bsPrice(100, 100, 1, 0.2, 'call', 0.05) - 10.4506) < 0.01);
  assert.ok(Math.abs(bsPrice(100, 100, 1, 0.2, 'put', 0.05) - 5.5735) < 0.01);
  const m = { strike: 100, iv: 30, ivShift: 0, expiry: '2026-11-03', planDate: '2026-10-27', days: 0 };
  assert.equal(premiumAtModel(100, 100, 3, 'call', m), 3);
  assert.ok(premiumAtModel(98, 100, 3, 'call', m) < 3 && premiumAtModel(102, 100, 3, 'call', m) > 3);
  // time passing and an IV crush both lower the premium with the stock unchanged
  assert.ok(premiumAtModel(100, 100, 3, 'call', { ...m, days: 3 }) < 3);
  assert.ok(premiumAtModel(100, 100, 3, 'call', { ...m, ivShift: -10 }) < 3);
  assert.equal(premiumAtModel(100, 100, 3, 'call', { ...m, iv: '' }), null);
  const lvl = stockAtPremiumModel(2, 100, 3, 'call', m);
  assert.ok(lvl < 100 && Math.abs(premiumAtModel(lvl, 100, 3, 'call', m) - 2) < 0.01);
  const lvlP = stockAtPremiumModel(2, 100, 3, 'put', m);
  assert.ok(lvlP > 100);
}

{
  const base = { direction: 'call', underlying_entry: 100, underlying_stop: 98, underlying_target: 104, entry_price: 3, delta: 0.5 };
  const d = estimateOptionPremiums(base);
  assert.equal(d.method, 'delta'); assert.equal(d.stop, 2); assert.equal(d.target, 5);
  const m = estimateOptionPremiums({ ...base, strike: 100, iv: 30, expiry: '2026-11-03', plan_date: '2026-10-27' });
  assert.equal(m.method, 'black-scholes'); assert.ok(m.stop < 3 && m.target > 3);
  assert.deepEqual(estimateOptionPremiums({ direction: 'call' }), { stop: null, target: null, method: null });
}
