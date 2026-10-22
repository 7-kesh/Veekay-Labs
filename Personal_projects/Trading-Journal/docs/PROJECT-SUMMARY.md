# Trading Journal: Project Build Summary

> Read this first at the start of a session, then `docs/1_PRD.md`. Update the Snapshot and add a Session Log entry at the end of each session.

## Current Snapshot

- **Status:** v1 built and running locally (2026-10-22), including the sidebar layout, per-type stats pages, Portfolio summary and the "Focus now" list. Veekay is reviewing the UI wireframe; more work planned later the same day.
- **Run it:** `Trading-Journal.command` or `./run.sh` -> http://127.0.0.1:5057 (only one machine at a time).
- **Data:** 103 scalp trades imported (T001-T103, all Paper). No options or swing plans yet. `data/journal.db`, backups in `data/backups/`.
- **Tests:** `~/.venvs/trading-journal/bin/python -m pytest tests` -> 10 passing (calculations, margins, DB migration, narrow focus list, empty-area metrics).
- **Git:** committed and pushed to the Veekay-Labs repo (main) on 2026-10-22; `data/` is git-ignored.
- **Not done:** API key setup; run on the second machine; Futures; Veekay's UI review.
- **Waiting on Veekay:** wireframe feedback, API key, options risk budget ($75 vs $30), confirmation that Options/Swing default to Paper, rules-file review.

## What exists

| Area | Where |
|---|---|
| Calculations (scalp, options, swing, realized) | `app/calc.py` |
| Win/loss metrics, histogram, written margin analysis | `app/perf.py` |
| Ranked "Key areas to improve" and the narrow "Focus now" list | `app/improve.py` (violation actions and one-line directives in `app/config.py`) |
| Database, migration, daily backup | `app/db.py` |
| Single-writer lock across machines | `app/lock.py` |
| Trade_Log.csv importer | `app/importer.py` |
| Claude review (API and copy-packet) | `app/review.py`, rubric in `rules/*.md` |
| Routes (all pages, uploads, review, CSV export) | `app/routes.py` |
| UI | `app/templates/*.html` (`base.html` is the sidebar shell; `stats_kind.html`, `stats_portfolio.html`, `_stats_macros.html`), `app/static/{app.css,app.js,scalp.js,plan.js,charts.js}` |
| Entry points | `run.py`, `run.sh`, `Trading-Journal.command` |

About 1,500 lines of Python plus templates, CSS and JavaScript (about 2,700 lines in total).

## Navigation and pages

Sidebar (collapses to a top bar on narrow screens): **Today**; **Journal** (Scalp, Options, Swing, Futures soon); **Stats** (Portfolio, Scalp stats, Options stats, Swing stats); Settings. Stats pages are `/stats/portfolio` and `/stats/<scalp|options|swing>`; `/stats` redirects to Portfolio; the period and account filters carry across stats links. Each stats page shows **Focus now** (3 narrow, specific habits ranked by dollar cost with High/Medium/Low impact judged from the data), then **Key areas to improve** (the broader overall list), then KPIs and charts. Portfolio shows the combined result, the biggest leaks across all areas, an areas-side-by-side table, cumulative P&L by area, and a summary card per area.

## Architecture notes

- Flask server on 127.0.0.1, server-rendered Jinja, plain JS, inline SVG charts, no external libraries or CDN.
- SQLite in rollback-journal mode with `synchronous=FULL`: the folder syncs to the cloud, and WAL side files would corrupt. A heartbeat lock file (`data/.lock`) allows one running machine; SIGTERM releases it.
- Per-machine items live outside the synced folder: venv `~/.venvs/trading-journal`, key `~/.trading-journal.env`.
- Plans (options and swing) share one `plans` table with a `kind` column; status is derived from which actuals are filled in.
- Live calculators in JS mirror `calc.py`; the server recomputes everything on save, so Python is the source of truth.
- Imported ledger rows keep their original text in `legacy_json`; rows whose exits are not in `shares@price` form keep the stored P&L (manual field on the form).
- Schema changes are applied by `db.init()` on startup (the Paper/Live column was added this way to the existing database).

## Gotchas learned

- "Focus now" is deliberately narrow: umbrella items, items touching more than 35% of trades (with 10+ trades), and items repeating another item's trades are excluded. Its "had you skipped these" figure is per item, so items overlap.
- Per-area metrics must be `None` (not missing) when an area has no trades, or templates print stray "%".

- The server is not run in debug mode: restart it after code or template changes (`pkill -TERM -f "Python run.py"`, then start again). Process name is capital-P `Python`.
- Background processes ignore SIGINT; use SIGTERM (a handler releases the lock).
- Browser screenshots may be downscaled; the real viewport can be wider than the image suggests.
- Costs in "Key areas to improve" overlap; never present them as additive.

## Session Log

### 2026-10-22 (later): Sidebar, stats pages, Portfolio, Focus now

**Did**
- Moved all navigation to a left sidebar (Journal and Stats groups, colour per area); removed the top tab bar and the in-page stats tabs.
- Split Stats into Portfolio plus one page per trade type, each with its own URL.
- Added the Portfolio page: combined KPIs, biggest leaks across all areas, areas side by side, cumulative P&L by area, net P&L and trade count by area, and a summary card per area.
- Added "Focus now" above "Key areas to improve" on every stats page: exact do/don't items such as "Avoid extended entries" with High/Medium/Low impact from the data, trades affected, dollars lost, share of all losses and a "had you skipped these" figure.
- Committed and pushed the repo at the end of the session.

**Veekay's scalp data now says** (98 trades, paper): net -$171.87; top focus items are avoiding extended entries (-$271), capping losses at 1R (-$146) and not entering without established support (-$110).

### 2026-10-22: Built v1 and iterated on the UI

**Did**
- Read the "Live Trade Journal" sheet export (`~/Downloads/Live Trade Journal/`) and `TradeVenture/` files; agreed scope with Veekay (four sections, plan-then-actuals for options/swing, Claude review, local SQLite synced via the GitHub folder).
- Built the app (calc, DB, lock, importer, review, routes, templates, JS) and tested every route with a throwaway database, plus a browser check of the live calculators.
- Imported 103 scalp trades. Calculators reproduce the sheet's options example exactly.
- UI pass: section colours, left-to-right numbered rows, sticky jump tabs, Cmd/Ctrl+Enter save, colored chips and win/loss row tints.
- Stats: charts for all three trade types, written margin analysis, ranked key areas to improve (scalp history: net -$171.87 over 98 trades, win 36% vs 43% needed to break even, average win $13.99 vs average loss $10.67, top cost: invalid entries -$301).
- Added the Paper/Live field everywhere, with account filters on lists and Stats.
- Added session notes to `Veekay-Labs/docs/PROJECT-SUMMARY.md`; wrote this summary and the PRD.

**Decided (Veekay)**
- SQLite rollback mode; Python/Flask; `Trade_Log.csv` is the scalp source of truth; app lives in the Veekay Labs repo; Futures stays "Coming soon"; all scalp is paper for now.

**Open**
- See Snapshot "Waiting on Veekay".

**Next session should**
- Ask for Veekay's wireframe feedback (sidebar layout, Focus now, Portfolio page) and apply it first.
- Set up the API key and run one real review end to end (not yet exercised against the API).
- Offer to run it on the second machine to test sync and the lock.
- Then candidates: Futures fields, weekly report page, nightly CSV export, premium estimator.
