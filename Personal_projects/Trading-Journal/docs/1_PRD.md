# Trading Journal: Product Requirements Document

> Status: v1 built and in use, 2026-10-22. Owner: Venkat Krishnan Chellappa (Veekay). Part of Veekay Labs, linked to the `TradeVenture/` folder.
> Wireframe review is pending (Veekay is reviewing the UI); open items are in section 11.

## 1. Problem

Veekay logs trades in a Google Sheet (tabs: Paper Live Journal, Options, Swing, plus reference tabs) and in `TradeVenture/Trade_Log.csv` plus weekly Markdown journals. Pain points:
- Entry is slow and zig-zags across wide sheets; the scalp sheet puts each trade in a column.
- Options and swing trades are planned first and closed later, but the sheet has no clear plan-vs-actual comparison. Its Swing tab also has `#REF!`/`#DIV/0!` errors and stale copied values.
- No view of where money is lost (which rule, which emotion, which time of day) or whether wins are big enough to pay for losses.
- Reviewing a trade with Claude means manually assembling screenshots, order details and rules each time.

## 2. Goals

1. Log a scalp trade in about 20 seconds after the trade.
2. For options and swing: capture the plan before entry, come back for actuals, and see plan vs actual.
3. Show profit/loss, win %, loss % and winning-vs-losing margins per trade type, and rank the key areas to improve.
4. Review any trade with Claude from inside the app, graded against Veekay's own written rules.
5. Keep all data local, available on both laptop and desktop through the synced GitHub folder.

## 3. Non-goals (v1)

- No live market data, charts or broker integration.
- No Futures (placeholder tab only: "Coming soon").
- Not multi-user, not hosted, no accounts or login.
- Not a replacement for the weekly strategy journal in `TradeVenture/` (strategy changes are still logged there).

## 4. User and context

Single user, a hands-on AI PM who paper-trades small-cap scalps (1-minute charts, 1R = $20, standard 50 shares) and is starting options and swing journals. Works on a laptop and a desktop; the GitHub folder syncs to the cloud. Currently all scalp trades are paper.

## 5. Scope: four sections

| Section | When entered | Flow |
|---|---|---|
| Scalp | After the trade | One-shot entry with setup, validity flags, violations, emotions |
| Options | Plan before entry | Plan, then actuals, then plan-vs-actual |
| Swing | Plan before entry | Same as options |
| Futures | n/a | "Coming soon" placeholder |

Supporting pages: Today (what is waiting for actuals), Stats, Settings.

## 6. Functional requirements

**Entry (all sections)**
- F1. Rows laid out left to right, numbered, with a label rail; Tab moves along a row; Cmd/Ctrl+Enter saves; sticky save bar; sticky in-page jump tabs.
- F2. Every entry has an Account field: Paper or Live (default Paper).
- F3. Section colours: Scalp blue, Options violet, Swing teal, Futures amber.

**Scalp**
- F4. Fields: ticker, date, in/out time, entry, shares (default 50), stop, commission, exits, setup A/B/C, setup/entry/exit valid, violations, emotions, category, entry/exit order type, notes, broker order text.
- F5. Exits accept one price (sells everything) or `shares@price; shares@price`. Planned risk, gross and net P&L, R and an automatic category (A clean, B execution issue, C invalid entry, X Setup C) are computed live and again on save.
- F6. Trade numbers continue the ledger (T104 onward). The 103 trades in `Trade_Log.csv` are imported (idempotent), with free-text cells kept verbatim.

**Options and Swing**
- F7. Plan: ticker, direction, entry/stop/target (premium or price), quantity, account balance, risk %, plus options-specific strike, expiry, delta, stock levels and liquidity (bid/ask, volume, open interest).
- F8. Live forecast: investment, risk budget, planned loss, potential profit, reward:risk, max contracts/shares in budget, and verdicts (affordable, within budget, meets the swing minimum 2:1, QUALIFIED).
- F9. Entry checklist from the sheet; actuals for entry and exit; exit scenario (target, stop, invalidated, panic, held past stop, early) suggests "exit followed".
- F10. Status derives from the data: planned, open, closed (or cancelled). A plan-vs-actual table shows entry slippage, where the exit landed against stop/target, realized P/L, ROI and R, and flags losses beyond the plan.

**Stats**
- F11. Tabs per section. Per tab: tiles (net, win %, loss %, average win/loss, win-to-loss size, profit factor, expectancy); cumulative P&L; P&L per trade; win/loss split; win rate vs break-even rate; winning-vs-losing margins; size distribution; written analysis; table view.
- F12. Filters: period (week, month, 30 days, all) and account (paper, live, both).
- F13. "Key areas to improve" at the top of each tab: up to six items ranked by dollar cost, each with evidence and an action drawn from the rules; costs overlap and are labelled as not additive.

**Claude review**
- F14. Per trade: paste screenshots (paste, drop or pick; shrunk in the browser), paste broker order text, then "Review with Claude" (API) or "Copy review packet" (no key). The review uses `rules/*.md` as the rubric and is saved with the trade.

## 7. Data and platform requirements

- N1. SQLite in rollback-journal mode (not WAL) in `data/journal.db`, because the folder syncs to the cloud. Screenshots in `data/screenshots/`. Neither is committed to git.
- N2. One writer at a time: a heartbeat lock file blocks a second machine; `--force` overrides after a crash. Daily backups, 14 kept.
- N3. The Python environment is per machine in `~/.venvs/trading-journal`, outside the synced folder. The API key is per machine in `~/.trading-journal.env`.
- N4. Server binds to 127.0.0.1 only. Stack: Python, Flask, SQLite, server-rendered templates, plain JavaScript and inline SVG (works offline, no CDN).
- N5. Calculations reproduce the sheet's numbers (options example: $109.96 P/L, 21.56% ROI, 3.27 R:R).

## 8. Success measures

- A scalp trade is logged in about 20 seconds.
- Every options/swing trade has a plan before entry and actuals after exit.
- Veekay uses the "Key areas to improve" list to choose one rule to work on each week.
- Reviews are run on the trades that break a rule.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cloud sync copies the database mid-write or from two machines | Rollback mode, single-writer lock, daily backups; wait for sync to finish before switching machines |
| Review rubric drifts from the strategy actually in force | `rules/*.md` seeded from the journal and `Strategy_Change_Log.md`; edit when strategy changes |
| Free-text legacy data cannot be parsed | Kept verbatim; manual net P&L field for rows whose exits cannot be parsed |
| Small samples mislead (options/swing start empty) | Insights say so when fewer than 5 trades |

## 10. Decisions made

SQLite rollback mode; Python/Flask; `Trade_Log.csv` is the scalp source of truth; project lives in the Veekay Labs repo under `Personal_projects/`; Futures deferred; Paper/Live is a field, not a separate database.

## 11. Open items

1. Wireframe/UI review by Veekay (pending).
2. API key not set up on either machine yet.
3. Options risk budget: the sheet calculator uses 5% of $1,500 ($75) but its checklist text says $30. Confirm and set in Settings.
4. Options and Swing entries default to Paper; confirm that is right.
5. Rules files need Veekay's confirmation against the strategy in force; categories D and E in the ledger have no definition.
6. Futures field list.
7. Not yet run on the second machine (committed to git 2026-10-22).
8. Possible later: nightly CSV export, premium estimator (greeks), weekly report page, strategy-change log inside the app.
