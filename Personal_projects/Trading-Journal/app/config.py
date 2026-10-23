import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("TJ_DATA", ROOT / "data"))
DB_PATH = DATA / "journal.db"
SHOTS = DATA / "screenshots"
BACKUPS = DATA / "backups"
LOCK_PATH = DATA / ".lock"
RULES = ROOT / "rules"
PORT = int(os.environ.get("TJ_PORT", 5057))

# The API key and login credentials are per machine and stay out of the synced folder.
ENV_FILE = Path.home() / ".trading-journal.env"


def env_get(key):
    val = os.environ.get(key)
    if val:
        return val
    try:
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip().strip("'\"")
    except OSError:
        pass
    return None


def env_set(key, value):
    lines, found = [], False
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith(key + "="):
                lines.append("%s=%s" % (key, value))
                found = True
            elif line.strip():
                lines.append(line)
    if not found:
        lines.append("%s=%s" % (key, value))
    ENV_FILE.write_text("\n".join(lines) + "\n")
    try:
        os.chmod(ENV_FILE, 0o600)
    except OSError:
        pass

DEFAULT_SETTINGS = {
    "account_balance": "1500",
    "options_risk_pct": "5",
    "swing_risk_pct": "1",
    "swing_min_rr": "2",
    "scalp_risk_dollars": "20",
    "default_shares": "50",
    "default_commission": "0",
    "review_model": "claude-sonnet-5-5",
}

# One-tap lists for the entry forms. Edit freely.
SETUPS = ["A", "B", "C"]
CATEGORIES = {"A": "A - clean", "B": "B - valid entry, execution issue", "C": "C - invalid entry",
              "X": "X - experimental (Setup C)", "D": "D", "E": "E"}
VIOLATIONS = ["No established support", "Inadequate room to resistance", "Extended / chase",
              "Anticipated trigger", "MOM/TTM not confirming", "Late entry / setup expired",
              "Planned risk over $20", "No stop set before entry", "Moved or removed stop",
              "Early exit", "Held past stop"]
EMOTIONS = ["FOMO", "Fear exit", "Panic", "Revenge", "Overconfident", "Hesitated", "Calm / planned"]
ORDER_TYPES = ["Market", "Limit", "Stop", "Stop-limit", "Bracket"]

OPTIONS_CHECKLIST = [
    ("trend", "Trend: bullish or bearish setup identified on TradingView"),
    ("levels", "Support/resistance: valid entry area and price target identified"),
    ("confirm", "Confirmation: waited for the planned entry trigger"),
    ("contract", "Option selection: checked delta, expiration and liquidity"),
    ("risk", "Risk: stop-loss and profit target set before entry, planned risk within budget"),
]
SWING_CHECKLIST = [
    ("trend", "Trend: weekly/daily bias identified"),
    ("levels", "Support/resistance: valid entry area and price target identified"),
    ("confirm", "Confirmation: waited for the 4H/1H entry trigger"),
    ("risk", "Risk: stop-loss and profit target set before entry, planned risk within budget"),
]
EXIT_SCENARIOS = [
    ("target", "Reached planned target; sold", "Y"),
    ("stop", "Reached stop-loss; sold as planned", "Y"),
    ("invalid", "Setup invalidated; exited per predefined rule", "Y"),
    ("panic", "Panicked and sold without a planned reason", "N"),
    ("held", "Held beyond the stop hoping it would recover", "N"),
    ("early", "Exited early because I felt I had made enough", "N"),
]
TIMEFRAMES = {
    "options": "Analysis: Daily / 4H / 1H. Entry confirmation: 15M / 5M. Hold: intraday to 2 days.",
    "swing": "Analysis: Weekly / Daily. Entry confirmation: 4H / 1H. Hold: several days to weeks.",
}

# What to do about each violation tag, taken from rules/scalp.md. Unknown tags get a generic action.
VIOLATION_ACTIONS = {
    "No established support": "Wait until the level has held for several candles before taking Setup A. A low formed one or two candles ago is not support.",
    "Inadequate room to resistance": "Measure the room to the next known resistance or HOD before entry and require at least 1R.",
    "Extended / chase": "Skip fills more than about $0.20 above the 8 EMA. Wait for the next valid setup instead of chasing.",
    "Anticipated trigger": "Wait for C2 to actually cross C1's high intrabar. Do not buy before the trigger.",
    "MOM/TTM not confirming": "Check that both MOM and TTM are improving toward positive before you click buy.",
    "Late entry / setup expired": "If C2 was missed it is a missed trade. Wait for a new valid setup.",
    "Planned risk over $20": "Size from the stop: shares = floor($20 / (entry - stop)).",
    "No stop set before entry": "Write the structural stop down before you enter.",
    "Moved or removed stop": "Leave the stop where the plan put it. Re-place it only after a planned partial.",
    "Early exit": "Exit only on objective deterioration or the planned 25% scale-outs.",
    "Held past stop": "Exit at the stop. A stop that moves is not a stop.",
}

# One-line "do/don't" for each violation tag, shown in the Focus now block.
VIOLATION_DIRECTIVES = {
    "No established support": "Don't enter without established support",
    "Inadequate room to resistance": "Don't enter without 1R of room to resistance",
    "Extended / chase": "Avoid extended entries (no chasing above the 8 EMA)",
    "Anticipated trigger": "Wait for C2 to cross C1's high before buying",
    "MOM/TTM not confirming": "Don't enter when MOM and TTM aren't improving",
    "Late entry / setup expired": "Don't take a setup after C2 is gone",
    "Planned risk over $20": "Size every trade to $20 of risk or less",
    "No stop set before entry": "Set the stop before you enter",
    "Moved or removed stop": "Don't move or remove the stop",
    "Early exit": "Don't exit early without a chart reason",
    "Held past stop": "Exit at the stop, every time",
}
