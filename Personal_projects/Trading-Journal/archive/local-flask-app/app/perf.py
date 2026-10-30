"""Performance metrics and chart data for a series of closed trades. Pure functions, easy to test."""
import math


def _nice_step(raw):
    if raw <= 0:
        return 1.0
    p = 10 ** math.floor(math.log10(raw))
    for m in (1, 2, 2.5, 5, 10):
        if raw <= m * p:
            return m * p


def histogram(values, target_bins=10):
    """Dollar bins with a boundary at zero, so every bin is entirely wins or entirely losses."""
    if not values:
        return []
    lo, hi = min(values), max(values)
    step = _nice_step((hi - lo) / target_bins or 1)
    start = math.floor(lo / step) * step
    bins, x = [], start
    while x <= hi + 1e-9:
        bins.append({"lo": round(x, 4), "hi": round(x + step, 4), "n": 0})
        x += step
    for v in values:
        i = min(int((v - start) // step), len(bins) - 1)
        bins[i]["n"] += 1
    # a trade of exactly 0 sits in the bin starting at 0; mark sign by the bin midpoint
    for b in bins:
        b["sign"] = 1 if (b["lo"] + b["hi"]) / 2 > 0 else -1
    return bins


def analyse(items):
    """items: [{label, date, pnl, r}] in time order. Returns metrics, points and plain-English insights."""
    pts, cum, peak, max_dd = [], 0.0, 0.0, 0.0
    for i, it in enumerate(items, 1):
        cum += it["pnl"]
        peak = max(peak, cum)
        max_dd = max(max_dd, peak - cum)
        pts.append({"i": i, "label": it["label"], "date": it["date"], "pnl": round(it["pnl"], 2), "cum": round(cum, 2)})
    wins = [it["pnl"] for it in items if it["pnl"] > 0]
    losses = [-it["pnl"] for it in items if it["pnl"] < 0]
    n = len(items)
    m = {"n": n, "wins": len(wins), "losses": len(losses), "flat": n - len(wins) - len(losses),
         "net": round(cum, 2), "max_drawdown": round(max_dd, 2),
         "win_pct": None, "loss_pct": None, "expectancy": None}  # None, not missing, when there are no trades
    if n:
        m["win_pct"] = round(100 * len(wins) / n, 1)
        m["loss_pct"] = round(100 * len(losses) / n, 1)
        m["expectancy"] = round(cum / n, 2)
    m["gross_profit"], m["gross_loss"] = round(sum(wins), 2), round(sum(losses), 2)
    m["avg_win"] = round(sum(wins) / len(wins), 2) if wins else None
    m["avg_loss"] = round(sum(losses) / len(losses), 2) if losses else None
    m["best"], m["worst"] = (round(max(wins), 2) if wins else None), (round(max(losses), 2) if losses else None)
    m["payoff"] = round(m["avg_win"] / m["avg_loss"], 2) if wins and losses else None
    m["profit_factor"] = round(m["gross_profit"] / m["gross_loss"], 2) if losses and wins else None
    m["breakeven_win_pct"] = (round(100 * m["avg_loss"] / (m["avg_win"] + m["avg_loss"]), 1)
                              if wins and losses else None)
    rw = [it["r"] for it in items if it.get("r") is not None and it["pnl"] > 0]
    rl = [-it["r"] for it in items if it.get("r") is not None and it["pnl"] < 0]
    m["avg_win_r"] = round(sum(rw) / len(rw), 2) if rw else None
    m["avg_loss_r"] = round(sum(rl) / len(rl), 2) if rl else None
    return {"m": m, "points": pts, "bins": histogram([it["pnl"] for it in items]), "insights": insights(m)}


def _usd(v):
    return "$%.2f" % v


def insights(m):
    """The margin analysis in words: are wins big enough to pay for the losses?"""
    out = []
    if m["n"] < 5:
        return ["Only %d closed trades so far. Treat the numbers below as a first look, not a verdict." % m["n"]]
    if m["avg_win"] and m["avg_loss"]:
        out.append("Winning margin vs losing margin: the average win is %s and the average loss is %s, so a win is "
                   "%.2f× a loss." % (_usd(m["avg_win"]), _usd(m["avg_loss"]), m["payoff"]))
        gap = m["win_pct"] - m["breakeven_win_pct"]
        if gap >= 0:
            out.append("At these margins you need to win %.0f%% of trades to break even. You win %.0f%%, which is %.0f "
                       "points above that." % (m["breakeven_win_pct"], m["win_pct"], gap))
        else:
            out.append("At these margins you need to win %.0f%% of trades to break even. You win %.0f%%, which is %.0f "
                       "points short. Either the wins must get larger or the losses smaller."
                       % (m["breakeven_win_pct"], m["win_pct"], -gap))
    elif m["avg_loss"] and not m["avg_win"]:
        out.append("No winning trades in this period.")
    if m["profit_factor"]:
        out.append("Profit factor %.2f: every $1 lost earned back %s." % (m["profit_factor"], _usd(m["profit_factor"])))
    if m["worst"] and m["avg_loss"] and m["worst"] > 2 * m["avg_loss"]:
        out.append("The worst loss (%s) is %.1f× the average loss. One oversized loss is doing much of the damage; "
                   "check whether the stop was honored." % (_usd(m["worst"]), m["worst"] / m["avg_loss"]))
    if m["best"] and m["avg_win"] and m["best"] > 3 * m["avg_win"]:
        out.append("The best win (%s) is %.1f× the average win. Results lean on a few big winners." % (
            _usd(m["best"]), m["best"] / m["avg_win"]))
    if m["avg_win_r"] and m["avg_loss_r"]:
        out.append("In R terms: average win %.2fR against average loss %.2fR." % (m["avg_win_r"], m["avg_loss_r"]))
    out.append("Expectancy is %s per trade; the largest peak-to-trough drawdown was %s." % (
        _usd(m["expectancy"]) if m["expectancy"] >= 0 else "-" + _usd(-m["expectancy"]), _usd(m["max_drawdown"])))
    return out
