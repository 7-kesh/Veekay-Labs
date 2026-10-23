"""Versioned strategy rules - the source Claude's review and the rule engine grade against.

A rule is never edited in place: changing one closes the old row (effective_to) and opens a
new one (effective_from), so every trade is assessed against what was in force on ITS OWN
date, not today's rules. Mirrors TradeVenture's dated-clarification / Strategy_Change_Log.md
discipline, as data instead of markdown prose.
"""
import json
from datetime import date as _date

from . import config, db

SEED_DATE = "2026-10-19"  # date rules/scalp.md says it was seeded from

# (rule_key, label, text) - seeded once from the current rules/scalp.md, split at the same
# granularity as the gate checklist (review.GATE_KEYS + rule_engine's arithmetic checks) so a
# future change can point at exactly the gate it affects.
SEED_SCALP = [
    ("setup_a", "Setup A - support hold",
     "Established support exists; C1 holds established support; C2 crosses C1 high intrabar -> "
     "potential entry. Established support = a level that has held for several candles; a low "
     "formed one or two candles ago is not established."),
    ("setup_b", "Setup B - resistance break",
     "Established resistance exists; C1 breaks AND CLOSES above it; C2 crosses C1 high intrabar "
     "-> potential entry. No retest required. A wick through with a close below is not a break."),
    ("trigger", "Trigger",
     "Buy intrabar when C2 crosses above C1 high. A missed C2 is a missed trade. Only "
     "support/resistance known at entry may be used."),
    ("gate_mom_ttm", "Gate - MOM/TTM",
     "MOM and TTM improving towards positive (both). Negative and still falling does not "
     "confirm. Positive but falling is a risk signal to record, not a fail."),
    ("gate_ema_alignment", "Gate - 8/21 EMA alignment",
     "8 EMA above 21 EMA, all setups."),
    ("gate_ema_extension", "Gate - 8 EMA extension",
     "Not significantly extended from the 8 EMA: a fill more than about $0.20 above it is "
     "extended, read with the stock's volatility."),
    ("gate_stop_before_entry", "Gate - stop before entry",
     "Structural stop identified BEFORE entry."),
    ("gate_room", "Gate - room to resistance",
     "Room to the next known resistance/HOD of at least 1R: (resistance - entry) >= "
     "(entry - stop). HOD stays resistance until broken. VWAP is not resistance. A single "
     "candle body is not known resistance."),
    ("gate_danger_structure", "Gate - no danger structure",
     "No danger structure overhead (double top, repeated rejection)."),
    ("sizing", "Risk and size",
     "1R = $20 maximum planned risk. Shares = floor($20 / (entry - stop)). Less risk is "
     "allowed. Standing size 50 shares with a mental stop within about $0.40. A high-risk "
     "trade starts at 20 shares. A really good setup with a stop $0.20-$0.40 away can go to "
     "50-100 shares. The stop comes first, then size. Mental stop: aim under $0.40 per share. "
     "Exit early only on objective deterioration; an early exit without it is a fear/emotional "
     "exit. One candle failing to make a new high is not deterioration."),
    ("exit_plan", "Exit plan",
     "Scale out about 25% of the REMAINING position at the peak (candle rising and extended "
     "from the 8 EMA fast). Then candle by candle: next candle beats the previous high -> "
     "stay; if not, watch one more candle and take another 25% if it drops; exit fully if the "
     "trade does not survive. A planned 25% partial is a valid exit. A full exit where the "
     "plan calls for a second 25% is recorded as early."),
    ("categories", "Categories",
     "A clean execution; B valid entry with an execution or management issue; C invalid "
     "entry; X experimental Setup C."),
    ("violation_tags", "Primary violation tags",
     "No established support; Inadequate room to resistance; Extended / chase; Anticipated "
     "trigger; MOM/TTM not confirming; Late entry / setup expired."),
]


def seed_if_empty(conn):
    if conn.execute("SELECT COUNT(*) FROM strategy_rules WHERE kind='scalp'").fetchone()[0]:
        return
    now = db.now()
    for rule_key, _label, text in SEED_SCALP:
        conn.execute(
            "INSERT INTO strategy_rules(kind, rule_key, text, effective_from, source, created_at) "
            "VALUES ('scalp', ?, ?, ?, 'initial seed from rules/scalp.md', ?)",
            (rule_key, text, SEED_DATE, now))
    conn.commit()


def current_rules(conn, kind, as_of=None):
    """{rule_key: text} in force on `as_of` (default today), each the newest row whose
    effective_from <= as_of and whose effective_to is NULL or after as_of."""
    as_of = as_of or _date.today().isoformat()
    rows = conn.execute(
        "SELECT rule_key, text FROM strategy_rules WHERE kind=? AND effective_from<=? "
        "AND (effective_to IS NULL OR effective_to>?) ORDER BY rule_key, effective_from DESC",
        (kind, as_of, as_of)).fetchall()
    out = {}
    for r in rows:
        out.setdefault(r["rule_key"], r["text"])  # first (newest) row per key wins
    return out


def rules_text_for(conn, kind, as_of=None):
    """Formatted for the review prompt - same shape as the old rules/*.md files."""
    labels = {k: label for k, label, _ in SEED_SCALP}
    rules = current_rules(conn, kind, as_of)
    lines = []
    for rule_key, text in rules.items():
        lines.append("**%s**: %s" % (labels.get(rule_key, rule_key), text))
    return "\n\n".join(lines)


def change_log(conn, kind="scalp"):
    return conn.execute(
        "SELECT * FROM strategy_change_log WHERE kind=? ORDER BY id DESC", (kind,)).fetchall()


def apply_change(conn, kind, rule_key, new_text, effective_from, effect, applies_same_day, source):
    """Close the current row for rule_key and open a new one; log the change."""
    today = _date.today().isoformat()
    current = conn.execute(
        "SELECT * FROM strategy_rules WHERE kind=? AND rule_key=? AND effective_from<=? "
        "AND (effective_to IS NULL OR effective_to>?) ORDER BY effective_from DESC LIMIT 1",
        (kind, rule_key, today, today)).fetchone()
    original_text = current["text"] if current else None
    if current:
        conn.execute("UPDATE strategy_rules SET effective_to=? WHERE id=?", (effective_from, current["id"]))
    conn.execute(
        "INSERT INTO strategy_rules(kind, rule_key, text, effective_from, source, created_at) "
        "VALUES (?,?,?,?,?,?)", (kind, rule_key, new_text, effective_from, source, db.now()))
    conn.execute(
        "INSERT INTO strategy_change_log(date, kind, rule_key, original, new_text, effect, "
        "applies_same_day, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (today, kind, rule_key, original_text, new_text, effect, 1 if applies_same_day else 0, db.now()))
    conn.commit()


def classify_change(rule_key, original_text, new_text, model):
    """Ask Claude to classify a proposed rule change - looser/tighter/reversal/addition/
    definition - the same categories Strategy_Change_Log.md's 'effect' column uses. This is a
    judgment call (reading intent, not just diffing text), so it goes through the API; once
    classified, everything else (closing the old row, logging) is plain code."""
    from . import review  # local import: review.api_key()/model wiring, avoid a cycle at import time
    key = review.api_key()
    if not key:
        raise RuntimeError("No API key found. Put ANTHROPIC_API_KEY=... in %s." % config.ENV_FILE)
    import anthropic
    client = anthropic.Anthropic(api_key=key)
    system = (
        "You are checking whether Veekay's proposed wording changes a trading-strategy rule. "
        "Any change to the strategy is a red flag by his own standing rule - say so plainly, "
        "never soften it. Classify the effect as exactly one of: looser, tighter, reversal, "
        "addition, definition (a new rule where none existed before is \"addition\"; a change "
        "to the definition of a term used elsewhere is \"definition\").")
    msg = client.messages.create(
        model=model, max_tokens=1000, system=system,
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": {
            "type": "object",
            "properties": {
                "effect": {"type": "string", "enum": ["looser", "tighter", "reversal", "addition", "definition"]},
                "explanation": {"type": "string", "description": "One or two sentences: what changed and why it matters."},
            },
            "required": ["effect", "explanation"], "additionalProperties": False,
        }}},
        messages=[{"role": "user", "content": "Rule: %s\n\nOriginal wording:\n%s\n\nProposed wording:\n%s" % (
            rule_key, original_text or "(no prior rule - this is new)", new_text)}])
    raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    return json.loads(raw)


def build_playbook_pdf(ordered_rules, log_rows):
    """Printable rulebook, rendered live from the current strategy_rules/strategy_change_log
    rows - not a dated snapshot file to regenerate by hand. Mirrors TradeVenture's
    Strategy_Playbook_YYYYMMDD.pdf: a rule whose effective_from is after the original seed
    gets a red [CHANGED date] tag, same convention."""
    import io
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    styles = getSampleStyleSheet()
    tag_style = ParagraphStyle("tag", parent=styles["Normal"], textColor=colors.red, fontName="Helvetica-Bold")
    label_style = ParagraphStyle("label", parent=styles["Heading3"], spaceBefore=10, spaceAfter=2)

    # A rule whose current text's effective_from isn't the seed date has changed since the
    # original playbook - find that date per rule from strategy_rules, not from the log (a
    # rule could be re-seeded without a logged change, so the row's own date is the source).
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, title="Strategy Playbook",
                             topMargin=0.7 * inch, bottomMargin=0.7 * inch)
    story = [Paragraph("Scalp Strategy Playbook", styles["Title"]),
             Paragraph("Generated %s - live from the app, not a dated snapshot." % _date.today().isoformat(), styles["Normal"]),
             Spacer(1, 16)]

    for rule_key, label, text in ordered_rules:
        changed = _effective_from(rule_key)
        if changed and changed != SEED_DATE:
            story.append(Paragraph("%s &nbsp; <font color='red'><b>[CHANGED %s]</b></font>" % (label, changed), label_style))
        else:
            story.append(Paragraph(label, label_style))
        story.append(Paragraph(text, styles["Normal"]))

    if log_rows:
        story.append(Spacer(1, 20))
        story.append(Paragraph("Strategy Change Log", styles["Heading2"]))
        data = [["Date", "Rule", "Effect", "New wording"]]
        for r in log_rows:
            data.append([r["date"], r["rule_key"], r["effect"] or "",
                         Paragraph(r["new_text"][:200], styles["Normal"])])
        t = Table(data, colWidths=[0.8 * inch, 1.3 * inch, 0.9 * inch, 3.5 * inch])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
        ]))
        story.append(t)

    doc.build(story)
    return buf.getvalue()


def _effective_from(rule_key):
    """The current row's own effective_from for one rule_key (today's in-force version)."""
    with db.connect() as conn:
        row = conn.execute(
            "SELECT effective_from FROM strategy_rules WHERE kind='scalp' AND rule_key=? "
            "AND effective_from<=? AND (effective_to IS NULL OR effective_to>?) "
            "ORDER BY effective_from DESC LIMIT 1",
            (rule_key, _date.today().isoformat(), _date.today().isoformat())).fetchone()
        return row["effective_from"] if row else None
