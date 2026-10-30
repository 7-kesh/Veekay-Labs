"""Import the TradeVenture Trade_Log.csv into scalp_trades. Safe to run twice."""
import csv
import json
import sys
from pathlib import Path

from . import calc, db

DEFAULT_CSV = Path(__file__).resolve().parents[3].parent / "TradeVenture" / "Trade_Log.csv"
_SETUP_FIX = {"c-exp": "C"}


def _yn(v):
    v = (v or "").strip()
    return v[:1].upper() if v[:1].upper() in ("Y", "N") else ""


def _setup(v):
    v = (v or "").strip()
    if v.lower() in _SETUP_FIX:
        return _SETUP_FIX[v.lower()]
    return v[:1].upper() if v[:1].upper() in ("A", "B", "C") else ""


def import_csv(path=DEFAULT_CSV):
    path = Path(path)
    added = skipped = 0
    with db.connect() as conn, open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if conn.execute("SELECT 1 FROM scalp_trades WHERE trade_no=?", (row["trade_id"],)).fetchone():
                skipped += 1
                continue
            entry, shares = calc.num(row["entry_price"]), calc.num(row["shares"])
            stop, planned = calc.lead_num(row["structural_stop"]), calc.lead_num(row["planned_risk"])
            gross, net = calc.num(row["gross_pnl"]), calc.num(row["net_pnl"])
            r = round(net / planned, 2) if net is not None and planned else None
            avg = None
            fills = calc.parse_exits(row["exits"], shares) if shares else None
            if fills:
                avg = round(sum(q * p for q, p in fills) / sum(q for q, _ in fills), 4)
            viol = "; ".join(v.strip() for v in row["primary_violation"].split(";") if v.strip())
            conn.execute(
                """INSERT INTO scalp_trades(trade_no, date, ticker, day_seq, entry_time, entry_price, shares,
                   stop, planned_risk, exits_text, avg_exit, commission, gross_pnl, net_pnl, r_multiple,
                   category, setup, setup_valid, entry_valid, exit_valid, violations, notes, legacy_json,
                   created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (row["trade_id"], row["date"], row["ticker"], calc.num(row["day_seq"]), row["entry_time"],
                 entry, shares, stop, planned, row["exits"], avg, calc.num(row["commission"]), gross, net, r,
                 row["category"], _setup(row["setup_type"]), _yn(row["setup_valid"]), _yn(row["entry_valid"]),
                 _yn(row["exit_valid"]), viol, row["notes"], json.dumps(row), db.now(), db.now()))
            added += 1
    return added, skipped


if __name__ == "__main__":
    db.init()
    a, s = import_csv(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CSV)
    print("imported %d, skipped %d already present" % (a, s))
