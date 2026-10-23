import csv
import io
import json
import re
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from jinja2 import Undefined
from flask import (Blueprint, Response, abort, flash, g, jsonify, redirect, render_template, request,
                   send_from_directory, session, url_for)

from . import auth, calc, config, db, importer, improve, lock, perf, review, rule_engine, strategy

bp = Blueprint("main", __name__)
KINDS = ("options", "swing")


# ---------- plumbing ----------

def conn():
    if "db" not in g:
        g.db = db.connect()
    return g.db


@bp.teardown_app_request
def _close(_exc):
    c = g.pop("db", None)
    if c:
        c.close()


@bp.app_context_processor
def _ctx():
    return {"cfg": config, "today": date.today().isoformat(), "kind_label": {"scalp": "Scalp", "options": "Options", "swing": "Swing"}}


@bp.app_template_filter("fromjson")
def _fromjson(s):
    try:
        return json.loads(s) if s else None
    except ValueError:
        return None


def S():
    return db.settings(conn())


def f(name, default=""):
    return request.form.get(name, default).strip()


def n(name):
    return calc.num(request.form.get(name))


def _blank(v):
    return v is None or v == "" or isinstance(v, Undefined)


def fmt_money(v):
    return "" if _blank(v) else ("-$%.2f" % abs(v) if v < 0 else "$%.2f" % v)


@bp.app_template_filter("money")
def _money(v):
    return fmt_money(v)


@bp.app_template_filter("signclass")
def _signclass(v):
    return "" if _blank(v) or v == 0 else ("pos" if v > 0 else "neg")


@bp.app_template_filter("num")
def _num(v):
    if _blank(v):
        return ""
    v = float(v)
    return "%d" % v if v.is_integer() else ("%.4f" % v).rstrip("0").rstrip(".")


@bp.app_template_filter("px")
def _px(v):
    if _blank(v):
        return ""
    v = float(v)
    return "%.2f" % v if round(v, 2) == round(v, 4) else ("%.4f" % v).rstrip("0")


def row_or_404(table, rid):
    r = conn().execute("SELECT * FROM %s WHERE id=?" % table, (rid,)).fetchone()
    if not r:
        abort(404)
    return r


def attachments(kind, rid):
    return conn().execute("SELECT * FROM attachments WHERE kind=? AND ref_id=? ORDER BY id", (kind, rid)).fetchall()


def reviews(kind, rid):
    return conn().execute("SELECT * FROM reviews WHERE kind=? AND ref_id=? ORDER BY id DESC", (kind, rid)).fetchall()


def period_bounds(period):
    t = date.today()
    if period == "week":
        return (t - timedelta(days=t.weekday())).isoformat(), t.isoformat()
    if period == "month":
        return t.replace(day=1).isoformat(), t.isoformat()
    if period == "30d":
        return (t - timedelta(days=30)).isoformat(), t.isoformat()
    return None, None


# ---------- today ----------

@bp.route("/")
def today_view():
    c, d = conn(), date.today().isoformat()
    trades = c.execute("SELECT * FROM scalp_trades WHERE date=? ORDER BY entry_time, id", (d,)).fetchall()
    net = sum(t["net_pnl"] or 0 for t in trades)
    wins = sum(1 for t in trades if (t["net_pnl"] or 0) > 0)
    waiting = c.execute("SELECT * FROM plans WHERE status IN ('planned','open') ORDER BY status DESC, plan_date").fetchall()
    return render_template("today.html", trades=trades, net=net, wins=wins, waiting=waiting)


# ---------- scalp ----------

@bp.route("/scalp")
def scalp_list():
    period, q = request.args.get("period", "30d"), request.args.get("q", "").strip().upper()
    account = request.args.get("account", "all")
    lo, hi = period_bounds(period)
    sql, args = "SELECT * FROM scalp_trades WHERE 1=1", []
    if account in ("paper", "live"):
        sql += " AND account=?"
        args.append(account)
    if lo:
        sql += " AND date>=? AND date<=?"
        args += [lo, hi]
    if q:
        sql += " AND ticker LIKE ?"
        args.append("%" + q + "%")
    rows = conn().execute(sql + " ORDER BY date DESC, entry_time DESC, id DESC", args).fetchall()
    net = sum(r["net_pnl"] or 0 for r in rows)
    return render_template("scalp_list.html", rows=rows, period=period, q=q, net=net, account=account)


def _next_trade_no():
    last = conn().execute("SELECT trade_no FROM scalp_trades ORDER BY CAST(SUBSTR(trade_no,2) AS INTEGER) DESC LIMIT 1").fetchone()
    return "T%03d" % ((int(last["trade_no"][1:]) + 1) if last else 1)


def _suggest_category(setup, entry_valid, exit_valid, violations):
    if setup == "C":
        return "X"
    if entry_valid == "N":
        return "C"
    if entry_valid == "Y":
        return "A" if exit_valid == "Y" and not violations else "B"
    return ""


def _save_scalp(rid=None):
    old = row_or_404("scalp_trades", rid) if rid else None
    s = S()
    v = {k: f(k) for k in ("date", "entry_time", "exit_time", "exits_text", "category", "setup", "setup_valid",
                           "entry_valid", "exit_valid", "entry_order", "exit_order", "orders_text", "notes",
                           "tally_2candle")}
    v["ticker"] = f("ticker").upper()
    v["account"] = "live" if f("account") == "live" else "paper"
    v["violations"] = "; ".join(request.form.getlist("violations"))
    v["emotions"] = "; ".join(request.form.getlist("emotions"))
    v["entry_price"], v["shares"], v["stop"] = n("entry_price"), n("shares"), n("stop")
    v["commission"] = n("commission") if f("commission") != "" else calc.num(s["default_commission"], 0)
    res = calc.scalp_result(v["entry_price"], v["shares"], v["stop"], v["exits_text"], v["commission"])
    v["planned_risk"] = res["planned_risk"] if res["planned_risk"] is not None else (old["planned_risk"] if old else None)
    v["avg_exit"] = res["avg_exit"]
    if res["net_pnl"] is not None:
        v["gross_pnl"], v["net_pnl"] = res["gross_pnl"], res["net_pnl"]
    else:  # exits not in 'shares@price' form (imported rows): keep the stored or typed P&L
        manual = n("net_manual")
        net = manual if manual is not None else (old["net_pnl"] if old else None)
        v["net_pnl"], v["gross_pnl"] = net, (net + (v["commission"] or 0) if net is not None else None)
    risk = v["planned_risk"]
    v["r_multiple"] = round(v["net_pnl"] / risk, 2) if v["net_pnl"] is not None and risk else None
    if not v["category"]:
        v["category"] = _suggest_category(v["setup"], v["entry_valid"], v["exit_valid"], v["violations"])
    if not v["date"]:
        v["date"] = date.today().isoformat()
    cols = list(v)
    if old:
        conn().execute("UPDATE scalp_trades SET %s, updated_at=? WHERE id=?" % ", ".join(c + "=?" for c in cols),
                       [v[c] for c in cols] + [db.now(), rid])
        conn().commit()
        return rid
    seq = conn().execute("SELECT COUNT(*) FROM scalp_trades WHERE date=?", (v["date"],)).fetchone()[0] + 1
    cur = conn().execute(
        "INSERT INTO scalp_trades(trade_no, day_seq, created_at, updated_at, %s) VALUES (?,?,?,?,%s)" % (
            ", ".join(cols), ",".join("?" * len(cols))),
        [_next_trade_no(), seq, db.now(), db.now()] + [v[c] for c in cols])
    conn().commit()
    return cur.lastrowid


@bp.route("/scalp/new", methods=["GET", "POST"])
def scalp_new():
    if request.method == "POST":
        rid = _save_scalp()
        flash("Saved.")
        return redirect(url_for("main.scalp_edit", rid=rid) if request.form.get("then") == "review"
                        else url_for("main.scalp_new", ticker=f("ticker").upper()))
    s = S()
    blank = {"date": date.today().isoformat(), "account": "paper", "ticker": request.args.get("ticker", ""), "shares": s["default_shares"],
             "commission": s["default_commission"]}
    last = conn().execute("SELECT * FROM scalp_trades WHERE date=? ORDER BY id DESC LIMIT 3", (blank["date"],)).fetchall()
    return render_template("scalp_form.html", t=blank, trade=None, recent=last, shots=[], revs=[], settings=s)


@bp.route("/scalp/<int:rid>", methods=["GET", "POST"])
def scalp_edit(rid):
    if request.method == "POST":
        _save_scalp(rid)
        flash("Saved.")
        return redirect(url_for("main.scalp_edit", rid=rid) if request.form.get("then") == "review"
                        else url_for("main.scalp_list"))
    t = row_or_404("scalp_trades", rid)
    return render_template("scalp_form.html", t=t, trade=t, recent=[], shots=attachments("scalp", rid),
                           revs=reviews("scalp", rid), settings=S())


@bp.route("/scalp/<int:rid>/delete", methods=["POST"])
def scalp_delete(rid):
    row_or_404("scalp_trades", rid)
    db.purge_shots("scalp", rid, conn())
    conn().execute("DELETE FROM scalp_trades WHERE id=?", (rid,))
    conn().commit()
    flash("Trade deleted.")
    return redirect(url_for("main.scalp_list"))


# ---------- options / swing plans ----------

def _plan_calc(kind, v, s):
    if kind == "options":
        return calc.options_plan(v["entry_price"], v["stop_price"], v["target_price"], v["qty"], v["account_balance"],
                                 v["risk_pct"], v["direction"], v["strike"])
    return calc.swing_plan(v["entry_price"], v["stop_price"], v["target_price"], v["qty"], v["account_balance"],
                           v["risk_pct"], calc.num(s["swing_min_rr"], 2), v["direction"])


def _save_plan(kind, rid=None):
    old = row_or_404("plans", rid) if rid else None
    s = S()
    v = {k: f(k) for k in ("plan_date", "thesis", "expiry", "entry_date", "exit_date", "exit_reason", "exit_scenario",
                           "entry_followed", "exit_followed", "orders_text", "notes")}
    v["ticker"], v["direction"] = f("ticker").upper(), f("direction")
    v["account"] = "live" if f("account") == "live" else "paper"
    for k in ("strike", "delta", "bid_ask_spread", "volume", "open_interest", "underlying_entry", "underlying_stop",
              "underlying_target", "entry_price", "stop_price", "target_price", "qty", "account_balance", "risk_pct",
              "actual_entry", "actual_exit", "fees"):
        v[k] = n(k)
    if v["account_balance"] is None:
        v["account_balance"] = calc.num(s["account_balance"])
    if v["risk_pct"] is None:
        v["risk_pct"] = calc.num(s["options_risk_pct" if kind == "options" else "swing_risk_pct"])
    items = config.OPTIONS_CHECKLIST if kind == "options" else config.SWING_CHECKLIST
    ticks = {k: ("chk_" + k) in request.form for k, _ in items}
    v["checklist"] = json.dumps(ticks)
    plan = _plan_calc(kind, v, s)
    v.update(investment=plan["investment"], planned_loss=plan["planned_loss"],
             potential_profit=plan["potential_profit"], rr=plan["rr"])
    if v["actual_exit"] is not None and not v["actual_entry"]:
        v["actual_entry"] = v["entry_price"]  # entered exactly as planned unless told otherwise
    res = calc.realized(kind, v["direction"], v["qty"], v["actual_entry"], v["actual_exit"], v["fees"], plan["planned_loss"])
    v.update(res)
    if not v["entry_followed"] and v["entry_price"] is not None and (v["actual_entry"] is not None):
        v["entry_followed"] = "Y" if all(ticks.values()) else "N"
    if not v["exit_followed"] and v["exit_scenario"]:
        v["exit_followed"] = next((y for k, _, y in config.EXIT_SCENARIOS if k == v["exit_scenario"]), "")
    cancelled = request.form.get("cancel") == "1" or (old and old["status"] == "cancelled" and request.form.get("reopen") != "1")
    if cancelled:
        v["status"] = "cancelled"
    elif v["actual_exit"] is not None:
        v["status"] = "closed"
    elif v["actual_entry"] is not None:
        v["status"] = "open"
    else:
        v["status"] = "planned"
    if not v["plan_date"]:
        v["plan_date"] = date.today().isoformat()
    if v["status"] == "closed" and not v["exit_date"]:
        v["exit_date"] = date.today().isoformat()
    v["checklist"] = json.dumps(ticks)
    cols = list(v)
    if old:
        conn().execute("UPDATE plans SET %s, updated_at=? WHERE id=?" % ", ".join(c + "=?" for c in cols),
                       [v[c] for c in cols] + [db.now(), rid])
        conn().commit()
        return rid
    cur = conn().execute(
        "INSERT INTO plans(kind, created_at, updated_at, %s) VALUES (?,?,?,%s)" % (
            ", ".join(cols), ",".join("?" * len(cols))),
        [kind, db.now(), db.now()] + [v[c] for c in cols])
    conn().commit()
    return cur.lastrowid


@bp.route("/<any(options,swing):kind>")
def plans_list(kind):
    status, account = request.args.get("status", "all"), request.args.get("account", "all")
    sql, args = "SELECT * FROM plans WHERE kind=?", [kind]
    if account in ("paper", "live"):
        sql += " AND account=?"
        args.append(account)
    if status != "all":
        sql += " AND status=?"
        args.append(status)
    rows = conn().execute(sql + " ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END, "
                          "plan_date DESC, id DESC", args).fetchall()
    net = sum(r["realized_pl"] or 0 for r in rows if r["status"] == "closed")
    return render_template("plans_list.html", kind=kind, rows=rows, status=status, net=net, account=account)


@bp.route("/<any(options,swing):kind>/new", methods=["GET", "POST"])
def plan_new(kind):
    if request.method == "POST":
        rid = _save_plan(kind)
        flash("Plan saved.")
        return redirect(url_for("main.plan_edit", kind=kind, rid=rid))
    s = S()
    blank = {"plan_date": date.today().isoformat(), "account": "paper", "direction": "call" if kind == "options" else "long",
             "account_balance": s["account_balance"], "qty": 1 if kind == "options" else "",
             "risk_pct": s["options_risk_pct" if kind == "options" else "swing_risk_pct"], "status": "planned"}
    return render_template("plan_form.html", kind=kind, p=blank, plan=None, ticks={}, shots=[], revs=[], settings=s,
                           result=None)


def _plan_vs_actual(p):
    """Rows comparing what was planned with what happened."""
    if p["actual_entry"] is None:
        return []
    mult = 100 if p["kind"] == "options" else 1
    rows = [("Entry price", p["entry_price"], p["actual_entry"], None)]
    if p["actual_exit"] is not None:
        where = ""
        if p["target_price"] is not None and p["actual_exit"] >= p["target_price"]:
            where = "at or beyond target"
        elif p["stop_price"] is not None and p["actual_exit"] <= p["stop_price"]:
            where = "at or beyond stop"
        elif p["target_price"] is not None and p["stop_price"] is not None:
            where = "between stop and target"
        rows.append(("Exit price (plan: stop %s / target %s)" % (p["stop_price"], p["target_price"]), None, p["actual_exit"], where))
        rows.append(("P/L ($) (plan: -%s / +%s)" % (p["planned_loss"], p["potential_profit"]), None, p["realized_pl"], None))
        rows.append(("R multiple (plan reward-to-risk %s)" % (p["rr"] or "n/a"), p["rr"], p["realized_r"], None))
        if p["planned_loss"] and p["realized_pl"] is not None and p["realized_pl"] < 0 and abs(p["realized_pl"]) > p["planned_loss"]:
            rows.append(("Loss vs planned loss", p["planned_loss"], abs(p["realized_pl"]), "loss exceeded the plan"))
    return rows


@bp.route("/<any(options,swing):kind>/<int:rid>", methods=["GET", "POST"])
def plan_edit(kind, rid):
    p = row_or_404("plans", rid)
    if p["kind"] != kind:
        abort(404)
    if request.method == "POST":
        _save_plan(kind, rid)
        flash("Saved.")
        return redirect(url_for("main.plan_edit", kind=kind, rid=rid))
    ticks = json.loads(p["checklist"] or "{}")
    return render_template("plan_form.html", kind=kind, p=p, plan=p, ticks=ticks, shots=attachments(kind, rid),
                           revs=reviews(kind, rid), settings=S(), result=_plan_vs_actual(p))


@bp.route("/<any(options,swing):kind>/<int:rid>/delete", methods=["POST"])
def plan_delete(kind, rid):
    row_or_404("plans", rid)
    db.purge_shots(kind, rid, conn())
    conn().execute("DELETE FROM plans WHERE id=?", (rid,))
    conn().commit()
    flash("Plan deleted.")
    return redirect(url_for("main.plans_list", kind=kind))


@bp.route("/futures")
def futures():
    return render_template("futures.html")


# ---------- stats ----------

def _win(v):
    return v is not None and v > 0


def _stats_data():
    period, account = request.args.get("period", "all"), request.args.get("account", "all")
    lo, hi = period_bounds(period)
    c = conn()
    args, where = [], ""
    if lo:
        where, args = " AND date>=? AND date<=?", [lo, hi]
    if account in ("paper", "live"):
        where, args = where + " AND account=?", args + [account]
    rows = c.execute("SELECT * FROM scalp_trades WHERE 1=1" + where, args).fetchall()
    known = [r for r in rows if r["net_pnl"] is not None]
    wins = [r for r in known if _win(r["net_pnl"])]
    rs = [r["r_multiple"] for r in known if r["r_multiple"] is not None]
    scalp = {
        "n": len(rows), "known": len(known), "wins": len(wins), "losses": len(known) - len(wins),
        "win_pct": round(100 * len(wins) / len(known), 1) if known else None,
        "net": round(sum(r["net_pnl"] for r in known), 2), "avg_r": round(sum(rs) / len(rs), 2) if rs else None,
        "entry_ok": _rate(rows, "entry_valid"), "exit_ok": _rate(rows, "exit_valid"),
        "categories": Counter(r["category"] or "-" for r in rows).most_common(),
        "violations": Counter(x.strip() for r in rows for x in (r["violations"] or "").split(";") if x.strip()).most_common(8),
        "emotions": Counter(x.strip() for r in rows for x in (r["emotions"] or "").split(";") if x.strip()).most_common(8),
    }
    ordered = sorted(known, key=lambda r: (r["date"], r["entry_time"] or "", r["id"]))
    charts = {"scalp": perf.analyse([{"label": "%s %s" % (r["trade_no"], r["ticker"]), "date": r["date"],
                                      "pnl": r["net_pnl"], "r": r["r_multiple"]} for r in ordered])}
    areas = {"scalp": improve.scalp_areas(rows, S(), charts["scalp"]["m"])}
    by_setup = defaultdict(lambda: [0, 0, 0.0])
    by_week = defaultdict(lambda: [0, 0.0])
    for r in rows:
        key = r["setup"] or "not recorded"
        by_setup[key][0] += 1
        if r["net_pnl"] is not None:
            by_setup[key][1] += 1 if _win(r["net_pnl"]) else 0
            by_setup[key][2] += r["net_pnl"]
            d = datetime.strptime(r["date"], "%Y-%m-%d").date()
            wk = (d - timedelta(days=d.weekday())).isoformat()
            by_week[wk][0] += 1
            by_week[wk][1] += r["net_pnl"]
    plans = {}
    for kind in KINDS:
        pr = c.execute("SELECT * FROM plans WHERE kind=?" + where.replace("date", "plan_date"), [kind] + args).fetchall()
        closed = [r for r in pr if r["status"] == "closed"]
        by_exit = sorted(closed, key=lambda r: (r["exit_date"] or "", r["id"]))
        charts[kind] = perf.analyse([{"label": "%s %s" % (r["ticker"], r["direction"]), "date": r["exit_date"] or r["plan_date"],
                                      "pnl": r["realized_pl"], "r": r["realized_r"]} for r in by_exit if r["realized_pl"] is not None])
        areas[kind] = improve.plan_areas(kind, pr, S(), charts[kind]["m"])
        plans[kind] = {
            "n": len(pr), "open": sum(1 for r in pr if r["status"] in ("planned", "open")), "closed": len(closed),
            "wins": sum(1 for r in closed if _win(r["realized_pl"])),
            "net": round(sum(r["realized_pl"] or 0 for r in closed), 2),
            "avg_plan_rr": _avg([r["rr"] for r in closed]), "avg_r": _avg([r["realized_r"] for r in closed]),
            "entry_ok": _rate(pr, "entry_followed"), "exit_ok": _rate(pr, "exit_followed"),
            "scenarios": Counter(r["exit_scenario"] for r in closed if r["exit_scenario"]).most_common(),
        }
    focus = {k: improve.focus(areas[k], charts[k]["m"], 3, area=k) for k in ("scalp",) + KINDS}
    return dict(period=period, account=account, charts=charts, areas=areas, focus=focus, scalp=scalp,
                by_setup=sorted(by_setup.items()), by_week=sorted(by_week.items(), reverse=True)[:12], plans=plans,
                scenario_label={k: t for k, t, _ in config.EXIT_SCENARIOS})


def _portfolio(d):
    """Every area side by side, plus the combined result and the biggest leaks across all of them."""
    kinds = ("scalp",) + KINDS
    merged = [{"label": "%s %s" % (_kind_label(k), p["label"]), "date": p["date"], "pnl": p["pnl"], "r": None}
              for k in kinds for p in d["charts"][k]["points"]]
    merged.sort(key=lambda x: x["date"] or "")
    total = perf.analyse(merged)

    def by_day(points):
        days = {}
        for p in points:
            days[p["date"]] = p["cum"]
        return [{"date": k, "cum": v} for k, v in sorted(days.items())]

    series = {k: by_day(d["charts"][k]["points"]) for k in kinds}
    series["total"] = by_day(total["points"])
    leaks = sorted((f for k in kinds for f in d["focus"][k]), key=lambda f: -f["cost"])[:5]
    return dict(total=total, series=series, leaks=leaks, kinds=kinds,
                chartjson={"series": series, "areas": [{"kind": k, "net": d["charts"][k]["m"]["net"], "n": d["charts"][k]["m"]["n"]} for k in kinds]})


def _kind_label(k):
    return {"scalp": "Scalp", "options": "Options", "swing": "Swing"}[k]


@bp.route("/stats")
def stats():
    keep = {k: request.args[k] for k in ("period", "account") if request.args.get(k)}
    return redirect(url_for("main.stats_view", which="portfolio", **keep))


@bp.route("/stats/<any(portfolio,scalp,options,swing):which>")
def stats_view(which):
    d = _stats_data()
    if which == "portfolio":
        return render_template("stats_portfolio.html", which=which, **d, **_portfolio(d))
    return render_template("stats_kind.html", which=which, kind=which, **d)


def _avg(vals):
    vals = [v for v in vals if v is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


def _rate(rows, col):
    got = [r[col] for r in rows if r[col] in ("Y", "N")]
    return {"y": got.count("Y"), "of": len(got), "pct": round(100 * got.count("Y") / len(got)) if got else None}


# ---------- exports ----------

@bp.route("/<any(scalp,options,swing):kind>.csv")
def export_csv(kind):
    table = "scalp_trades" if kind == "scalp" else "plans"
    sql = "SELECT * FROM %s" % table + ("" if kind == "scalp" else " WHERE kind='%s'" % kind)
    cur = conn().execute(sql)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([d[0] for d in cur.description if d[0] != "legacy_json"])
    for r in cur:
        w.writerow([r[k] for k in r.keys() if k != "legacy_json"])
    return Response(buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=%s_%s.csv" % (kind, date.today())})


# ---------- screenshots + review ----------

@bp.route("/attach/<any(scalp,options,swing):kind>/<int:rid>", methods=["POST"])
def attach(kind, rid):
    row_or_404("scalp_trades" if kind == "scalp" else "plans", rid)
    out = []
    for fl in request.files.getlist("file"):
        ext = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif"}.get(fl.mimetype)
        if not ext:
            continue
        name = "%s-%d-%s%s" % (kind, rid, uuid.uuid4().hex[:10], ext)
        fl.save(config.SHOTS / name)
        cur = conn().execute("INSERT INTO attachments(kind, ref_id, filename, created_at) VALUES (?,?,?,?)",
                             (kind, rid, name, db.now()))
        out.append({"id": cur.lastrowid, "url": url_for("main.shot", name=name)})
    conn().commit()
    return jsonify(out)


@bp.route("/shot/<name>")
def shot(name):
    return send_from_directory(config.SHOTS, name)


@bp.route("/attachment/<int:aid>/delete", methods=["POST"])
def attachment_delete(aid):
    r = conn().execute("SELECT * FROM attachments WHERE id=?", (aid,)).fetchone()
    if r:
        (config.SHOTS / r["filename"]).unlink(missing_ok=True)
        conn().execute("DELETE FROM attachments WHERE id=?", (aid,))
        conn().commit()
    return jsonify(ok=True)


def _target(kind, rid):
    return row_or_404("scalp_trades" if kind == "scalp" else "plans", rid)


@bp.route("/review/<any(scalp,options,swing):kind>/<int:rid>", methods=["POST"])
def review_run(kind, rid):
    row = _target(kind, rid)
    names = [a["filename"] for a in attachments(kind, rid)]
    try:
        text, gates, proposed = review.run(kind, rid, row, names, S()["review_model"])
    except Exception as e:  # surface API/key problems in the page instead of a 500
        return jsonify(error=str(e)), 400
    return jsonify(text=text, gates=gates, proposed=proposed)


@bp.route("/scalp/<int:rid>/check", methods=["POST"])
def scalp_check(rid):
    """Run the rule-engine half of the Objective Assessment against the form's CURRENT
    (possibly just-edited, not yet saved) values - never against what's already stored."""
    row = row_or_404("scalp_trades", rid)
    trade = {"entry_price": f("entry_price"), "stop": f("stop"), "shares": f("shares"),
              "entry_time": f("entry_time"), "category": f("category"),
              "violations": request.form.getlist("violations")}
    prior = conn().execute(
        "SELECT MAX(exit_time) AS t FROM scalp_trades WHERE ticker=? AND date=? AND id!=? AND entry_time<?",
        (row["ticker"], row["date"], rid, trade["entry_time"] or "99:99")).fetchone()["t"]
    risk_dollars = float(S().get("scalp_risk_dollars", 20) or 20)
    return jsonify(flags=rule_engine.run(trade, prior, risk_dollars))


@bp.route("/packet/<any(scalp,options,swing):kind>/<int:rid>")
def review_packet(kind, rid):
    row = _target(kind, rid)
    return Response(review.packet(kind, row, attachments(kind, rid)), mimetype="text/plain")


# ---------- strategy governance ----------

STRATEGY_LABELS = {k: label for k, label, _ in strategy.SEED_SCALP}
STRATEGY_ORDER = [k for k, _, _ in strategy.SEED_SCALP]


def _ordered_rules():
    rules = strategy.current_rules(conn(), "scalp")
    return [(k, STRATEGY_LABELS[k], rules.get(k, "")) for k in STRATEGY_ORDER]


@bp.route("/strategy")
def strategy_view():
    return render_template("strategy.html", rules=_ordered_rules(), log=strategy.change_log(conn()))


@bp.route("/strategy/propose", methods=["POST"])
def strategy_propose():
    rule_key, new_text = f("rule_key"), f("new_text")
    rules = strategy.current_rules(conn(), "scalp")
    try:
        result = strategy.classify_change(rule_key, rules.get(rule_key), new_text, S()["review_model"])
    except Exception as e:  # surface API/key problems in the page instead of a 500
        return jsonify(error=str(e)), 400
    return jsonify(result)


@bp.route("/strategy/apply", methods=["POST"])
def strategy_apply():
    rule_key, new_text, effect = f("rule_key"), f("new_text"), f("effect")
    effective_from = f("effective_from") or date.today().isoformat()
    strategy.apply_change(conn(), "scalp", rule_key, new_text, effective_from, effect,
                           f("applies_same_day") == "1", "stated by Veekay")
    flash("Strategy rule updated.")
    return redirect(url_for("main.strategy_view"))


@bp.route("/strategy/playbook.pdf")
def strategy_playbook():
    pdf_bytes = strategy.build_playbook_pdf(_ordered_rules(), strategy.change_log(conn()))
    return Response(pdf_bytes, mimetype="application/pdf",
                     headers={"Content-Disposition": "inline; filename=Strategy_Playbook.pdf"})


# ---------- settings ----------

@bp.route("/settings", methods=["GET", "POST"])
def settings_view():
    if request.method == "POST":
        for k in config.DEFAULT_SETTINGS:
            if k in request.form:
                conn().execute("UPDATE settings SET value=? WHERE key=?", (f(k), k))
        conn().commit()
        flash("Settings saved.")
        return redirect(url_for("main.settings_view"))
    return render_template("settings.html", s=S(), has_key=bool(review.api_key()), env_file=config.ENV_FILE,
                           csv_path=importer.DEFAULT_CSV, csv_exists=importer.DEFAULT_CSV.exists(), lockinfo=lock.HOST,
                           backups=sorted(config.BACKUPS.glob("journal-*.db"))[-3:] if config.BACKUPS.exists() else [])


@bp.route("/settings/import", methods=["POST"])
def settings_import():
    path = f("path") or str(importer.DEFAULT_CSV)
    try:
        added, skipped = importer.import_csv(path)
        flash("Imported %d trades (%d already present)." % (added, skipped))
    except OSError as e:
        flash("Could not read %s: %s" % (path, e))
    return redirect(url_for("main.settings_view"))


# ---------- login ----------

@bp.route("/login", methods=["GET", "POST"])
def login_view():
    first_run = not auth.configured()
    if request.method == "POST":
        if first_run:
            email, password, confirm = f("email"), f("password"), f("confirm")
            if not email or not password:
                flash("Email and password are required.")
            elif password != confirm:
                flash("Passwords don't match.")
            elif len(password) < 8:
                flash("Use at least 8 characters.")
            else:
                auth.set_credentials(email, password)
                session["authed"], session["email"] = True, email.strip()
                return redirect(request.args.get("next") or url_for("main.today_view"))
        else:
            email, password = f("email"), f("password")
            if auth.check(email, password):
                session["authed"], session["email"] = True, email.strip()
                return redirect(request.args.get("next") or url_for("main.today_view"))
            flash("Wrong email or password.")
    return render_template("login.html", first_run=first_run)


@bp.route("/logout", methods=["POST"])
def logout_view():
    session.clear()
    return redirect(url_for("main.login_view"))
