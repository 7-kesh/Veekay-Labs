// Pure calculation helpers - JS port of app/calc.py for the Cloudflare/Supabase rewrite.
// This becomes the authoritative calculator for the new app (no Python backend in that
// stack); app/calc.py remains authoritative for the local Flask app until it's retired.
// Same functions, same rounding (half-up at the stated decimal places), same semantics.

export const OPTION_MULT = 100;

function round(v, n) {
  const f = Math.pow(10, n);
  return Math.round((v + Number.EPSILON) * f) / f;
}

export function num(v, fallback = null) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/\$/g, '').replace(/,/g, '').replace(/%/g, '');
  if (!s) return fallback;
  const f = parseFloat(s);
  return Number.isNaN(f) ? fallback : f;
}

// Leading number of a free-text cell, e.g. '7.73' or '0.83 (mental; ...)'.
export function leadNum(text) {
  const m = String(text ?? '').match(/^\s*\$?(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

const FILL = /^\s*(?:(\d+)\s*@\s*)?\$?(\d+(?:\.\d+)?)\s*(?:stop|limit|market)?\s*$/i;

// '50@7.11; 75@7.42' -> [[50, 7.11], [75, 7.42]].
// A bare price sells everything still open. Returns null when the text is not in this
// form, so callers keep any stored P&L instead of guessing.
export function parseExits(text, shares) {
  const cleaned = String(text ?? '').replace(/\([^)]*\)/g, '');
  const tokens = cleaned.split(/[;,\n]/).map(t => t.trim()).filter(Boolean);
  if (!tokens.length || !shares) return null;
  let left = Number(shares);
  const fills = [];
  for (const t of tokens) {
    const m = FILL.exec(t);
    if (!m) return null;
    const qty = m[1] ? parseFloat(m[1]) : left;
    fills.push([qty, parseFloat(m[2])]);
    left -= qty;
  }
  return fills;
}

// Gross/net P&L, planned risk and R for a long scalp. Missing inputs give null.
export function scalpResult(entry, shares, stop, exitsText, commission) {
  entry = num(entry); shares = num(shares); stop = num(stop);
  commission = num(commission, 0.0);
  const out = { planned_risk: null, gross_pnl: null, net_pnl: null,
                r_multiple: null, avg_exit: null, open_shares: null };
  if (entry && shares && stop && entry > stop) {
    out.planned_risk = round((entry - stop) * shares, 2);
  }
  const fills = (entry && shares) ? parseExits(exitsText, shares) : null;
  if (fills) {
    const sold = fills.reduce((s, [q]) => s + q, 0);
    const gross = fills.reduce((s, [q, p]) => s + q * (p - entry), 0);
    out.gross_pnl = round(gross, 2);
    out.net_pnl = round(gross - commission, 2);
    out.avg_exit = sold ? round(fills.reduce((s, [q, p]) => s + q * p, 0) / sold, 4) : null;
    out.open_shares = round(shares - sold, 4);
    if (out.planned_risk) {
      out.r_multiple = round(out.net_pnl / out.planned_risk, 2);
    }
  }
  return out;
}

export function optionsPlan(entry, stop, target, contracts, balance, riskPct, direction = 'call', strike = null) {
  entry = num(entry); stop = num(stop); target = num(target);
  contracts = num(contracts, 1); balance = num(balance, 0); riskPct = num(riskPct, 0);
  strike = num(strike);
  const r = { investment: null, risk_budget: null, planned_loss: null, potential_profit: null,
              rr: null, affordable: null, within_budget: null, max_contracts: null,
              breakeven: null, warnings: [] };
  if (entry === null) return r;
  r.investment = round(entry * OPTION_MULT * contracts, 2);
  r.risk_budget = round(balance * riskPct / 100, 2);
  r.affordable = r.investment <= balance;
  r.max_loss = r.investment;
  if (strike !== null) {
    r.breakeven = round(direction === 'call' ? strike + entry : strike - entry, 2);
  }
  if (stop !== null) {
    if (stop >= entry) {
      r.warnings.push('Stop premium should be below the entry premium.');
    } else {
      const per = (entry - stop) * OPTION_MULT;
      r.planned_loss = round(per * contracts, 2);
      r.within_budget = r.planned_loss <= r.risk_budget;
      r.max_contracts = per ? Math.floor(r.risk_budget / per) : null;
    }
  }
  if (target !== null) {
    if (target <= entry) {
      r.warnings.push('Target premium should be above the entry premium.');
    } else {
      r.potential_profit = round((target - entry) * OPTION_MULT * contracts, 2);
    }
  }
  if (r.planned_loss && r.potential_profit) {
    r.rr = round(r.potential_profit / r.planned_loss, 2);
  }
  return r;
}

export function swingPlan(entry, stop, target, shares, balance, riskPct, minRr = 2.0, direction = 'long') {
  entry = num(entry); stop = num(stop); target = num(target);
  shares = num(shares, 0); balance = num(balance, 0); riskPct = num(riskPct, 0);
  const r = { investment: null, risk_budget: null, planned_loss: null, potential_profit: null,
              rr: null, affordable: null, within_budget: null, meets_rr: null,
              max_shares: null, assessment: null, warnings: [] };
  if (entry === null) return r;
  const sign = direction === 'long' ? 1 : -1;
  r.investment = round(entry * shares, 2);
  r.risk_budget = round(balance * riskPct / 100, 2);
  r.affordable = r.investment <= balance;
  if (stop !== null) {
    if ((entry - stop) * sign <= 0) {
      r.warnings.push(`Stop is on the wrong side of the entry for a ${direction} trade.`);
    } else {
      const per = (entry - stop) * sign;
      r.planned_loss = round(per * shares, 2);
      r.within_budget = r.planned_loss <= r.risk_budget;
      r.max_shares = Math.floor(r.risk_budget / per);
    }
  }
  if (target !== null) {
    if ((target - entry) * sign <= 0) {
      r.warnings.push(`Target is on the wrong side of the entry for a ${direction} trade.`);
    } else {
      r.potential_profit = round((target - entry) * sign * shares, 2);
    }
  }
  if (r.planned_loss && r.potential_profit) {
    r.rr = round(r.potential_profit / r.planned_loss, 2);
    r.meets_rr = r.rr >= minRr;
  }
  if (r.within_budget !== null && r.meets_rr !== null) {
    const ok = r.affordable && r.within_budget && r.meets_rr;
    r.assessment = ok ? 'QUALIFIED' : 'NOT QUALIFIED';
  }
  return r;
}

// Realized P/L, ROI and R-multiple of a closed options/swing trade.
export function realized(kind, direction, qty, actualEntry, actualExit, fees, plannedLoss) {
  const e = num(actualEntry), x = num(actualExit), q = num(qty, 0), f = num(fees, 0.0);
  const out = { realized_pl: null, roi: null, realized_r: null };
  if (e === null || x === null || !q) return out;
  const mult = kind === 'options' ? OPTION_MULT : 1;
  const sign = (kind === 'swing' && direction === 'short') ? -1 : 1;
  const pl = (x - e) * sign * mult * q - f;
  out.realized_pl = round(pl, 2);
  const cost = e * mult * q;
  out.roi = cost ? round(pl / cost * 100, 2) : null;
  if (plannedLoss) out.realized_r = round(pl / plannedLoss, 2);
  return out;
}
