"""Rank the key areas to improve from the journal's own data. Pure functions over sqlite rows."""
import json
import re
from collections import defaultdict

from . import calc, config


def _usd(v):
    return ("-$%.2f" % -v) if v < 0 else ("$%.2f" % v)


def _tag(s):
    return re.sub(r"\s*\(.*$", "", s).strip()  # drop notes like "(tag to confirm)"


def _item(title, evidence, action, cost=None, n=0, kind="rule"):
    return {"title": title, "evidence": evidence, "action": action, "cost": round(cost, 2) if cost else None,
            "n": n, "kind": kind}


def _finish(items, total_loss):
    items.sort(key=lambda i: (-(i["cost"] or 0), -i["n"]))
    for i, it in enumerate(items[:6], 1):
        it["rank"] = i
        c = it["cost"] or 0
        it["severity"] = "high" if c >= 50 or (total_loss and c >= 0.25 * total_loss) else ("med" if c > 0 else "low")
    return items[:6]


def scalp_areas(rows, settings, m):
    known = [r for r in rows if r["net_pnl"] is not None]
    items = []
    total_loss = m.get("gross_loss") or 0

    judged = [r for r in rows if r["entry_valid"] in ("Y", "N")]
    bad = [r for r in known if r["entry_valid"] == "N"]
    good = [r for r in known if r["entry_valid"] == "Y"]
    if len(bad) >= 3:
        net = sum(r["net_pnl"] for r in bad)
        items.append(_item(
            "Entries that break the rules",
            "%d of %d judged entries were invalid. The %d with results netted %s%s." % (
                sum(1 for r in judged if r["entry_valid"] == "N"), len(judged), len(bad), _usd(net),
                (", against %s over %d valid entries" % (_usd(sum(r["net_pnl"] for r in good)), len(good))) if good else ""),
            "Take a trade only when every gate passes. If one fails, skip it and wait for the next setup.",
            cost=-net if net < 0 else None, n=len(bad)))

    by_tag = defaultdict(list)
    for r in known:
        for t in {_tag(x) for x in (r["violations"] or "").split(";") if _tag(x)}:
            by_tag[t].append(r["net_pnl"])
    for t, vals in sorted(by_tag.items(), key=lambda kv: sum(kv[1]))[:3]:
        if len(vals) >= 3 and sum(vals) < 0:
            items.append(_item(
                "Violation: " + t, "Tagged on %d trades with results; together they netted %s." % (len(vals), _usd(sum(vals))),
                config.VIOLATION_ACTIONS.get(t, "Review these trades and add a rule or checklist step that prevents the repeat."),
                cost=-sum(vals), n=len(vals)))

    ex_bad = [r for r in known if r["exit_valid"] == "N"]
    ex_judged = [r for r in rows if r["exit_valid"] in ("Y", "N")]
    if len(ex_bad) >= 3:
        net = sum(r["net_pnl"] for r in ex_bad)
        items.append(_item(
            "Exits that break the plan",
            "%d of %d judged exits were invalid (early, emotional or off-plan). Those trades netted %s." % (
                sum(1 for r in ex_judged if r["exit_valid"] == "N"), len(ex_judged), _usd(net)),
            "Scale out about 25% of the remaining position at the peak, then manage candle by candle. Exit early only on objective deterioration.",
            cost=-net if net < 0 else None, n=len(ex_bad)))

    risk = calc.num(settings.get("scalp_risk_dollars"), 20)
    big = [r for r in known if r["net_pnl"] < -risk]
    if len(big) >= 2:
        excess = sum(-r["net_pnl"] - risk for r in big)
        items.append(_item(
            "Losses bigger than 1R (%s)" % _usd(risk),
            "%d losses exceeded 1R, by %s in total. The worst was %s." % (len(big), _usd(excess), _usd(min(r["net_pnl"] for r in known))),
            "Put the stop order in at entry and size so a stop-out costs no more than 1R. Do not hold or average down through the stop.",
            cost=excess, n=len(big)))

    emo = defaultdict(list)
    for r in known:
        for t in {x.strip() for x in (r["emotions"] or "").split(";") if x.strip()}:
            emo[t].append(r["net_pnl"])
    for t, vals in sorted(emo.items(), key=lambda kv: sum(kv[1]))[:2]:
        if len(vals) >= 3 and sum(vals) < 0 and t != "Calm / planned":
            items.append(_item("Emotion: " + t, "Tagged on %d trades; together they netted %s." % (len(vals), _usd(sum(vals))),
                               "Name the trigger before the next trade (a hard rule such as 'no re-entry for 5 minutes after a loss'), and stop for the day if it repeats.",
                               cost=-sum(vals), n=len(vals), kind="behaviour"))

    by_setup = defaultdict(list)
    for r in known:
        if r["setup"]:
            by_setup[r["setup"]].append(r["net_pnl"])
    for s, vals in sorted(by_setup.items(), key=lambda kv: sum(kv[1]))[:1]:
        if len(vals) >= 5 and sum(vals) < 0:
            items.append(_item("Setup %s is losing money" % s, "%d trades, net %s." % (len(vals), _usd(sum(vals))),
                               "Review these trades against the setup definition. Trade it smaller, or pause it, until the entries match the rule.",
                               cost=-sum(vals), n=len(vals)))

    buckets = defaultdict(list)
    for r in known:
        t = r["entry_time"] or ""
        if re.match(r"^\d\d:\d\d", t):
            buckets["%s:%s" % (t[:2], "00" if int(t[3:5]) < 30 else "30")].append(r["net_pnl"])
    worst = sorted(((sum(v), k, len(v)) for k, v in buckets.items() if len(v) >= 8))[:1]
    if worst and worst[0][0] < -30:
        items.append(_item("Time of day: entries from %s" % worst[0][1], "%d trades in that half hour netted %s." % (worst[0][2], _usd(worst[0][0])),
                           "Be pickier in that window, or sit it out. Check whether the setups there are lower quality.",
                           cost=-worst[0][0], n=worst[0][2], kind="behaviour"))

    if m.get("breakeven_win_pct") and m["win_pct"] < m["breakeven_win_pct"]:
        items.append(_item("Win rate is below break-even",
                           "You win %.0f%% but need %.0f%% at the current average win (%s) and loss (%s)." % (
                               m["win_pct"], m["breakeven_win_pct"], _usd(m["avg_win"]), _usd(m["avg_loss"])),
                           "Raise the win rate by skipping invalid entries, or raise the average win with the scale-out plan.", n=m["n"]))

    nostop = [r for r in rows if r["stop"] is None]
    if len(nostop) >= 5:
        items.append(_item("Stops not recorded", "%d of %d trades have no stop on file, so risk and R can't be measured for them." % (len(nostop), len(rows)),
                           "Fill in the stop on every trade. It is the number the whole risk rule depends on.", n=len(nostop), kind="data"))
    return _finish(items, total_loss)


def plan_areas(kind, plans, settings, m):
    closed = [p for p in plans if p["status"] == "closed" and p["realized_pl"] is not None]
    items = []
    total_loss = m.get("gross_loss") or 0

    def split(col):
        no = [p for p in closed if p[col] == "N"]
        yes = [p for p in closed if p[col] == "Y"]
        return no, yes

    for col, title, action in (
            ("exit_followed", "Exits that break the plan", "Decide the exit before entering and set the stop and target orders at entry. If the setup is invalid, exit by the rule, not by feel."),
            ("entry_followed", "Entries that skip the checklist", "Do not enter until every checklist item is ticked, including the entry trigger.")):
        no, yes = split(col)
        if no:
            net = sum(p["realized_pl"] for p in no)
            ev = "%d of %d closed trades did not follow the plan; they netted %s" % (len(no), len(no) + len(yes), _usd(net))
            if yes:
                ev += ", against %s over %d that did." % (_usd(sum(p["realized_pl"] for p in yes)), len(yes))
            else:
                ev += "."
            items.append(_item(title, ev, action, cost=-net if net < 0 else None, n=len(no)))

    bad_exit = defaultdict(list)
    for p in closed:
        if p["exit_scenario"] in ("panic", "held", "early"):
            bad_exit[p["exit_scenario"]].append(p["realized_pl"])
    labels = {k: t for k, t, _ in config.EXIT_SCENARIOS}
    for k, vals in bad_exit.items():
        items.append(_item("Exit style: " + labels[k].lower(), "%d trade(s), net %s." % (len(vals), _usd(sum(vals))),
                           "Use predefined exits only: planned target, planned stop, or a written invalidation rule.",
                           cost=-sum(vals) if sum(vals) < 0 else None, n=len(vals), kind="behaviour"))

    over = [p for p in closed if p["planned_loss"] and p["realized_pl"] < 0 and -p["realized_pl"] > p["planned_loss"]]
    if over:
        extra = sum(-p["realized_pl"] - p["planned_loss"] for p in over)
        items.append(_item("Losses bigger than planned", "%d trade(s) lost more than the planned loss, by %s in total." % (len(over), _usd(extra)),
                           "Honor the stop. If a stop is not going to be honored, size the trade smaller so the real risk matches the plan.",
                           cost=extra, n=len(over)))

    overbudget = []
    for p in plans:
        if p["planned_loss"] and p["account_balance"] and p["risk_pct"] is not None and p["planned_loss"] > p["account_balance"] * p["risk_pct"] / 100 + 1e-9:
            overbudget.append(p)
    if overbudget:
        items.append(_item("Plans over the risk budget", "%d of %d plans risk more than the %s%% budget (largest planned loss %s)." % (
            len(overbudget), len(plans), _usd(0) if False else "%g" % overbudget[0]["risk_pct"], _usd(max(p["planned_loss"] for p in overbudget))),
            "Use the Max %s figure in the forecast row, or move the stop, before you enter." % ("contracts" if kind == "options" else "shares"),
            n=len(overbudget)))

    if m.get("avg_win_r") is not None and closed:
        plan_rr = [p["rr"] for p in closed if p["rr"]]
        real_r = [p["realized_r"] for p in closed if p["realized_r"] is not None]
        if plan_rr and real_r and sum(real_r) / len(real_r) < 0.5 * sum(plan_rr) / len(plan_rr):
            items.append(_item("Realized R is far below planned R",
                               "You plan about %.2fR and realize about %.2fR on average." % (sum(plan_rr) / len(plan_rr), sum(real_r) / len(real_r)),
                               "Targets may be too far or exits too early. Compare the planned target with where price actually turned, and adjust the plan or hold to it.",
                               n=len(closed)))

    skipped = defaultdict(int)
    names = dict(config.OPTIONS_CHECKLIST if kind == "options" else config.SWING_CHECKLIST)
    for p in plans:
        if p["actual_entry"] is not None and p["checklist"]:
            try:
                for k, v in json.loads(p["checklist"]).items():
                    if not v:
                        skipped[k] += 1
            except ValueError:
                pass
    if skipped:
        k, c = max(skipped.items(), key=lambda kv: kv[1])
        items.append(_item("Checklist step skipped most often", "\"%s\" was not ticked on %d entered trade(s)." % (names.get(k, k), c),
                           "Make this the step you do first, before the chart looks exciting.", n=c, kind="behaviour"))

    if m.get("breakeven_win_pct") and m["win_pct"] < m["breakeven_win_pct"]:
        items.append(_item("Win rate is below break-even", "You win %.0f%% but need %.0f%% at the current average win (%s) and loss (%s)." % (
            m["win_pct"], m["breakeven_win_pct"], _usd(m["avg_win"]), _usd(m["avg_loss"])),
            "Either raise the win rate with stricter entries, or widen the reward-to-risk of each plan.", n=m["n"]))

    stale = [p for p in plans if p["status"] in ("planned", "open") and p["plan_date"]]
    from datetime import date
    old = [p for p in stale if (date.today() - date.fromisoformat(p["plan_date"])).days >= 7]
    if old:
        items.append(_item("Plans waiting for actuals", "%d plan(s) have sat open for a week or more without actuals." % len(old),
                           "Close them out or cancel them. The plan-vs-actual comparison only works with actuals.", n=len(old), kind="data"))
    return _finish(items, total_loss)
