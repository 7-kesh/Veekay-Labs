---
name: trading-journal
description: Working notes on the Trading-Journal side project (local trade-logging web app under Personal_projects/): state as of 2026-10-22, decisions, gotchas, what to pick up next.
metadata:
  type: project
---

# Trading-Journal (side project, built 2026-10-22)

**Where:** `Personal_projects/Trading-Journal/`. Its own docs are authoritative: `docs/PROJECT-SUMMARY.md` (snapshot, gotchas, session log) and `docs/1_PRD.md`. This file is only co-builder's working notes. It is not part of the Veekay Labs Phase 1-5 gates; don't count it toward them.

**What it is:** Flask + SQLite web app on 127.0.0.1:5057 for Veekay's trade logging. Sections: Scalp (log after the trade), Options and Swing (plan first, actuals later, plan-vs-actual), Futures ("Coming soon"). Left-sidebar navigation (Journal and Stats groups). Stats = Portfolio page (all areas side by side, combined result, biggest leaks) plus one page per type; each has a narrow "Focus now" list (exact habits to stop, impact judged from data), the broader "Key areas to improve", charts and margin analysis. Claude trade review (API key or copy-packet) graded against `rules/*.md`. Every entry has a Paper/Live field; all 103 imported scalp trades (from `TradeVenture/Trade_Log.csv`) are Paper.

**Why it exists:** Veekay's Google Sheet ("Live Trade Journal") was slow to fill (zig-zag entry), had no plan-vs-actual, and showed nothing about where money is lost. He is paper-trading small-cap scalps (1R = $20, 50 shares standard) and starting options/swing journals.

**Decisions Veekay made:** SQLite in rollback mode (the folder syncs to the cloud, so no WAL); Python/Flask; one machine at a time (lock file); `Trade_Log.csv` is the scalp source of truth; app lives in this repo; Futures deferred; all scalp is paper for now. Preferences: more colour, row-wise left-to-right entry to cut eye strain, quick tabs for sections.

**Open (waiting on Veekay):** wireframe/UI feedback (he is reviewing); API key not set up on any machine and the live review call has never been exercised; options risk budget ($75 from the sheet's 5% vs a $30 mention); confirm Options/Swing default to Paper; confirm the `rules/*.md` match the strategy in force; Futures fields; not yet run on the second machine; committed and pushed to GitHub (main) on 2026-10-22.

**Gotchas:** restart the server after changes (not in debug mode; process shows as `Python run.py`, stop with SIGTERM). Costs in "Key areas to improve" overlap. Python 3.9 is the system Python; the venv is per machine at `~/.venvs/trading-journal`. Any change to the trading strategy is a red flag per Veekay's `TradeVenture/Strategy_Change_Log.md` rule, so confirm before editing the rubric.

**Pick up next:** (1) apply Veekay's wireframe feedback (sidebar, Focus now and Portfolio were built after the first screenshots; he said he would review further and pick up again later on 2026-10-22); (2) API key + one real review; (3) second-machine test; (4) commit any new changes; (5) then Futures / weekly report / CSV export.

Related: [project-context](project-context.md) for the main platform; root `docs/PROJECT-SUMMARY.md` has a short 2026-10-22 entry for this work.
