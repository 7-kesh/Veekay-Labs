// Port of app/config.py's one-tap lists and defaults. Edit freely, same as the Python file.

export const DEFAULT_SETTINGS = {
  account_balance: "1500",
  options_risk_pct: "5",
  swing_risk_pct: "1",
  swing_min_rr: "2",
  scalp_risk_dollars: "20",
  default_shares: "50",
  default_commission: "0",
  review_model: "claude-sonnet-5-5",
};

export const SETUPS = ["A", "B", "C"];

export const CATEGORIES = {
  A: "A - clean", B: "B - valid entry, execution issue", C: "C - invalid entry",
  X: "X - experimental (Setup C)", D: "D", E: "E",
};

export const VIOLATIONS = ["No established support", "Inadequate room to resistance", "Extended / chase",
  "Anticipated trigger", "MOM/TTM not confirming", "Late entry / setup expired",
  "Planned risk over $20", "No stop set before entry", "Moved or removed stop",
  "Early exit", "Held past stop"];

export const EMOTIONS = ["FOMO", "Fear exit", "Panic", "Revenge", "Overconfident", "Hesitated", "Calm / planned"];

export const ORDER_TYPES = ["Market", "Limit", "Stop", "Stop-limit", "Bracket"];

// What to do about each violation tag, taken from rules/scalp.md. Unknown tags get a generic action.
export const VIOLATION_ACTIONS = {
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
};

// One-line "do/don't" for each violation tag, shown in the Focus now block.
export const VIOLATION_DIRECTIVES = {
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
};

export const OPTIONS_CHECKLIST = [
  ["trend", "Trend: bullish or bearish setup identified on TradingView"],
  ["levels", "Support/resistance: valid entry area and price target identified"],
  ["confirm", "Confirmation: waited for the planned entry trigger"],
  ["contract", "Option selection: checked delta, expiration and liquidity"],
  ["risk", "Risk: stop-loss and profit target set before entry, planned risk within budget"],
];

export const SWING_CHECKLIST = [
  ["trend", "Trend: weekly/daily bias identified"],
  ["levels", "Support/resistance: valid entry area and price target identified"],
  ["confirm", "Confirmation: waited for the 4H/1H entry trigger"],
  ["risk", "Risk: stop-loss and profit target set before entry, planned risk within budget"],
];

// The gate keys Claude judges from the chart - same order as review.GATE_KEYS.
export const GATE_LABELS = {
  established_level: 'Established level', trigger: 'Trigger', room: 'Room',
  mom_ttm: 'MOM / TTM', ema_extension: '8 EMA extension', exit_structure: 'Exit structure',
};

export const EXIT_SCENARIOS = [
  ["target", "Reached planned target; sold", "Y"],
  ["stop", "Reached stop-loss; sold as planned", "Y"],
  ["invalid", "Setup invalidated; exited per predefined rule", "Y"],
  ["panic", "Panicked and sold without a planned reason", "N"],
  ["held", "Held beyond the stop hoping it would recover", "N"],
  ["early", "Exited early because I felt I had made enough", "N"],
];
