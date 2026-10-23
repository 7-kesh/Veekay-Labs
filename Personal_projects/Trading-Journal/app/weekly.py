"""The weekly wrap-up ritual - by-day breakdown, validity roll-up, the 2-candle and Setup C
tallies, strategy changes stated during the week, and suggested action items. Almost entirely
deterministic (reuses perf.py/improve.py, the same functions the stats pages already use,
scoped to one week's rows) - nothing here needs a Claude call.
"""
from collections import Counter, defaultdict
from datetime import date, timedelta

from . import improve, perf, setup_c, strategy


def week_bounds(ref=None):
    """Monday..Friday (ISO dates) for the week containing `ref` (default today)."""
    d = date.fromisoformat(ref) if ref else date.today()
    monday = d - timedelta(days=d.weekday())
    return monday.isoformat(), (monday + timedelta(days=4)).isoformat()


def _win(v):
    return v is not None and v > 0


def by_day(rows, monday, friday):
    days = [(date.fromisoformat(monday) + timedelta(days=i)).isoformat() for i in range(5)]
    out = {d: {"date": d, "trades": 0, "net": 0.0, "cats": Counter()} for d in days}
    for r in rows:
        if r["date"] not in out:
            continue
        o = out[r["date"]]
        o["trades"] += 1
        o["cats"][r["category"] or "-"] += 1
        if r["net_pnl"] is not None:
            o["net"] += r["net_pnl"]
    for o in out.values():
        o["net"] = round(o["net"], 2)
    return [out[d] for d in days]


def tally_2candle(rows):
    """Setup A/B only - Setup C is never folded into this, X-category trades are excluded."""
    counts = Counter(r["tally_2candle"] for r in rows if r["setup"] in ("A", "B") and r["tally_2candle"])
    scored = counts["success"] + counts["fail"]
    rate = round(100 * counts["success"] / scored, 1) if scored else None
    return {"success": counts["success"], "fail": counts["fail"], "contaminated": counts["contaminated"], "rate": rate}


def weekly_review(conn, settings, ref=None):
    monday, friday = week_bounds(ref)
    rows = conn.execute("SELECT * FROM scalp_trades WHERE date>=? AND date<=?", (monday, friday)).fetchall()
    known = [r for r in rows if r["net_pnl"] is not None]
    wins = [r for r in known if _win(r["net_pnl"])]

    ordered = sorted(known, key=lambda r: (r["date"], r["entry_time"] or "", r["id"]))
    m = perf.analyse([{"label": "%s %s" % (r["trade_no"], r["ticker"]), "date": r["date"],
                        "pnl": r["net_pnl"], "r": r["r_multiple"]} for r in ordered])["m"]
    areas = improve.scalp_areas(rows, settings, m)
    action_items = improve.focus(areas, m, limit=3, area="scalp")

    setup_c_ids = {r["id"] for r in rows if r["setup"] == "C"}
    sc_rows = [setup_c.get(conn, tid) for tid in setup_c_ids]
    sc_tally = Counter((r["result"] if r and r["result"] else "not recorded") for r in sc_rows) if setup_c_ids else Counter()

    changes = conn.execute(
        "SELECT * FROM strategy_change_log WHERE date>=? AND date<=? ORDER BY id", (monday, friday)).fetchall()

    return {
        "monday": monday, "friday": friday,
        "n": len(rows), "known": len(known), "wins": len(wins), "losses": len(known) - len(wins),
        "win_pct": round(100 * len(wins) / len(known), 1) if known else None,
        "net": round(sum(r["net_pnl"] for r in known), 2),
        "categories": Counter(r["category"] or "-" for r in rows).most_common(),
        "entry_ok": round(100 * sum(1 for r in rows if r["entry_valid"] == "Y") / len(rows), 1) if rows else None,
        "exit_ok": round(100 * sum(1 for r in rows if r["exit_valid"] == "Y") / len(rows), 1) if rows else None,
        "days": by_day(rows, monday, friday),
        "tally_2candle": tally_2candle(rows),
        "setup_c_tally": dict(sc_tally),
        "changes": changes,
        "action_items": action_items,
    }
