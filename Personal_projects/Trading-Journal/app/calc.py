"""Pure calculation helpers. No Flask or database imports, so they are easy to test."""
import math
import re

OPTION_MULT = 100


def num(v, default=None):
    if v is None:
        return default
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace("$", "").replace(",", "").replace("%", "")
    if not s:
        return default
    try:
        return float(s)
    except ValueError:
        return default


def lead_num(text):
    """Leading number of a free-text cell, e.g. '7.73' or '0.83 (mental; ...)'."""
    m = re.match(r"\s*\$?(-?\d+(?:\.\d+)?)", str(text or ""))
    return float(m.group(1)) if m else None


_FILL = re.compile(r"^\s*(?:(\d+)\s*@\s*)?\$?(\d+(?:\.\d+)?)\s*(?:stop|limit|market)?\s*$", re.I)


def parse_exits(text, shares):
    """'50@7.11; 75@7.42' -> [(50, 7.11), (75, 7.42)].

    A bare price sells everything still open. Returns None when the text is
    not in this form, so callers keep any stored P&L instead of guessing.
    """
    text = re.sub(r"\([^)]*\)", "", str(text or ""))
    tokens = [t for t in re.split(r"[;,\n]", text) if t.strip()]
    if not tokens or not shares:
        return None
    left, fills = float(shares), []
    for t in tokens:
        m = _FILL.match(t)
        if not m:
            return None
        qty = float(m.group(1)) if m.group(1) else left
        fills.append((qty, float(m.group(2))))
        left -= qty
    return fills


def scalp_result(entry, shares, stop, exits_text, commission):
    """Gross/net P&L, planned risk and R for a long scalp. Missing inputs give None."""
    entry, shares, stop = num(entry), num(shares), num(stop)
    commission = num(commission, 0.0)
    out = {"planned_risk": None, "gross_pnl": None, "net_pnl": None,
           "r_multiple": None, "avg_exit": None, "open_shares": None}
    if entry and shares and stop and entry > stop:
        out["planned_risk"] = round((entry - stop) * shares, 2)
    fills = parse_exits(exits_text, shares) if entry and shares else None
    if fills:
        sold = sum(q for q, _ in fills)
        gross = sum(q * (p - entry) for q, p in fills)
        out["gross_pnl"] = round(gross, 2)
        out["net_pnl"] = round(gross - commission, 2)
        out["avg_exit"] = round(sum(q * p for q, p in fills) / sold, 4) if sold else None
        out["open_shares"] = round(shares - sold, 4)
        if out["planned_risk"]:
            out["r_multiple"] = round(out["net_pnl"] / out["planned_risk"], 2)
    return out


def options_plan(entry, stop, target, contracts, balance, risk_pct, direction="call", strike=None):
    entry, stop, target = num(entry), num(stop), num(target)
    contracts, balance, risk_pct = num(contracts, 1), num(balance, 0), num(risk_pct, 0)
    strike = num(strike)
    r = {k: None for k in ("investment", "risk_budget", "planned_loss", "potential_profit", "rr",
                           "affordable", "within_budget", "max_contracts", "breakeven", "warnings")}
    r["warnings"] = []
    if entry is None:
        return r
    r["investment"] = round(entry * OPTION_MULT * contracts, 2)
    r["risk_budget"] = round(balance * risk_pct / 100, 2)
    r["affordable"] = r["investment"] <= balance
    r["max_loss"] = r["investment"]
    if strike is not None:
        r["breakeven"] = round(strike + entry if direction == "call" else strike - entry, 2)
    if stop is not None:
        if stop >= entry:
            r["warnings"].append("Stop premium should be below the entry premium.")
        else:
            per = (entry - stop) * OPTION_MULT
            r["planned_loss"] = round(per * contracts, 2)
            r["within_budget"] = r["planned_loss"] <= r["risk_budget"]
            r["max_contracts"] = math.floor(r["risk_budget"] / per) if per else None
    if target is not None:
        if target <= entry:
            r["warnings"].append("Target premium should be above the entry premium.")
        else:
            r["potential_profit"] = round((target - entry) * OPTION_MULT * contracts, 2)
    if r["planned_loss"] and r["potential_profit"]:
        r["rr"] = round(r["potential_profit"] / r["planned_loss"], 2)
    return r


def swing_plan(entry, stop, target, shares, balance, risk_pct, min_rr=2.0, direction="long"):
    entry, stop, target = num(entry), num(stop), num(target)
    shares, balance, risk_pct = num(shares, 0), num(balance, 0), num(risk_pct, 0)
    r = {k: None for k in ("investment", "risk_budget", "planned_loss", "potential_profit", "rr",
                           "affordable", "within_budget", "meets_rr", "max_shares", "assessment")}
    r["warnings"] = []
    if entry is None:
        return r
    sign = 1 if direction == "long" else -1
    r["investment"] = round(entry * shares, 2)
    r["risk_budget"] = round(balance * risk_pct / 100, 2)
    r["affordable"] = r["investment"] <= balance
    if stop is not None:
        if (entry - stop) * sign <= 0:
            r["warnings"].append("Stop is on the wrong side of the entry for a %s trade." % direction)
        else:
            per = (entry - stop) * sign
            r["planned_loss"] = round(per * shares, 2)
            r["within_budget"] = r["planned_loss"] <= r["risk_budget"]
            r["max_shares"] = math.floor(r["risk_budget"] / per)
    if target is not None:
        if (target - entry) * sign <= 0:
            r["warnings"].append("Target is on the wrong side of the entry for a %s trade." % direction)
        else:
            r["potential_profit"] = round((target - entry) * sign * shares, 2)
    if r["planned_loss"] and r["potential_profit"]:
        r["rr"] = round(r["potential_profit"] / r["planned_loss"], 2)
        r["meets_rr"] = r["rr"] >= min_rr
    if None not in (r["within_budget"], r["meets_rr"]):
        ok = r["affordable"] and r["within_budget"] and r["meets_rr"]
        r["assessment"] = "QUALIFIED" if ok else "NOT QUALIFIED"
    return r


def realized(kind, direction, qty, actual_entry, actual_exit, fees, planned_loss):
    """Realized P/L, ROI and R-multiple of a closed options/swing trade."""
    e, x, q, fees = num(actual_entry), num(actual_exit), num(qty, 0), num(fees, 0.0)
    out = {"realized_pl": None, "roi": None, "realized_r": None}
    if e is None or x is None or not q:
        return out
    mult = OPTION_MULT if kind == "options" else 1
    sign = -1 if (kind == "swing" and direction == "short") else 1
    pl = (x - e) * sign * mult * q - fees
    out["realized_pl"] = round(pl, 2)
    cost = e * mult * q
    out["roi"] = round(pl / cost * 100, 2) if cost else None
    if planned_loss:
        out["realized_r"] = round(pl / planned_loss, 2)
    return out
