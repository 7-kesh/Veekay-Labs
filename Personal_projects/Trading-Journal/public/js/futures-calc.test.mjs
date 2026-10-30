import test from 'node:test';
import assert from 'node:assert/strict';
import { futuresPlan, futuresRealized, contractFor } from './futures-calc.js';
import { FUTURES_CONTRACTS } from './constants.js';

const base = { entry: 5000, stop: 4995, target: 5010, contracts: 2, pointValue: 5, tickSize: 0.25, balance: 2000, riskPct: 2 };

test('long plan: loss, profit, R:R, ticks and budget', () => {
  const p = futuresPlan(base);
  assert.equal(p.risk_per_contract, 25);
  assert.equal(p.planned_loss, 50);
  assert.equal(p.potential_profit, 100);
  assert.equal(p.rr, 2);
  assert.equal(p.risk_ticks, 20);
  assert.equal(p.reward_ticks, 40);
  assert.equal(p.risk_budget, 40);
  assert.equal(p.max_by_risk, 1);
  assert.equal(p.within_budget, false);
  assert.equal(p.loss_pct_account, 2.5);
});

test('short plan flips the sides', () => {
  const p = futuresPlan({ ...base, direction: 'short', entry: 5000, stop: 5005, target: 4990 });
  assert.equal(p.planned_loss, 50);
  assert.equal(p.potential_profit, 100);
  assert.deepEqual(futuresPlan({ ...base, direction: 'short' }).warnings.length, 2);
});

test('wrong-side stop warns and gives no loss', () => {
  const p = futuresPlan({ ...base, stop: 5005 });
  assert.equal(p.planned_loss, null);
  assert.equal(p.warnings.length, 1);
});

test('limits: margin, daily loss, max contracts', () => {
  const p = futuresPlan({ ...base, margin: 3000, dailyLimit: 40, maxContracts: 1 });
  assert.equal(p.margin_ok, false);
  assert.equal(p.within_daily_limit, false);
  assert.equal(p.within_max_contracts, false);
  const ok = futuresPlan({ ...base, margin: 500, dailyLimit: 60, maxContracts: 2 });
  assert.deepEqual([ok.margin_ok, ok.within_daily_limit, ok.within_max_contracts], [true, true, true]);
});

test('no point value gives an empty plan', () => {
  assert.equal(futuresPlan({ ...base, pointValue: '' }).planned_loss, null);
});

test('realized: long win, short win, fees, ticks and R', () => {
  assert.deepEqual(futuresRealized('long', 2, 5000, 5010, 4.5, 5, 0.25, 50), { realized_pl: 95.5, realized_ticks: 40, realized_r: 1.91 });
  assert.equal(futuresRealized('short', 1, 5000, 4990, 0, 5, 0.25, 25).realized_pl, 50);
  assert.equal(futuresRealized('long', 1, 5000, 4995, 0, 5, 0.25, 25).realized_pl, -25);
  assert.equal(futuresRealized('long', 1, 5000, '', 0, 5, 0.25, 25).realized_pl, null);
});

test('contract presets: roots, month codes, and a changed point value falls back to custom', () => {
  assert.equal(contractFor(FUTURES_CONTRACTS, 'MES Dec', 5)[0], 'MES');
  assert.equal(contractFor(FUTURES_CONTRACTS, 'ES', 50)[0], 'ES');
  assert.equal(contractFor(FUTURES_CONTRACTS, 'MESZ6', null)[0], 'MES');
  assert.equal(contractFor(FUTURES_CONTRACTS, 'mnq', 2)[0], 'MNQ');
  assert.equal(contractFor(FUTURES_CONTRACTS, 'MES', 50), null);
  assert.equal(contractFor(FUTURES_CONTRACTS, 'ZZ', 5), null);
  assert.equal(contractFor(FUTURES_CONTRACTS, '', null), null);
  for (const [root, , pv, tick] of FUTURES_CONTRACTS) assert.ok(pv > 0 && tick > 0, root);
});
