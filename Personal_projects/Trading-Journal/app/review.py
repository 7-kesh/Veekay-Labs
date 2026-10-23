"""Trade review with Claude: the trade, your rules, order details and screenshots in one request."""
import base64
import json
import mimetypes
import os

from . import config, db

SYSTEM = """You are reviewing one trade for Veekay, a disciplined retail trader who journals every trade.
Grade the trade against Veekay's written rules, which are included below, not against generic advice.

Rules of engagement:
- Judge only what was knowable at entry. The P&L never decides whether an entry was valid.
- Use the screenshots and order details as evidence. If something is not visible or not recorded, mark that
  gate "insufficient_evidence" - never invent prices, levels or indicator readings, and never guess a pass.
- Cite the rule you are applying by name (for example "Room >= 1R" or "stop set before entry").
- Be direct and concise. No cheerleading, no generic trading advice.

Answer in this structure:
**Verdict** - one line: entry valid / invalid, exit valid / invalid, and the category you would assign.
**Rule check** - a short table: rule | pass / fail / insufficient evidence | evidence.
**Execution** - order types, fills against the plan, stop handling, partials.
**Plan vs actual** - only for options and swing trades.
**The one thing to fix** - a single concrete action for the next trade.
"""

# Scalp reviews run the gate-by-gate Objective Assessment and return a structured proposal.
# Only gates that genuinely need a chart go to Claude; size, stop-recorded and 5-minute-reset are
# pure arithmetic/stored-data checks and live in rule_engine.py instead - no point spending a
# vision call on math. The proposal pre-fills the edit form; it is never saved automatically.
GATE_KEYS = ["established_level", "trigger", "room", "mom_ttm", "ema_extension", "exit_structure"]

GATE_ADDENDUM = """
Also assess these six gates - the ones that genuinely need the chart, not the ones that are pure
arithmetic (size, stop-recorded and the 5-minute reset are checked separately, in code, not by you):
- established_level: for Setup A, has the support held for several candles (a low formed 1-2 candles
  ago is NOT established)? For Setup B, did C1 break AND close above established resistance?
- trigger: did C2 actually cross C1's high intrabar, on the candle actually bought (not anticipated,
  not a later candle after a missed C2)?
- room: is (resistance - entry) >= (entry - stop) against the next KNOWN resistance/HOD at entry time,
  with no danger structure (double top, repeated rejection) overhead?
- mom_ttm: are both MOM and TTM improving toward positive? Negative-and-falling fails; positive-but-
  falling is a risk signal to note, not a fail.
- ema_extension: is the fill extended more than about $0.20 above the 8 EMA (read with volatility)?
  Also note here if the 8 EMA is below the 21 EMA (alignment required in all setups).
- exit_structure: did the scale-out/hold-or-exit sequence follow the exit plan (25% at a peak, then
  candle-by-candle against the prior high), judged by chart structure, not by what price did later?

For each: "result" is "pass", "fail", or "insufficient_evidence" (insufficient evidence is not a pass),
and "evidence" is one or two sentences of what was visible at entry (or at the relevant exit point).

Then fill in the `proposed` object so it matches your gates and narrative verdict exactly - these values
pre-fill Veekay's edit form for him to review and save himself, they are never applied automatically.
Leave a field empty ("" or []) when the evidence is insufficient to recommend a value; never guess
just to fill every field."""


def _scalp_schema():
    gate = {
        "type": "object",
        "properties": {
            "result": {"type": "string", "enum": ["pass", "fail", "insufficient_evidence"]},
            "evidence": {"type": "string"},
        },
        "required": ["result", "evidence"],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {
            "narrative": {"type": "string", "description": "The full review, as markdown, in the structure given above."},
            "gates": {
                "type": "object",
                "properties": {k: gate for k in GATE_KEYS},
                "required": GATE_KEYS,
                "additionalProperties": False,
            },
            "proposed": {
                "type": "object",
                "properties": {
                    "setup": {"type": "string", "enum": list(config.SETUPS) + [""]},
                    "setup_valid": {"type": "string", "enum": ["Y", "N", ""]},
                    "entry_valid": {"type": "string", "enum": ["Y", "N", ""]},
                    "exit_valid": {"type": "string", "enum": ["Y", "N", ""]},
                    "category": {"type": "string", "enum": list(config.CATEGORIES.keys()) + [""]},
                    "violations": {"type": "array", "items": {"type": "string", "enum": config.VIOLATIONS}},
                    "emotions": {"type": "array", "items": {"type": "string", "enum": config.EMOTIONS}},
                },
                "required": ["setup", "setup_valid", "entry_valid", "exit_valid", "category", "violations", "emotions"],
                "additionalProperties": False,
            },
        },
        "required": ["narrative", "gates", "proposed"],
        "additionalProperties": False,
    }


def api_key():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        return key
    try:
        for line in config.ENV_FILE.read_text().splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                return line.split("=", 1)[1].strip().strip("'\"")
    except OSError:
        pass
    return None


def rules_text(kind):
    name = "scalp" if kind == "scalp" else kind
    out = []
    for n in (name,):
        p = config.RULES / ("%s.md" % n)
        if p.exists():
            out.append(p.read_text())
    return "\n\n".join(out)


def trade_text(kind, row):
    """Plain-text rendering of a trade, skipping empty fields and bulky internals."""
    skip = {"legacy_json", "id", "created_at", "updated_at", "checklist"}
    lines = ["%s: %s" % (k, row[k]) for k in row.keys() if k not in skip and row[k] not in (None, "")]
    if kind != "scalp" and row["checklist"]:
        try:
            done = json.loads(row["checklist"])
            ticked = ", ".join(k for k, v in done.items() if v) or "none"
            lines.append("entry checklist ticked: %s" % ticked)
        except ValueError:
            pass
    return "\n".join(lines)


def packet(kind, row, shots):
    """Everything the review needs as text, for pasting into any Claude chat."""
    return "\n\n".join([
        SYSTEM,
        "## Veekay's rules (%s)\n%s" % (kind, rules_text(kind)),
        "## Trade\n%s" % trade_text(kind, row),
        "## Screenshots\n%d attached in the journal; attach them to this message." % len(shots),
    ])


def _image_block(path):
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    data = base64.standard_b64encode(path.read_bytes()).decode()
    return {"type": "image", "source": {"type": "base64", "media_type": mime, "data": data}}


def run(kind, ref_id, row, shot_names, model):
    key = api_key()
    if not key:
        raise RuntimeError("No API key found. Put ANTHROPIC_API_KEY=... in %s, or use 'Copy review packet'." % config.ENV_FILE)
    import anthropic
    content = []
    for i, name in enumerate(shot_names[:8], 1):
        p = config.SHOTS / name
        if p.exists():
            content += [{"type": "text", "text": "Screenshot %d:" % i}, _image_block(p)]
    content.append({"type": "text", "text": "## Trade\n%s\n\nReview this trade." % trade_text(kind, row)})
    client = anthropic.Anthropic(api_key=key)
    system = SYSTEM + "\n\n## Veekay's rules (%s)\n%s" % (kind, rules_text(kind))
    structured = kind == "scalp"  # only the scalp form has a stable, well-known field set so far
    # Grading against an explicit written rubric is closer to classification than open-ended
    # reasoning - low effort keeps thinking from eating the whole max_tokens budget (it did, at
    # the old 2500/default-effort combo: stop_reason came back "max_tokens" with zero text).
    kwargs = dict(model=model, max_tokens=6000, system=system + (GATE_ADDENDUM if structured else ""),
                  output_config={"effort": "low"}, messages=[{"role": "user", "content": content}])
    if structured:
        kwargs["output_config"]["format"] = {"type": "json_schema", "schema": _scalp_schema()}
    msg = client.messages.create(**kwargs)
    raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    gates = proposed = None
    if structured:
        data = json.loads(raw)
        text, gates, proposed = data["narrative"], data["gates"], data["proposed"]
    else:
        text = raw
    stored = {"gates": gates, "proposed": proposed} if structured else None
    with db.connect() as conn:
        conn.execute("INSERT INTO reviews(kind, ref_id, model, text, proposed_json, created_at) VALUES (?,?,?,?,?,?)",
                     (kind, ref_id, model, text, json.dumps(stored) if stored else None, db.now()))
    return text, gates, proposed
