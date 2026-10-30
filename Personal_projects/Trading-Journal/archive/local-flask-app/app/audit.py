"""Field-change audit trail - old value, new value, when, and whether the new value matches
what Claude proposed (vs. a manual edit). Not literal git: this project already rules out
committing data/ (a binary SQLite file has no meaningful diff trail anyway). One row per
changed field per save, written from the same place every trade save already happens.
"""
from . import db

# Maps a trade_history "field" to the key review.py's `proposed` object uses, for the fields
# that can come from a review's "Fill in Claude's suggestion" button.
_PROPOSED_KEY = {"setup", "setup_valid", "entry_valid", "exit_valid", "category", "violations", "emotions"}


def _matches_proposed(field, new_value, proposed):
    if not proposed or field not in _PROPOSED_KEY:
        return False
    p = proposed.get(field)
    if field in ("violations", "emotions"):
        return isinstance(p, list) and "; ".join(p) == (new_value or "")
    return p == new_value


def log_changes(conn, kind, trade_id, old_row, new_values, latest_proposed=None):
    """old_row: the sqlite Row before this save (None for a brand-new trade). new_values:
    {field: value} just written. latest_proposed: the most recent review's `proposed` dict for
    this trade, if any - used only to label the source, never to decide what gets logged."""
    now = db.now()
    if old_row is None:
        conn.execute(
            "INSERT INTO trade_history(kind, trade_id, field, old_value, new_value, source, created_at) "
            "VALUES (?,?,'(created)',NULL,NULL,'manual',?)", (kind, trade_id, now))
        return
    for field, new in new_values.items():
        old = old_row[field] if field in old_row.keys() else None
        old_s, new_s = ("" if old is None else str(old)), ("" if new is None else str(new))
        if old_s == new_s:
            continue
        source = "claude-suggested" if _matches_proposed(field, new, latest_proposed) else "manual"
        conn.execute(
            "INSERT INTO trade_history(kind, trade_id, field, old_value, new_value, source, created_at) "
            "VALUES (?,?,?,?,?,?,?)", (kind, trade_id, field, old_s, new_s, source, now))


def history(conn, kind, trade_id):
    return conn.execute(
        "SELECT * FROM trade_history WHERE kind=? AND trade_id=? ORDER BY id DESC", (kind, trade_id)).fetchall()
