// Futures plan + result maths. Pure (no DOM / network), unit tested in Node. Point value ($ per full
// point) and tick size are typed per trade, so nothing about a specific contract is built in.
const num = v => { const x = parseFloat(String(v ?? '').replace(/[$,]/g, '')); return Number.isFinite(x) ? x : null; };
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// Plan before entry. margin / dailyLimit / maxContracts are optional limits to check against.
export function futuresPlan({ entry, stop, target, contracts, pointValue, tickSize, balance, riskPct, direction = 'long', margin, dailyLimit, maxContracts }) {
  entry = num(entry); stop = num(stop); target = num(target);
  const q = num(contracts) || 0, pv = num(pointValue), tick = num(tickSize);
  balance = num(balance) || 0; riskPct = num(riskPct) || 0; margin = num(margin); dailyLimit = num(dailyLimit); maxContracts = num(maxContracts);
  const r = { risk_per_contract: null, risk_ticks: null, reward_ticks: null, planned_loss: null, potential_profit: null, rr: null,
    risk_budget: round(balance * riskPct / 100), max_by_risk: null, within_budget: null, loss_pct_account: null,
    margin_ok: null, within_daily_limit: null, within_max_contracts: null, warnings: [] };
  if (entry === null || !pv) return r;
  const sign = direction === 'short' ? -1 : 1;
  if (stop !== null) {
    const pts = (entry - stop) * sign;
    if (pts <= 0) r.warnings.push(`Stop is on the wrong side of the entry for a ${direction} trade.`);
    else {
      r.risk_per_contract = round(pts * pv);
      r.risk_ticks = tick ? round(pts / tick, 1) : null;
      r.planned_loss = round(pts * pv * q);
      r.max_by_risk = Math.floor(r.risk_budget / (pts * pv));
      r.within_budget = r.planned_loss <= r.risk_budget;
      r.loss_pct_account = balance ? round(r.planned_loss / balance * 100) : null;
      if (dailyLimit !== null) r.within_daily_limit = r.planned_loss <= dailyLimit;
    }
  }
  if (target !== null) {
    const pts = (target - entry) * sign;
    if (pts <= 0) r.warnings.push(`Target is on the wrong side of the entry for a ${direction} trade.`);
    else {
      r.potential_profit = round(pts * pv * q);
      r.reward_ticks = tick ? round(pts / tick, 1) : null;
      if (r.planned_loss) r.rr = round(r.potential_profit / r.planned_loss);
    }
  }
  if (margin !== null && balance) r.margin_ok = margin <= balance;
  if (maxContracts !== null && q) r.within_max_contracts = q <= maxContracts;
  return r;
}

// Result once the trade is closed. fees are the total round-turn fees in $.
export function futuresRealized(direction, contracts, actualEntry, actualExit, fees, pointValue, tickSize, plannedLoss) {
  const e = num(actualEntry), x = num(actualExit), q = num(contracts) || 0, pv = num(pointValue), f = num(fees) || 0, tick = num(tickSize);
  const out = { realized_pl: null, realized_ticks: null, realized_r: null };
  if (e === null || x === null || !q || !pv) return out;
  const pts = (x - e) * (direction === 'short' ? -1 : 1);
  out.realized_pl = round(pts * pv * q - f);
  out.realized_ticks = tick ? round(pts / tick, 1) : null;
  if (plannedLoss) out.realized_r = round(out.realized_pl / plannedLoss);
  return out;
}
