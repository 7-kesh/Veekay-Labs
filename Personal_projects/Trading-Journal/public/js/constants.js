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
