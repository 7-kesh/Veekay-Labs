"""Deterministic Objective Assessment checks - pure arithmetic or stored data, no API call.

Claude handles the gates that genuinely need a chart (review.GATE_KEYS: established_level,
trigger, room, mom_ttm, ema_extension, exit_structure). Everything here is the other half of
the same 10-gate checklist - size, stop presence, the 5-minute same-ticker reset, and
category/violation consistency - computed instantly from the (possibly just-edited, not yet
saved) form values. This module never touches a screenshot, the network, or the database.
"""
from datetime import datetime


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _parse_time(t):
    try:
        return datetime.strptime(t, "%H:%M")
    except (TypeError, ValueError):
        return None


def check_size(trade, risk_dollars):
    entry, stop, shares = _num(trade.get("entry_price")), _num(trade.get("stop")), _num(trade.get("shares"))
    if entry is None or stop is None or shares is None:
        return {"check": "size", "status": "insufficient_evidence", "message": "Entry, stop or shares not recorded."}
    risk_per_share = entry - stop
    if risk_per_share <= 0:
        return {"check": "size", "status": "fail", "message": "Stop is at or above entry - no defined risk."}
    planned = risk_per_share * shares
    status = "pass" if planned <= risk_dollars + 0.01 else "fail"
    return {"check": "size", "status": status,
            "message": "%g shares x $%.2f risk/share = $%.2f planned risk (cap $%.2f)." % (shares, risk_per_share, planned, risk_dollars)}


def check_stop_recorded(trade):
    status = "pass" if trade.get("stop") not in (None, "") else "fail"
    return {"check": "stop_recorded", "status": status,
            "message": "Stop recorded." if status == "pass" else "No stop price recorded on this trade."}


def check_5min_reset(trade, prior_exit_time):
    """prior_exit_time: latest exit_time (HH:MM) among this ticker's earlier trades the same day, or None."""
    if not prior_exit_time:
        return {"check": "process_5min_reset", "status": "pass", "message": "No earlier same-ticker trade today."}
    entry, prior = _parse_time(trade.get("entry_time")), _parse_time(prior_exit_time)
    if not entry or not prior:
        return {"check": "process_5min_reset", "status": "insufficient_evidence",
                "message": "Entry or prior exit time not recorded."}
    gap = (entry - prior).total_seconds() / 60
    status = "pass" if gap >= 5 else "fail"
    return {"check": "process_5min_reset", "status": status,
            "message": "%.1f minutes since the prior same-ticker exit (need >= 5)." % gap}


def check_category_consistency(trade):
    category = (trade.get("category") or "").strip()
    violations = trade.get("violations") or []
    has_violations = bool([v for v in violations if str(v).strip()])
    if category == "A" and has_violations:
        return {"check": "category_consistency", "status": "fail",
                "message": "Category A (clean) but a violation is tagged - A should have none."}
    if category in ("B", "C") and not has_violations:
        return {"check": "category_consistency", "status": "fail",
                "message": "Category %s should carry at least one violation tag." % category}
    return {"check": "category_consistency", "status": "pass", "message": "Category and violation tags are consistent."}


def run(trade, prior_exit_time, risk_dollars):
    """trade: dict of current form field values (strings/lists, as submitted). Returns a list of check results."""
    return [
        check_size(trade, risk_dollars),
        check_stop_recorded(trade),
        check_5min_reset(trade, prior_exit_time),
        check_category_consistency(trade),
    ]
