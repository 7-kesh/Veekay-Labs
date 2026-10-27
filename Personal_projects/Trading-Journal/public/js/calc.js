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

// ---- options helpers (delta-only; gamma/theta are backlog) ----

// Liquidity thresholds (Veekay confirms/changes): spread as % of the entry premium, volume, open interest.
export const LIQUIDITY = { spreadGoodPct: 5, spreadOkPct: 10, minVolume: 500, minOpenInterest: 1000 };

// spread: ask - bid in $; mid: premium the spread is measured against (entry premium).
// Returns { spreadPct, checks: [{key, ok, text}], verdict: 'liquid'|'marginal'|'illiquid'|null }.
export function liquidityVerdict(spread, mid, volume, openInterest, t = LIQUIDITY) {
  spread = num(spread); mid = num(mid); volume = num(volume); openInterest = num(openInterest);
  const out = { spreadPct: null, checks: [], verdict: null };
  if (spread !== null && mid) out.spreadPct = round(spread / mid * 100, 1);
  if (out.spreadPct !== null) {
    out.checks.push({ key: 'spread', ok: out.spreadPct <= t.spreadOkPct,
      text: `Spread ${out.spreadPct}% of premium (${out.spreadPct <= t.spreadGoodPct ? 'tight' : out.spreadPct <= t.spreadOkPct ? 'acceptable, up to ' + t.spreadOkPct + '%' : 'wide, over ' + t.spreadOkPct + '%'})` });
  }
  if (volume !== null) out.checks.push({ key: 'volume', ok: volume >= t.minVolume, text: `Volume ${volume} (${volume >= t.minVolume ? 'ok' : 'under ' + t.minVolume}`  + ')' });
  if (openInterest !== null) out.checks.push({ key: 'oi', ok: openInterest >= t.minOpenInterest, text: `Open interest ${openInterest} (${openInterest >= t.minOpenInterest ? 'ok' : 'under ' + t.minOpenInterest})` });
  if (!out.checks.length) return out;
  const spreadBad = out.spreadPct !== null && out.spreadPct > t.spreadOkPct;
  out.verdict = spreadBad ? 'illiquid' : out.checks.every(c => c.ok) ? 'liquid' : 'marginal';
  return out;
}

// Premium after a stock move: entry + |delta|*x + 0.5*gamma*x^2 - |theta|*days, where x is the stock
// move in the trade's favour (call: up, put: down). Gamma, theta and days are optional (blank = 0).
// Floored at 0. Not modelled: IV change (vega) and theta speeding up close to expiry.
// Returns null when stock price, stock entry, delta or entry premium is missing.
export function premiumAt(stockPrice, stockEntry, delta, entryPremium, direction = 'call', { gamma = 0, theta = 0, days = 0 } = {}) {
  stockPrice = num(stockPrice); stockEntry = num(stockEntry); delta = num(delta); entryPremium = num(entryPremium);
  if ([stockPrice, stockEntry, delta, entryPremium].includes(null)) return null;
  const g = num(gamma, 0), th = Math.abs(num(theta, 0)), d = num(days, 0);
  const x = (direction === 'put' ? -1 : 1) * (stockPrice - stockEntry);
  return round(Math.max(0, entryPremium + Math.abs(delta) * x + 0.5 * Math.abs(g) * x * x - th * d), 2);
}

// Stock price where the premium reaches `premium`: solves premiumAt for the move. With gamma it is a
// quadratic; the root nearest the entry is used. Null when it never gets there (e.g. decay alone).
export function stockAtPremium(premium, stockEntry, delta, entryPremium, direction = 'call', { gamma = 0, theta = 0, days = 0 } = {}) {
  premium = num(premium); stockEntry = num(stockEntry); delta = num(delta); entryPremium = num(entryPremium);
  if ([premium, stockEntry, delta, entryPremium].includes(null) || delta === 0) return null;
  const dl = Math.abs(delta), g = Math.abs(num(gamma, 0)), th = Math.abs(num(theta, 0)), d = num(days, 0);
  const c = premium - entryPremium + th * d;
  let x;
  if (g === 0) x = c / dl;
  else {
    const disc = dl * dl + 2 * g * c;
    if (disc < 0) return null;
    x = (-dl + Math.sqrt(disc)) / g;
  }
  return round(stockEntry + (direction === 'put' ? -1 : 1) * x, 2);
}

// Entry-form sanity checks on the stock levels and strike (catches typos like 770 vs 77).
export function optionsSanity(direction, stockEntry, stockStop, stockTarget, strike) {
  stockEntry = num(stockEntry); stockStop = num(stockStop); stockTarget = num(stockTarget); strike = num(strike);
  const w = [];
  if (stockEntry === null || stockEntry <= 0) return w;
  const call = direction !== 'put';
  if (stockStop !== null && (call ? stockStop >= stockEntry : stockStop <= stockEntry)) w.push(`Stock stop should be ${call ? 'below' : 'above'} the stock entry for a ${direction || 'call'}.`);
  if (stockTarget !== null && (call ? stockTarget <= stockEntry : stockTarget >= stockEntry)) w.push(`Stock target should be ${call ? 'above' : 'below'} the stock entry for a ${direction || 'call'}.`);
  const far = (v, pct) => v !== null && Math.abs(v - stockEntry) / stockEntry > pct;
  if (far(stockStop, 0.25) || far(stockTarget, 0.25)) w.push('Stock stop/target is over 25% from the stock entry. Typo?');
  if (far(strike, 0.25)) w.push('Strike is over 25% from the stock entry. Typo?');
  return w;
}

// A dollar amount as a % of a base (account balance or position cost), 2 decimals. Null when either is missing.
export function pctOf(amount, base) {
  amount = num(amount); base = num(base);
  if (amount === null || !base) return null;
  return round(amount / base * 100, 2);
}

// ---- Black-Scholes repricing (used when IV, strike and expiry are entered) ----
// Assumed risk-free rate; barely moves short-dated option prices.
export const OPTION_RATE = 0.045;

function normCdf(x) { // Abramowitz-Stegun 7.1.26 via erf
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

// Theoretical price of a European option. sigma as a decimal (0.35), T in years.
export function bsPrice(S, K, T, sigma, direction = 'call', r = OPTION_RATE) {
  if (T <= 0 || sigma <= 0) return Math.max(0, direction === 'put' ? K - S : S - K);
  const sq = sigma * Math.sqrt(T), d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / sq, d2 = d1 - sq;
  return direction === 'put'
    ? K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1)
    : S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
}

// Inputs for the model, or null when something needed is missing:
// { strike, iv (%), ivShift (pts at the exit, e.g. -5), expiry, planDate ('YYYY-MM-DD'), days (planned hold) }.
// Time is calendar days; an expiry-day option is treated as a quarter day left.
function modelParams(m) {
  const K = num(m.strike), iv = num(m.iv);
  if (K === null || !iv || iv <= 0 || !m.expiry) return null;
  const t0 = Date.parse(m.expiry + 'T00:00:00Z'), p0 = Date.parse((m.planDate || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
  if (Number.isNaN(t0) || Number.isNaN(p0)) return null;
  const dte = Math.max(0.25, (t0 - p0) / 86400000), held = Math.min(Math.max(0, num(m.days, 0)), dte - 0.25);
  const sigma0 = iv / 100, sigma1 = Math.max(0.01, (iv + num(m.ivShift, 0)) / 100);
  return { K, T0: dte / 365, T1: (dte - held) / 365, sigma0, sigma1 };
}

// Estimated premium at stock price S after the planned hold: entry premium plus the model's price
// change, so a model/market mismatch in the starting price doesn't leak into the estimate.
export function premiumAtModel(S, stockEntry, entryPremium, direction, m) {
  S = num(S); stockEntry = num(stockEntry); entryPremium = num(entryPremium);
  const p = modelParams(m);
  if (!p || [S, stockEntry, entryPremium].includes(null)) return null;
  const change = bsPrice(S, p.K, p.T1, p.sigma1, direction) - bsPrice(stockEntry, p.K, p.T0, p.sigma0, direction);
  return round(Math.max(0, entryPremium + change), 2);
}

// Stock price where the modelled premium equals `premium` (bisection; premium rises with the stock
// for a call and falls for a put). Null when no price within -60%/+150% of the entry gets there.
export function stockAtPremiumModel(premium, stockEntry, entryPremium, direction, m) {
  premium = num(premium); stockEntry = num(stockEntry);
  if (premium === null || stockEntry === null || !modelParams(m)) return null;
  let lo = stockEntry * 0.4, hi = stockEntry * 2.5;
  const f = S => premiumAtModel(S, stockEntry, entryPremium, direction, m);
  const up = direction !== 'put';
  const a = f(lo), b = f(hi);
  if (a === null || b === null || premium < Math.min(a, b) || premium > Math.max(a, b)) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2, v = f(mid);
    if ((v < premium) === up) lo = mid; else hi = mid;
  }
  return round((lo + hi) / 2, 2);
}

// Estimated option premium at the planned stock stop and stock target, from a plan's saved values
// (same method the entry form shows). Returns { stop, target, method } with nulls when not estimable.
export function estimateOptionPremiums(v) {
  const dir = v.direction || 'call';
  const mp = { strike: v.strike, iv: v.iv, ivShift: num(v.iv_shift, 0), expiry: v.expiry, planDate: v.plan_date || undefined, days: num(v.hold_days, 0) };
  const gk = { gamma: num(v.gamma, 0), theta: num(v.theta, 0), days: num(v.hold_days, 0) };
  const model = premiumAtModel(v.underlying_entry, v.underlying_entry, v.entry_price, dir, mp) !== null;
  const at = S => model ? premiumAtModel(S, v.underlying_entry, v.entry_price, dir, mp)
                        : premiumAt(S, v.underlying_entry, v.delta, v.entry_price, dir, gk);
  const stop = at(v.underlying_stop), target = at(v.underlying_target);
  return { stop, target, method: stop === null && target === null ? null : model ? 'black-scholes' : 'delta' };
}
