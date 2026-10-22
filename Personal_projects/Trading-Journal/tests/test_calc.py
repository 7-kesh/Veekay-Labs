import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import calc


def test_parse_exits():
    assert calc.parse_exits("50@7.11; 75@7.42", 200) == [(50.0, 7.11), (75.0, 7.42)]
    assert calc.parse_exits("7.42", 50) == [(50.0, 7.42)]
    assert calc.parse_exits("50@7.85 stop", 100) == [(50.0, 7.85)]
    assert calc.parse_exits("20@8.55 (09:40)", 20) == [(20.0, 8.55)]
    assert calc.parse_exits("exit 3.30", 50) is None
    assert calc.parse_exits("", 50) is None


def test_scalp_result_matches_ledger_t061():
    r = calc.scalp_result(8.50, 20, 8.10, "20@8.55", 0)
    assert r["planned_risk"] == 8.0 and r["gross_pnl"] == 1.0 and r["net_pnl"] == 1.0


def test_scalp_result_partials():
    r = calc.scalp_result(10, 100, 9.8, "50@10.4; 50@10.2", 2)
    assert r["gross_pnl"] == 30.0 and r["net_pnl"] == 28.0 and r["planned_risk"] == 20.0
    assert r["r_multiple"] == 1.4 and r["open_shares"] == 0


def test_options_matches_sheet():
    r = calc.options_plan(5.10, 3.60, 10.00, 1, 1500, 5, "put", 148)
    assert r["investment"] == 510.0 and r["risk_budget"] == 75.0
    assert r["planned_loss"] == 150.0 and r["potential_profit"] == 490.0
    assert r["rr"] == 3.27 and r["within_budget"] is False and r["affordable"] is True
    assert r["breakeven"] == 142.9


def test_swing_matches_sheet():
    r = calc.swing_plan(50, 47, 56, 5, 1500, 1)
    assert r["planned_loss"] == 15.0 and r["potential_profit"] == 30.0 and r["rr"] == 2.0
    assert r["max_shares"] == 5 and r["assessment"] == "QUALIFIED"


def test_realized():
    r = calc.realized("options", "call", 1, 5.10, 6.20, 0.04, 150)
    assert r["realized_pl"] == 109.96 and r["roi"] == 21.56 and r["realized_r"] == 0.73


def test_perf_margins():
    from app import perf
    items = [{"label": "a", "date": "d", "pnl": p, "r": None} for p in (30, -10, -10, 20, -10, 0)]
    a = perf.analyse(items)["m"]
    assert a["n"] == 6 and a["wins"] == 2 and a["losses"] == 3 and a["flat"] == 1
    assert a["net"] == 20 and a["avg_win"] == 25 and a["avg_loss"] == 10 and a["payoff"] == 2.5
    assert a["profit_factor"] == 1.67 and a["breakeven_win_pct"] == 28.6 and a["max_drawdown"] == 20
    bins = perf.histogram([30, -10, -10, 20, -10, 0])
    assert sum(b["n"] for b in bins) == 6 and all(b["lo"] * b["hi"] >= 0 for b in bins)


def test_migration_adds_account_column(tmp_path, monkeypatch):
    import sqlite3
    from app import config, db
    monkeypatch.setattr(config, "DATA", tmp_path); monkeypatch.setattr(config, "DB_PATH", tmp_path / "j.db")
    monkeypatch.setattr(config, "SHOTS", tmp_path / "s")
    old = sqlite3.connect(tmp_path / "j.db")  # a database from before the paper/live field
    old.executescript("\n".join(l for l in db.SCHEMA.splitlines() if "account TEXT" not in l))
    old.execute("INSERT INTO scalp_trades(trade_no, ticker) VALUES ('T001','ABC')"); old.commit(); old.close()
    db.init()
    with db.connect() as c:
        assert c.execute("SELECT account FROM scalp_trades").fetchone()[0] == "paper"
