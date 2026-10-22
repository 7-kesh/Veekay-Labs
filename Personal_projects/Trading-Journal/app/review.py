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
- Use the screenshots and order details as evidence. If something is not visible or not recorded, say
  "not visible" or "not recorded". Never invent prices, levels or indicator readings.
- Cite the rule you are applying by name (for example "Room >= 1R" or "stop set before entry").
- Be direct and concise. No cheerleading, no generic trading advice.

Answer in this structure:
**Verdict** - one line: entry valid / invalid, exit valid / invalid, and the category you would assign.
**Rule check** - a short table: rule | pass / fail / not visible | evidence.
**Execution** - order types, fills against the plan, stop handling, partials.
**Plan vs actual** - only for options and swing trades.
**The one thing to fix** - a single concrete action for the next trade.
"""


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
    msg = client.messages.create(
        model=model, max_tokens=2500,
        system=SYSTEM + "\n\n## Veekay's rules (%s)\n%s" % (kind, rules_text(kind)),
        messages=[{"role": "user", "content": content}])
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    with db.connect() as conn:
        conn.execute("INSERT INTO reviews(kind, ref_id, model, text, created_at) VALUES (?,?,?,?,?)",
                     (kind, ref_id, model, text, db.now()))
    return text
