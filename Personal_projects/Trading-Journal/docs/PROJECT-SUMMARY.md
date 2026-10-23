# Trading Journal: Project Build Summary

> Read this first at the start of a session, then `docs/1_PRD.md`. Update the Snapshot and add a Session Log entry at the end of each session.

## Current Snapshot

- **Status:** v1 built and running locally (2026-10-22), including the sidebar layout, per-type stats pages, Portfolio summary and the "Focus now" list. Wireframe reviewed live (Veekay clicking through while co-builder drove a separate tab) - one real bug found and fixed (see Session Log). A local login gate (email + password, session cookie) was added the same day at Veekay's request.
- **Run it:** `Trading-Journal.command` or `./run.sh` -> http://127.0.0.1:5057 (only one machine at a time). First visit after this change prompts "Set up your login" - credentials are per-machine, stored (hashed) in `~/.trading-journal.env`, never in the synced folder.
- **Data:** 103 scalp trades imported (T001-T103, all Paper), plus T100-T103 logged live. No options or swing plans yet. `data/journal.db`, backups in `data/backups/`.
- **Tests:** `~/.venvs/trading-journal/bin/python -m pytest tests` -> 10 passing (calculations, margins, DB migration, narrow focus list, empty-area metrics). Auth has no test coverage yet (manual browser verification only).
- **Git:** last pushed 2026-10-22 (`aad6351`); this session's changes (login gate, Portfolio grid fix, "Property of VeekayLabs" footer, dead `stats.html` removal) not yet committed.
- **Not done:** API key setup; run on the second machine; Futures; automated tests for login.
- **Waiting on Veekay:** set his real login email/password (test credentials were used to verify the flow, then wiped); options risk budget ($75 vs $30); confirmation that Options/Swing default to Paper; rules-file review.
- **Planned (scoped, not started):** migrate to Cloudflare Pages + Supabase - full rewrite (Python calc/perf/improve/review logic -> JS, static+Supabase like `piggy-payday-site`), Supabase Auth email+password (not magic-link - Veekay's call, overriding the initially recommended magic-link), one-time data migration of existing scalp trades, then retire the local Flask app.
- **In progress (2026-10-22, later):** consolidating everything TradeVenture's skill-driven journal does into this app, then retiring TradeVenture. Phase 1 (the 10-gate Objective Assessment, split between Claude's vision gates and a new `rule_engine.py` for arithmetic/consistency gates) is built and verified against a real trade via Python/Flask test-client, not yet exercised through the browser. See the Session Log entry below for the full design and the five remaining phases (strategy governance + PDF playbook, Setup C gates, 2-candle tally, weekly wrap-up ritual, audit trail).

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

### 2026-10-22 (co-builder, continued): Phase 1 of the 6-feature architecture - 10-gate Objective Assessment, rule engine

**Context:** Veekay wants everything TradeVenture's skill-driven journal does (strategy governance, the 10-gate Objective Assessment, Setup C's versioned gates, the 2-candle tally, the weekly wrap-up ritual, an audit trail) consolidated into this app, then TradeVenture retired. Published an architecture diagram (not saved to this repo - a Claude Artifact) splitting every feature between what genuinely needs Claude's vision/judgment and what's pure arithmetic/stored-data logic a rule engine can check for free. Phased: #2 (this session) first since the review feature already in progress extends directly into it; strategy governance (#1, now also scoped to include a live-rendered PDF playbook, mirroring `Strategy_Playbook_YYYYMMDD.pdf`) is Phase 2; #3-6 follow.

**Built:**
- `review.py` rewritten: Claude's structured output is now the real 6-gate Objective Assessment (`established_level`, `trigger`, `room`, `mom_ttm`, `ema_extension`, `exit_structure` - only the gates that need a chart), each gate `pass`/`fail`/`insufficient_evidence` with evidence text, via `output_config.format` json_schema. `size`, `stop_recorded` and the 5-minute same-ticker reset are deliberately NOT asked of Claude - they're pure arithmetic/stored-data checks, handled by the new rule engine instead.
- `app/rule_engine.py` (new): `check_size`, `check_stop_recorded`, `check_5min_reset`, `check_category_consistency` - zero API cost, pure functions, 6 new pytest tests (16/16 passing).
- `/scalp/<id>/check` route: runs the rule engine against the form's CURRENT (possibly just-edited, unsaved) values, not what's stored - the "Check against rules" button on the scalp edit page.
- `reviews.proposed_json` now stores `{gates, proposed}`; the review UI shows gate chips (color-coded) plus a "Fill in Claude's suggestion" button that pre-fills the edit form's fields - never auto-saves, same as before.
- `scalp_trades.tally_2candle` column added (success/fail/contaminated), with a field on the edit form - Feature #4's data point, aggregation/rate computation not yet built.
- "Property of VeekayLabs" footer added to both this app and `piggy-payday-site` (the latter edited but not deployed - Cloudflare deploy was blocked by the auto-mode safety classifier, waiting on Veekay's go-ahead).

**Real bug hit and fixed:** the first live test came back with `stop_reason: max_tokens` and zero text - Sonnet 5.5's default (high) effort adaptive thinking consumed the entire 2500-token budget on thinking alone, none left for the structured JSON. Fixed by setting `output_config.effort: "low"` (a grading-against-explicit-rules task is classification, not open-ended reasoning - matches the Claude API skill's cost-tuning guidance) and raising `max_tokens` to 6000. Verified against a real trade (T103, SAIQ, no screenshots): ~$0.023, Claude correctly marked every vision-dependent gate "insufficient_evidence" rather than guessing (no screenshot was attached), and independently flagged the same $40-over-cap risk violation already logged on that trade via the rule engine - a real, correct catch.

**Not yet done:** the Claude-review path hasn't been exercised through the actual browser/UI yet (only direct Python + Flask test-client calls, since Veekay hasn't finished first-run login setup - `auth.configured()` is still false, so every page redirects to `/login`). Next session should ask him to complete that, then watch him click "Review with Claude" and "Check against rules" for real on a trade with screenshots.

**Next session should:** Phase 2 - strategy governance as versioned, dated rule rows (never overwritten in place; a change closes the old row's `effective_to` and opens a new one), a change log, red-flag detection when Veekay's wording changes an existing rule, and every assessment (both Claude's prompt and the rule engine) resolving "what applied on this trade's own date" by date-range lookup - plus the live-rendered PDF playbook. Also: 2-candle tally aggregation/rate, and commit this session's changes (still uncommitted, same as the prior entry).

### 2026-10-22 (co-builder): Wireframe review, login gate, Cloudflare+Supabase scoped

**Did**
- Server had crashed (stale `data/.lock`); restarted with `--force` after confirming via browser no real instance was reachable.
- Wireframe review: swept Today, Portfolio, Scalp stats, Options (empty state), Settings. Found and fixed one real bug - the Portfolio "Area summaries" grid (`sumgrid`, `auto-fit, minmax(300px,1fr)`) only fits 3 columns at this width, so the Futures "Coming soon" card orphaned alone under column 1. Fixed with `.sumcard.ar-futures{grid-column:1/-1}` so it spans the full row as a placeholder banner. Also deleted `app/templates/stats.html`, dead debris left on disk from the 2026-10-22 refactor (confirmed unreferenced; git had already deleted it from the repo in `aad6351`).
- Built a login gate at Veekay's request (`app/auth.py`): email + password, session cookie, credentials hashed with `generate_password_hash(..., method="pbkdf2:sha256")` - explicitly not werkzeug's scrypt default, since this machine's Python 3.9 `hashlib` has no scrypt support (hit and fixed a 500 on first submit before catching this). Credentials and a persisted random Flask `secret_key` live in `~/.trading-journal.env` (same per-machine, out-of-repo pattern as the Anthropic API key), added via new `config.env_get`/`env_set` helpers. First visit with no credentials configured shows a "Set up your login" form instead of a normal login; `app.before_request(auth.require_login)` gates every route except `/login` and static files.
- Verified end-to-end in a real browser with throwaway test credentials: first-run setup -> redirect to Today, logout -> redirect to login, direct hit on a protected URL while logged out -> redirect to `/login?next=...`. Test credentials wiped from the env file afterward (kept the generated secret key) so Veekay sets his real ones on next visit.
- Added a small "Property of VeekayLabs" footer (sidebar on every page, plus the login page, which doesn't use the shared sidebar template).
- Real gotcha re-confirmed: Jinja templates are cached in memory since the server runs with `debug=False` (`TEMPLATES_AUTO_RELOAD` follows `app.debug`) - a template edit (base.html/login.html) silently didn't show up until the server was restarted, same as the documented Python-change gotcha. Worth generalizing that gotcha to "any code or template change," not just Python.
- Scoped the Cloudflare Pages + Supabase migration with Veekay (not started): full rewrite following the `piggy-payday-site` pattern (static HTML/JS + Supabase, Python calc/perf/improve/review logic ported to JS), Supabase Auth with email+password (he asked to switch off the initially-recommended magic-link), one-time migration of existing scalp trades, then retire the local Flask app.
- Tests: 10/10 passing throughout (ran after every restart).

**Decided (Veekay)**
- Local login gate: email + password (not magic-link), right now, on the local app.
- Hosted version: Cloudflare Pages + Supabase, full JS rewrite (not keep-Flask-elsewhere), email+password auth, migrate-then-retire the local app.

**Open**
- Veekay needs to set his real login credentials (first-run form is live).
- This session's changes are uncommitted: login gate, Portfolio CSS fix, dead-file removal, footer.
- Cloudflare+Supabase migration not started - see Snapshot "Planned."

**Next session should**
- Commit this session's changes once Veekay confirms the login flow with his real credentials.
- Start the Cloudflare+Supabase migration: Supabase schema design (scalp/options/swing tables from the current SQLite schema), auth setup, then port `calc.py` to JS first (it's the one piece every page depends on).

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
