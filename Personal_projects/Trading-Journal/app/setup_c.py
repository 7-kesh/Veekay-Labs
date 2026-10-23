"""Per-trade evidence log for experimental Setup C - one row per trade declared Setup C at
entry. Never a relabel of a failed A/B after the fact. The gate DEFINITION Setup C is judged
against is versioned strategy_rules data (rule_key='setup_c', see app/strategy.py); this
module only tracks each trade's own evidence against whichever version applied on its date.
"""
from . import db, strategy

FIELDS = ["support_below", "resistance_above", "room_vs_risk", "declared_before_entry",
          "ema_hold_2candle", "crossed_prev_candle_high", "mom_ttm", "danger_structure",
          "confluence_strength", "invalidation_price", "result", "notes"]

# result: X = valid sample (counts in the Setup C tally) | C = declared but failed a gate |
# E = under review, awaiting evidence or a decision - matches TradeVenture's category scheme.
RESULTS = {"X": "X - valid sample", "C": "C - failed a gate", "E": "E - under review"}


def get(conn, trade_id):
    return conn.execute("SELECT * FROM setup_c_log WHERE trade_id=?", (trade_id,)).fetchone()


def save(conn, trade_id, trade_date, form_get):
    """form_get: a callable(name) -> str, e.g. Flask's request.form.get. Upserts by trade_id -
    at most one Setup C log row per trade."""
    # The trade's own "notes" textarea already owns that form field name; Setup C's notes
    # field is submitted as "setup_c_notes" to avoid the collision.
    values = {k: (form_get("setup_c_notes") if k == "notes" else form_get(k)) or None for k in FIELDS}
    version = strategy.rule_effective_from(conn, "scalp", "setup_c", trade_date)
    existing = get(conn, trade_id)
    if existing:
        conn.execute(
            "UPDATE setup_c_log SET version=?, %s, updated_at=? WHERE trade_id=?" % ", ".join(
                "%s=?" % k for k in FIELDS),
            [version] + [values[k] for k in FIELDS] + [db.now(), trade_id])
    else:
        conn.execute(
            "INSERT INTO setup_c_log(trade_id, version, %s, created_at, updated_at) "
            "VALUES (?,?,%s,?,?)" % (", ".join(FIELDS), ",".join("?" * len(FIELDS))),
            [trade_id, version] + [values[k] for k in FIELDS] + [db.now(), db.now()])


def tally(conn):
    """Counts by result - reported separately from Setup A/B, never folded into clean expectancy."""
    rows = conn.execute("SELECT result, COUNT(*) AS n FROM setup_c_log GROUP BY result").fetchall()
    out = {"X": 0, "C": 0, "E": 0, "not recorded": 0}
    for r in rows:
        out[r["result"] or "not recorded"] = r["n"]
    return out
