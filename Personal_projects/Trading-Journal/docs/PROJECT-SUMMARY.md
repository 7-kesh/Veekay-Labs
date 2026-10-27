# Trading Journal: Project Build Summary

> Read this first at the start of a session, then `docs/1_PRD.md`. Update the Snapshot and add a Session Log entry at the end of each session.

## Current Snapshot (as of 2026-10-26, end of session)

- **LIVE as of 2026-10-26 (Worker version 0b3bc084 + later, deployed with `npx wrangler deploy` from this machine; last code commit 972cb99):** the whole direction change plus the redesign. Capture + "Export for AI-Assist-Review" (per trade, and per day with a picker to choose specific trades), Load journal (`#/import`), Daily journal pages, Improvements ranking, year/month filters, 7-day screenshot purge, new palette/sidebar/metric cards, win-rate gauge + trading-score radar (`score.js`), Live account filter as the default on lists and stats, number/time auto-correct (`numeric.js`), screenshots attach only after the first Save (draft-on-upload removed), saves serialized to stop duplicate records, loading a wrap-up marks the trades it lists as complete (one-time at load, scalp only). The older bullets below that say "not live" or "uncommitted" are superseded by this one.
- **Still to do by Veekay:** install `claude-skills-repository/skills/trade-journal/SKILL_261026.md` as the `trade-journal` skill in the Claude app (installed copy is the old 261007_v3; old skill cannot produce `tj-wrapup/1`); test that the skill can read a zip dropped in `TradeVenture/App_Exports/` (folder does not exist yet, create it; the app only downloads to the browser's Downloads); run one real export -> chat -> wrap-up -> load round trip; confirm the upload freeze is gone on a saved trade (cause of the freeze not reproduced; if it persists, look at original-size PNG upload/processing).
- **Cloudflare note:** git-triggered builds were stuck queued; deploys have been done directly with wrangler (Claude's permission classifier blocks it unless Veekay says "deploy"). Pushes still queue a redundant build of the same code. `npm install` may be needed on another machine (esbuild binary).

- **The app is now hosted and at full feature parity with the original:** live at `veekay-labs-trade-journal.venkatkrishnanchellappa.workers.dev`, a Cloudflare **Worker** (Workers Builds, not Pages - see Session Log). Every page from the original local Flask app has a working equivalent: Today, Scalp CRUD, Options/Swing CRUD, screenshots + Claude review (via `src/routes/review.js`, API key as a Worker secret), strategy governance (propose/Claude-classify/apply/**download playbook PDF**), weekly wrap-up, Settings, CSV export, delete-from-list, and Portfolio/per-kind stats with the full inline-SVG chart set. Always-light theme (dark mode removed). See `public/` for the app code, `src/` for the Worker, `supabase/` for the SQL already run, `wrangler.jsonc` for the Worker config.
- **Real data is live and verified correct:** all 103 scalp trades migrated from the local `data/journal.db` via the in-app "Import local data" tool (Settings page), diffed trade-by-trade against the local database, confirmed matching to the cent (net -$171.87). See Session Log for a real bug this surfaced and fixed (leftover test trades colliding with real trade numbers during import).
- **Local Flask app still exists** at `./run.sh` -> http://127.0.0.1:5057, untouched this session, same 103 trades (now also the source of truth that was migrated). Not yet retired - that's Veekay's call once he trusts the hosted version fully.
- **No remaining feature gaps vs. the original app.** The strategy PDF playbook (last gap) is ported - `public/js/playbook-pdf.js` using `pdf-lib` (loaded from jsdelivr) instead of Python's `reportlab`, same layout: title, generated-date note, one heading+body per rule with a red `[CHANGED date]` tag on anything modified since the seed, then the change-log table. "Download playbook PDF" button on `/strategy`.
- **Scalp entry form redesigned (2026-10-23, Veekay's spec) - BLOCKED on a SQL migration he needs to run:** `supabase/migrate-section3-assessments.sql` (new fields on `scalp_trades`: support/resistance/confluence, structure/trigger/extended/EMA-alignment, MOM/TTM, review_status). New 5-section flow (Trade+Setup -> Entry/exit+S/R/confluence -> Assessments -> Screenshots/review -> Judgement), free-text date/time, screenshots+review now available before the first Save (auto-drafts), Save vs. Complete-review split. See Session Log - this is also where the color palette got more vibrant.
- **Violation-tag silent-drop, resolved 2026-10-26 (Veekay chose "extend the list"):** added 6 real tags from the data to `VIOLATIONS` in `public/js/constants.js` and `app/config.py` (Operational error, Missed trigger / chase, 5-min reset violated, Setup C: 8 EMA hold failed, Stop order removed (operational...), No stop order). Left alone by decision: the 3 trades tagged `Planned risk over $20 (tag to confirm / new tag - to confirm)` and the 2 tagged `None` stay uncategorized and unchanged (paper trades; still counted in stats). Claude-review tag enum unchanged. Not yet deployed.
- **Update 2026-10-26:** `migrate-section3-assessments.sql` was run successfully (all data shows up); the exposed Anthropic key is rotated.
- **Direction change 2026-10-26 (Veekay): the app no longer reviews trades; Claude chat does.** App = capture fields + original-resolution screenshots + export bundles; Claude chat with the `trade-journal` skill does the unbiased assessment (and asks questions); on "wrap up for today" it returns journal entry, learnings, improvements, which Veekay imports back into the app; the app ranks improvements from the data. Build order in `docs/1_PRD.md` section 12: (1) capture + export - **pushed (4f144a7), build was cancelled so not live**; (2) import + improvement items - **built locally, uncommitted**; (3) target-based ranking + before/after - **built locally, uncommitted**; (4) skill update (`docs/skill-changes.md`, awaiting sign-off). API review button is off (`API_REVIEW_ENABLED = false` in `review-panel.js`).
- **Open, Veekay's call needed (carried over, not addressed this session):** the violation-tag silent-drop bug from the local app (15 of 91 trades at risk - a tag like `"Planned risk over $20 (tag to confirm)"` doesn't exactly match `config.VIOLATIONS` so its checkbox never renders checked, silently dropping on next save). Needs a decision: extend `config.VIOLATIONS`, strip suffixes before matching, show unmatched tags as a separate preserved badge, or warn on open. Full trade list in git history (search this file's history for "silent-drop").
- **GitGuardian alert on `piggy-payday-site`'s committed Supabase anon key: confirmed non-issue**, live-verified via PostgREST introspection that RLS actually blocks `anon` - no action needed.

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

### 2026-10-26 (co-builder, later): UI redesign - Veekay's palette and layout spec (local commit, not deployed)

**Spec (Veekay):** palette bg #F3F5FA, sidebar #E9EDF6, cards white, navy #182B4D, indigo #5367C9, violet #8064C8, teal #149B88, amber #D99638; tinted section headers; 36-40px fields with soft borders and an indigo focus ring; obvious but unsaturated selected states; Risk/Gross/Net as compact metric cards (teal gains, muted red losses); sidebar active state = subtle indigo background + narrow indicator; separation without extra height; dashboard look from the TradeBase sample (`docs/ChatGPT Image Oct 26, 2026, 08_43_11 AM.jpg`).

**Did (`public/app.css`, `public/js/main.js`):** tokens replaced with the palette (muted red #C4505F for losses; section colors: scalp indigo, options violet, swing teal, futures amber); a clearly marked override block at the end of `app.css` (delete it to get the old look). Sidebar tinted with the active item shown as indigo tint + a 3px indicator. Cards white with soft shadow and small uppercase headers. Inputs 38px high, soft border, indigo focus ring. Numbered circles hidden; each row's label is now a tinted header rail. Setup/Account/Y-N/chip selected states use a tint + border instead of solid fills. Risk/Gross/Net/R are metric cards. Stat tiles restyled dashboard-style.
**Found while doing it:** the hosted app never set the sidebar's active item or the section color (`body.sec-*`, `.sn.on` were Flask-era and nothing in the SPA set them). `updateChrome()` in `main.js` now sets both on every route change.
**Verified:** a static mock preview of the sidebar, tiles and form rows rendered in Chrome and matches the spec. **Not verified:** the real pages (logged-in app), mobile width, charts. Not covered: the TradeBase-style win-rate gauge and radar "score" widgets are new chart types, not restyling, and were not added.

### 2026-10-26 (co-builder, later still): Journal pages, year/month filters everywhere, 7-day screenshot retention

**Decisions (Veekay):** the app's journal is final; metric targets stay (avg_r, win_rate, avg_loser, avg_winner); drop folder `TradeVenture/App_Exports/`; export size unchanged (original PNGs); screenshots deleted after 7 days; consumed export zips deleted by end of day; year/month filters on Stats and plan lists too.

**Built (local, uncommitted until the single deploy):**
- `public/js/period.js` shared period handling: a period is one string (`week|month|30d|all` or `y2026` / `y2026-10`), so all existing links keep working. Year + Month dropdowns on the Stats pages (Portfolio, Scalp, Options, Swing) and the Options/Swing lists; `allYears()` in `db.js` lists years from trades and plans. Scalp list keeps its own year/month params.
- Journal: `#/journal` (days list, year/month filters, download all shown as Markdown or JSON), `#/journal/<date>` (summary, per-trade assessment with the app's P&L and links to trades, learnings, improvements; prev/next day; download that day as Markdown or JSON), `#/import` ("Load journal") accepts a Claude wrap-up block or a downloaded JSON, one day or a batch (`tj-wrapup-batch/1`), preserving improvement status and dates. Downloads are valid import files, so a backup can be loaded back. `journal-export.js`, `download.js`, `views/journal*.js`. Sidebar: Improvements, Daily journal.
- Screenshot retention 7 days (`purgeOldScreenshots` default).
- Tests: `period.test.mjs`, extended `wrapup.test.mjs` (round trip, batch errors, markdown pipe escaping). All JS tests pass.

**Skill proposal updated** (`docs/skill-changes.md`): app journal final, skill stops writing weekly markdown / `Trade_Log.csv`, consumed zips deleted by end of day, decisions recorded.

**Not verified in a browser:** all new pages. **Run before using:** `supabase/migrate-wrapup.sql`.

### 2026-10-26 (co-builder, later): Steps 2-3 built; year/month filter on the Scalp list (all local, uncommitted, one deploy planned)

**Why held back:** Veekay cancelled the Cloudflare build for 4f144a7 because it was taking too long, and wants to avoid repeat deployments, so everything below is local until one final push.

**Did**
- **Scalp list:** Year and Month dropdowns next to the quick period (This week / This month / Last 30 days / All time). A chosen year (optionally a month) overrides the quick period; month is disabled until a year is picked; years come from the data. (`views/scalp-list.js`, `scalpYears()` in `db.js`). Stats pages and the Options/Swing lists unchanged.
- **Step 2 - import:** `supabase/migrate-wrapup.sql` (tables `journal_entries`, `learnings`, `improvements`, same RLS); `public/js/wrapup.js` strict validator for `tj-wrapup/1` (reports every error, accepts a ```json fence, rejects unknown tags/metrics, never saves `strategy_flags`); `views/wrapup-import.js` at `#/import` (paste or upload -> Check -> preview with new/already-saved per item -> Confirm). Re-importing the same date replaces the journal entry and skips duplicate learnings/improvements, so statuses are never reset. DB helpers in `db.js`.
- **Step 3 - ranking + before/after:** `public/js/improvement-rank.js` (pure) + `views/improvements.js` at `#/improvements`. Violation-target items are ranked by the net P&L lost on trades carrying that tag; metric/no-target items follow, newest first. Status flow proposed -> adopted (stamps today) -> resolved/dropped; before/after splits trades at the adoption date and shows "after N trades" until 5 exist. Metrics: avg_r, win_rate, avg_loser, avg_winner (optional Setup A/B/C). Portfolio stats page gets a "Improvements to work on" card (top 3, hidden if the tables don't exist yet). Sidebar links: Improvements, Wrap-up.
- Tests: `wrapup.test.mjs` (validator accept/reject cases, ranking order, before/after, metric values) plus all existing JS tests pass.

**Not verified:** none of the new pages has been opened in a browser against Supabase (syntax-checked and unit-tested only). Needs `supabase/migrate-wrapup.sql` run in the Supabase SQL editor before the import or Improvements pages work.

**Open:** run the migration; one deploy of everything; try an export, then a hand-made wrap-up block (the format is in `docs/skill-changes.md` section 3); skill update (step 4) awaiting sign-off; whether to add year/month filters to Stats and plan lists; Cloudflare build slowness (need the build log).

### 2026-10-26 (co-builder): Direction change to Claude-chat workflow; step 1 (capture + export) built

**Why:** Veekay found in-app API reviews unreliable (wrong references, weaker than Claude chat with the skill). Diagnosis from the code: screenshots were shrunk to 1200px JPEG q0.78, Claude had only the form fields + a 3.3 KB rules copy (the skill is 38 KB with dated clarifications), no broker screenshot or levels, low reasoning effort, single forced-JSON pass, no conversation. Decision: the app captures and exports; Claude chat assesses.

**Did (step 1):**
- `public/js/zip.js` - dependency-free STORE-only zip writer (CRC32). `public/js/export-format.js` - pure bundle builders, schema `tj-export/1` (trade.json: all non-empty fields, Setup C row, derived prior-same-ticker exit and reset gap in seconds, screenshot list; day.json index with totals; README.md). `public/js/export-bundle.js` - IO (fetch rows + screenshot bytes, download).
- UI: "Export for Claude" button in the screenshots panel of scalp and options/swing forms (exports the last *saved* version; an unsaved new trade is saved as a draft first, as uploads already did); "Export day for Claude" on Today and on the Scalp list (with a date picker). Day zips include that date's scalp trades plus options/swing plans by plan date.
- Screenshots kept at original resolution (only images over 3200px on the long side are scaled, as PNG). The old 1200px/JPEG shrink is gone.
- API "Review with Claude" button hidden behind `API_REVIEW_ENABLED = false`; server route and code kept.
- Tests: `public/js/export-format.test.mjs` builds sample zips and they were verified with Python `zipfile` and `unzip -t` (names, UTF-8 content, binary integrity, totals). All JS unit tests pass.

**Not verified:** the buttons in a real browser against Supabase (no live session in this environment); `wrangler deploy --dry-run` fails here with an esbuild platform mismatch (node_modules from another machine; same on the unmodified tree) - run `npm install` on this machine or deploy from the machine that built it. Not committed or deployed.

**Open / next:** Veekay to try an export on a real trade and confirm the bundle is what he wants to upload to Claude. Then step 2 (import schema + improvement tables; a Supabase migration will be needed). Screenshots auto-purge at 7 days (changed from 30 on 2026-10-26). Skill changes proposed in `docs/skill-changes.md`, not applied.

### 2026-10-23 (co-builder, later): Scalp form flow redesign - 5 sections, always-on screenshots, vibrant palette

**Context:** Veekay gave a detailed spec for restructuring the scalp entry form's flow (pasted directly, not paraphrased by me): 1 Trade+Setup -> 2 Entry/exit mechanics + known S/R/confluence -> 3 Assessments -> 4 Screenshots+review (always available) -> 5 Judgement. Confirmed two architecture calls with him before touching schema: (a) Structure/Trigger/Extended/EMA/MOM/TTM and known S/R/Confluence apply to every setup, not just Setup C - promoted off `setup_c_log` onto `scalp_trades` itself; (b) Setup A/B/C and Setup C's extra fields are one control, living in Section 1 only (his Section 5 mention of them was restating, not a second field).

**Did**
- `supabase/migrate-section3-assessments.sql` (new): promotes `support_below`/`resistance_above`/`confluence_strength`/`mom_sign`/`mom_direction`/`ttm_color`/`ttm_direction` from `setup_c_log` to `scalp_trades`; adds `structure_valid`/`trigger_valid`/`extended`/`ema_alignment`/`review_status` (draft|complete). `setup_c_log` keeps only what's genuinely Setup-C-specific (room_vs_risk, declared_before_entry, ema_hold_2candle, crossed_prev_candle_high, danger_structure, invalidation_price, result).
- `scalp-form.js` rebuilt around the new section order. Date/entry-time/exit-time are plain text now (format hint shown), not native date/time pickers, per Veekay's "very sensitive" concern about typing them. Entry/exit order types and known S/R/confluence moved into Section 2 (was: a separate "Details" section at the bottom, and Setup-C-only). Section 3 is new: Structure/Trigger/Extended/EMA-alignment Y/N, MOM sign+direction, TTM color+direction, and a live-computed "Room to resistance" readout (not stored - same pattern as the Risk/Gross/Net/R block).
- **Screenshots/review now always available, even before the first Save** (Veekay's explicit ask): `review-panel.js` takes an `ensureRefId()` callback instead of a fixed `refId` - on the first upload or "Review with Claude" click on a brand-new trade, it silently saves a draft from whatever's currently in the form, gets a real id, and continues. The browser URL updates via `history.replaceState` (not the router's `navigate()`, which would re-render mid-upload and abort it).
- Three buttons replace the old "Save"/"Save and review...": **Save** (draft - "needs review later"), **Complete review** (final check, closes it out), and **Save and add another** (new trades only) - `review_status` column tracks which. Scalp list shows a draft/complete pill per trade now.
- `src/routes/review.js`'s structured-output schema extended: `proposed` now also includes `structure_valid`/`trigger_valid`/`extended`/`ema_alignment`/`mom_sign`/`mom_direction`/`ttm_color`/`ttm_direction`, derived from the same 6-gate chart reading Claude already does (not a second independent judgment) - the "Fill in Claude's suggestion" button now fills Section 3 too, not just Setup/Category/Violations/Emotions.
- Color palette refreshed app.css-wide (separate ask, same session): warmer/richer `--bg`/`--card`/`--line`/`--muted` tokens and more saturated section accent colors, replacing the original flat-grey palette. Sidebar gets a faint section-color tint. Still always-light.

**A real layout bug caught and fixed before shipping:** `.rowline` is a 2-column CSS grid (118px label + content); stacking a second `.cells` block inside one rowline without the established `<div></div>` + `grid-column:2` placeholder pattern (used elsewhere in the codebase, e.g. `plan_form.html`'s exit/details block) causes CSS Grid auto-placement to drop it into the narrow label column instead of the content column. Caught this by actually rendering the new template with representative data (extracted the template literal, ran it through `new Function` with the real `fld`/`yn`/`chips` helpers and mock trade data, served the output through `app.css`, and looked at it in Chrome) rather than trusting a syntax check - the first render clearly showed the squished layout, confirming four separate spots in the new form needed the fix.

**Verified:** all touched files pass `node --check`; `wrangler deploy --dry-run` bundles cleanly (43 files); `/api/review` still correctly 401s unauthenticated calls under local `wrangler dev` (schema change to `review.js` didn't break the function); the full restructured form was rendered from the actual template source (not hand-copied) with mock data for Setup C + an existing trade, exercising every conditional branch, and visually confirmed correct in Chrome before pushing - not just assumed from reading the code.

**Not live-tested by Veekay yet** - first real use (draft-save-on-first-screenshot, the new Save/Complete-review split, Claude filling Section 3) is the next check once this deploys and he runs the migration SQL.

### 2026-10-23 (co-builder, new session): Strategy PDF playbook ported - full feature parity reached

**Did:** `public/js/playbook-pdf.js` - port of `strategy.py`'s `build_playbook_pdf()`. `reportlab` is Python-only, so this uses `pdf-lib` (loaded from jsdelivr via ESM import, same pattern as `supabase-js` - no bundler in this project) with hand-rolled text wrapping and pagination instead of reportlab's automatic paragraph flow (a small `Writer` class tracks a Y cursor, wraps text to the content width via `font.widthOfTextAtSize`, and adds a new page when content runs out). Same structure as the original: title, "Generated <date> - live from the app" note, one heading+body per rule (red `[CHANGED <date>]` tag appended when a rule's current `effective_from` differs from the seed date, exactly mirroring the Python version's logic), then a change-log table (Date/Rule/Effect/New wording columns, grey header, grid borders, wrapped multi-line cells). Wired a "Download playbook PDF" button into the `/strategy` page.

**Verified, not just syntax-checked:** installed `pdf-lib` in a scratch directory, swapped the CDN import for the local package, and ran the actual `buildPlaybookPdf()` function against realistic multi-rule/change-log data (including a long wrapped change-log entry to stress-test the table). Served the output over local HTTP and opened it in a real Chrome tab (screenshot confirmed) - title, correct red `[CHANGED date]` tag on only the modified rule, correctly wrapped body text, and a correctly wrapped change-log table, all on one page with no overlap. Then confirmed the real app still builds cleanly (`wrangler deploy --dry-run`, 43 asset files) and loads with zero console errors under local `serve`.

**This closes out the last remaining gap from the Cloudflare/Supabase migration - the hosted app now has full feature parity with the original local Flask app.** Retiring the local app is still Veekay's call, not done.

### 2026-10-23 (co-builder, final push): Stats/charts ported, delete-from-list, real data migrated and verified - feature-complete

**Did**
- `public/js/charts.js`: full port of `charts.js` (281 lines - hand-built inline SVG, no libraries). Equity line, per-trade bars, win/loss split, win-rate-needed bars, margin bars, result histogram, multi-area cumulative line, area net-P&L bars, area trade-count bars - all with the same hover/scrub tooltips and keyboard nav as the original.
- `public/js/improve.js`: added `planAreas()` (options/swing's own "Focus now" ranking - entries/exits that skip the plan, bad exit scenarios, losses bigger than planned, over-budget plans, realized-vs-planned R gap, most-skipped checklist step, stale open plans).
- `public/js/stats.js` (new): port of `routes.py`'s `_stats_data()`/`_portfolio()` - the data aggregation behind every stats page, built entirely on the already-ported `perf.js`/`improve.js`.
- `public/js/views/stats-macros.js`, `stats-kind.js`, `stats-portfolio.js` (new): full port of `_stats_macros.html`/`stats_kind.html`/`stats_portfolio.html` - KPI tiles, Focus now, Key areas to improve, the five-chart grid per area, the cross-area leaks/side-by-side/summary-cards portfolio view.
- Wired `/stats/portfolio`, `/stats/scalp`, `/stats/options`, `/stats/swing` into the router and sidebar.
- Added a **delete** link directly on the Scalp and Options/Swing list rows (previously delete only existed inside the edit page) - Veekay asked for it mid-session while diagnosing the import issue below, and it turned out to be exactly the tool needed to fix it.
- Removed dark mode from the hosted app's CSS entirely (Veekay's request - always light now, independent of system theme).

**The real data migration - actually finished and verified this session, with a real bug caught and fixed:**
- Veekay ran **Import local data** in Settings using the exported `data/migration-export.json`. First attempt: Scalp list showed far fewer trades than 103 and a net nowhere close to the known **-$171.87**.
- Root cause, found by elimination rather than guessing: Veekay had created a couple of throwaway test trades in the live app earlier in the session (testing "Save and review", the delete button, etc.) **before** ever running the import. Since those were the *first* trades in an empty table, they got assigned `trade_no` starting from `T001` - the same numbering the real historical data uses. The importer's dedup logic (matches on `trade_no`, same as `app/importer.py`) correctly refuses to overwrite an existing trade number, so it silently *skipped* the real historical trade at that same number, leaving the unrelated test trade's data sitting in its place instead.
- Diagnosed by direct comparison, not assumption: queried the local SQLite DB (`sqlite3 data/journal.db`) for the authoritative trade_no/date/ticker/net_pnl list, had Veekay pull the equivalent list from Supabase's SQL Editor, and diffed them programmatically. Found it twice over two rounds (first `T002`/`T003`, a leftover `FLYE` test trade dated `2026-10-23`; then after Veekay fixed those and re-ran the import, a second leftover at `T001`, `FLYE` dated `2026-10-22`, exactly explaining a remaining $40.00 gap). After deleting the second one (using the brand-new list-row delete button) and re-importing once more, a full diff of all 103 trade numbers against the real data showed **zero mismatches**.
- **Confirmed by Veekay directly: 103 trades, net -$171.87, matches exactly.**
- Lesson for future sessions: when testing a live app that an import will later run against, either delete test rows before importing or test only *after* the real import - an empty table's first auto-numbered rows will collide with any external dataset that also starts numbering from 1.

**Verified:** all files pass `node --check`; `npx wrangler deploy --dry-run` bundles cleanly (42 asset files, up from 36); reloaded fresh under local `serve` with a clean console. Stats pages' *rendering* itself wasn't visually verified live (behind login, no credentials) - logic verified via the dry-run bundle and the now-confirmed-correct underlying data; first real look is on Veekay whenever he opens `/stats/portfolio`.

**Not done:** the strategy PDF playbook (needs a JS PDF library) is the one remaining unported feature from the original app. Retiring the local Flask app is still Veekay's call to make once he's used the hosted version enough to trust it fully.

### 2026-10-23 (co-builder, later): Options/swing CRUD, Settings, CSV export, logout-button overflow fix, dark mode removed

**Did**
- `public/js/fields.js` (new): extracted `fld`/`yn`/`chips`/`acctPick` out of `scalp-form.js` so `plan-form.js` could reuse them instead of duplicating.
- `public/js/db.js`: added `listPlans`/`getPlan`/`savePlan`/`deletePlan` - full port of `routes.py`'s `_save_plan`/`_plan_calc` (investment/planned-loss/RR from `calc.optionsPlan`/`swingPlan`, realized P/L from `calc.realized`, status derivation planned/open/closed/cancelled, the entry-checklist-driven `entry_followed` auto-fill, the exit-scenario-driven `exit_followed` auto-fill).
- `public/js/views/plan-list.js`, `plan-form.js` (new): full port of `plans_list.html`/`plan_form.html` + `plan.js`'s live forecast preview (investment/budget/planned-loss/profit/RR/max-size, affordability and reward:risk verdicts) - one shared implementation parameterized by `kind` ('options' | 'swing'), registered as four routes (`options`, `options/:id`, `swing`, `swing/:id`).
- `public/js/constants.js`: added `TIMEFRAMES` and `RULES_TEXT` (ported `rules/options.md`/`rules/swing.md` as plain strings - these two kinds aren't on the versioned `strategy_rules` system, same as the original app, so flat text is the correct port, not a shortcut).
- `public/js/views/settings.js` (new): editable `DEFAULT_SETTINGS` form. Trimmed from the Python version - no local file path, CSV import or backups UI, since none of that exists once there's no local filesystem; a note instead points at `wrangler secret put` for the two Cloudflare secrets.
- `public/js/csv.js` (new) + wired into both Scalp and Options/Swing lists: client-side CSV export (no server to stream from anymore).
- Fixed a real UI bug Veekay hit: the logged-in email overflowed the fixed 224px sidebar when crammed inline into the "Log out (email)" button text. Moved it to its own line above the button with ellipsis truncation + a title tooltip.
- Removed dark mode entirely from `public/app.css` at Veekay's request - always light now, regardless of system theme (the local Flask app's `app.css` is untouched; this only affects the hosted app).

**Verified:** all new/changed files pass `node --check`; `npx wrangler deploy --dry-run` bundles cleanly (35 asset files, up from 30); reloaded the app fresh under local `serve` and confirmed in a real browser screenshot that it renders light (not dark) and the whole new import graph (`plan-form.js` -> `fields.js`/`csv.js`/`constants.js`/`review-panel.js`) loads with zero console errors. **Options/swing CRUD itself hasn't been live-tested by Veekay yet** (no existing options/swing data to open, and creating a throwaway one wasn't warranted just to self-test) - next session or whenever Veekay tries it is the first real-world check.

**Not done:** `improve.py`'s `plan_areas()` (options/swing's own "Focus now" ranking - needs plan rows to test against, lower priority until there's real options/swing data), stats/charts pages, the strategy PDF.

### 2026-10-23 (co-builder, live-testing round): First real "Review with Claude" confirmed working - three real bugs fixed, one credential needs rotating

**Three real bugs Veekay hit testing the deployed app, all fixed and pushed:**
1. **Screen kept refreshing.** `onAuthStateChange` was re-rendering the whole app on *every* Supabase auth event, including silent background `TOKEN_REFRESHED` events - not just real sign-in/sign-out. Fixed in `auth.js`/`main.js`: only reacts to an actual new sign-in (tracked by user id) or a real sign-out; background events are now ignored.
2. **Screenshots only appeared after leaving and re-editing a trade.** The port had dropped the Python app's second submit button ("Save and review…") - every new trade saved and redirected to a blank new-trade form (the "Save and add another" rapid-entry path), never to the trade's own page where the screenshot/review panel lives. Restored both buttons in `scalp-form.js`, routed by which one was clicked (`e.submitter`).
3. **"Review with Claude" said Unauthorized with no explanation**, which led to a real debugging chain:
   - First fix: `verifyUser.js` wasn't trimming `ALLOWED_EMAIL`/the signed-in email before comparing, and returned a bare "Unauthorized" with no detail. Added `.trim()` and a `reason` string surfaced in the 401 body.
   - Redeployed - same error, now readable: `ALLOWED_EMAIL is not configured on this Worker.` Veekay couldn't find it in the Cloudflare dashboard at all: **"Variables cannot be added to a Worker that only has static assets"** - a real Cloudflare dashboard limitation: this project was originally created as a static-assets-only Worker, and the dashboard locks the Variables/Secrets UI permanently based on how the project started, even after real server-side code (this session's `src/worker.js`) was deployed to it.
   - Worked around it with the `wrangler` CLI instead (`npx wrangler login`, then `wrangler secret put ALLOWED_EMAIL` / `ANTHROPIC_API_KEY`) - this talks to Cloudflare's API directly and bypasses the dashboard restriction entirely.
   - Still failed, same error, even after a direct `wrangler deploy` to the confirmed-matching Worker name and `wrangler secret list` showing both secrets present. Added a temporary diagnostic (env key *names* only, never values) to the 401 reason to see what the Worker actually had access to at request time.
   - That revealed the real cause: `ALLOWED_EMAIL` **was** in `env`, but its value was empty. The interactive masked prompt (`Enter a secret value:`) wasn't actually capturing the pasted value in this terminal environment - `wrangler secret put` doesn't validate non-empty input, so it silently accepted and uploaded an empty string. Fixed by piping the value directly instead of using the interactive prompt: `printf '%s' 'value' | npx wrangler secret put NAME`. Also caught Veekay running the command with the literal placeholder text `your-email@example.com` still in it before correcting to his real email.
   - With both secrets set correctly this way, **the first real "Review with Claude" call succeeded** - confirmed by Veekay directly, not just a parity test or a local dry-run. Removed the temporary diagnostic afterward.

**Real credential exposure, needs Veekay's action:** he pasted his actual `ANTHROPIC_API_KEY` value into this chat while running the `printf | wrangler secret put` command (asked to "paste the real key" - he pasted it inline in his terminal command, which is visible in this session transcript). Flagged immediately. **Treat that key as compromised - rotate it in the Anthropic Console (revoke, create a new one) and update it in both `~/.trading-journal.env` and via `wrangler secret put ANTHROPIC_API_KEY` again.** Not yet done as of this entry. **RESOLVED 2026-10-26: Veekay confirmed the key was rotated and updated.**

**Lesson for next time piping secrets via `wrangler secret put` or similar:** don't ask the user to paste the literal secret value into a shell command in a chat session - it ends up in the transcript. Better: have them run the interactive `wrangler secret put NAME` form themselves and type/paste directly into their own terminal's prompt (even though that's what failed silently this time) - if that's unreliable in this environment, the safer non-interactive alternative is piping from a file Veekay fills in locally and deletes after (`printf "$(cat ~/.tmp-secret)" | wrangler secret put NAME && rm ~/.tmp-secret`), never typed inline where it is sent to me.

### 2026-10-23 (co-builder, later still): Weekly wrap-up ported (perf.py, improve.py's scalp half, weekly.py)

**Did**
- `public/js/perf.js`: full port of `perf.py` (`analyse()`, `histogram()`, `insights()`). Parity-tested against `test_calc.py::test_perf_margins` and `test_empty_series_has_none_metrics` - exact assertions, all pass.
- `public/js/improve.js`: port of `improve.py`'s `scalpAreas()` and `focus()` (the narrow "Focus now" ranking - umbrella/broad/duplicate filtering). `plan_areas()` (options/swing) deferred until that CRUD exists, since it needs plan rows that don't exist yet. Parity-tested against `test_focus_is_narrow`'s exact assertion.
- `public/js/weekly.js`: port of `weekly.py` - `weekBounds()`, `byDay()`, `tally2candle()`, `weeklyReview()` (reuses the two ports above, exactly like the Python version reuses `perf`/`improve`), plus `getWeeklyNotes()`/`saveWeeklyNotes()` for the free-text side.
- `public/js/views/weekly.js`: the `/weekly` page - KPI tiles, by-day table, 2-candle/Setup C tallies, strategy changes stated that week, ranked action items, and the editable notes form. Prior/next week navigation via `?week=YYYY-MM-DD`, same as the Python version.
- Wired into `main.js`'s router and the sidebar nav link.

**Verified:** all three new parity test files (`perf.test.mjs`, `improve.test.mjs`) pass against the exact Python assertions. `npx wrangler deploy --dry-run` still bundles cleanly (30 asset files now, up from 24). Reloaded the app in a fresh browser tab under local `serve` - clean render, zero console errors, confirming the new import graph (`weekly.js` -> `perf.js`/`improve.js`/`setup-c.js`/`strategy.js`) has no circular-import or missing-export issues. **Did not click into `/weekly` itself** - it's behind login and I don't have Veekay's password; logic is verified via the parity tests and a clean module load, not a live screenshot of the rendered page.

**Caught mid-session, handled correctly:** Veekay's own browser tab (showing the live `*.workers.dev` app at `#/today`, logged in) was sitting in the same Chrome session I was about to test in. Opened a separate new tab for local testing instead of touching his - his live session was never interacted with.

**Not yet ported:** options/swing CRUD and `plan_areas()`, stats/charts pages (portfolio + per-kind, inline SVG), settings page, CSV export, the strategy PDF playbook. Still pending: Veekay's own live login + real-review test on the deployed app, and the 103-trade data migration.

### 2026-10-23 (co-builder, later): Deployed, fixed a real architecture mismatch - Pages Functions don't run under Workers Builds

**What happened:** Veekay created the Cloudflare project; it deployed fine as a static site (`veekay-labs-trade-journal.venkatkrishnanchellappa.workers.dev` loaded correctly, CSS/JS all served), but every `/api/*` call 404'd. Root cause, confirmed by what Veekay saw in his dashboard settings (Build command / Deploy command / Root directory, no "Build output directory" field, and the `*.workers.dev` domain itself): Cloudflare set this project up via **Workers Builds** (their newer unified Git-connected Worker deploy), not classic **Pages**. The `functions/` directory file-based routing I'd built (`functions/api/review.js` etc.) is a Pages-only convention - a plain Worker doesn't scan for it at all, at any root-directory setting. No amount of settings-tweaking would have fixed it; the deployment model itself didn't match the code.

**Fixed:** restructured as a single Worker entry point instead.
- `wrangler.jsonc` (new, project root): declares `main: "src/worker.js"`, `assets: {directory: "./public", binding: "ASSETS"}` (serves the static site), `compatibility_date`. `name` is set to `veekay-labs-trade-journal`, inferred from the deployed URL - **worth double-checking this exactly matches what the Cloudflare dashboard shows**, since a Worker name mismatch would deploy to (or create) the wrong Worker.
- `src/worker.js` (new): the one fetch handler - routes `POST /api/review` and `POST /api/classify-change` to their handlers, falls through to `env.ASSETS.fetch(request)` for everything else.
- `src/lib/verifyUser.js`, `src/routes/review.js`, `src/routes/classifyChange.js`: the same logic that was in `functions/`, just with the handler signature changed from Pages' `onRequestPost({request, env})` to a plain `(request, env)` the Worker's own router calls directly.
- Deleted `functions/` entirely - dead code under this deployment model, and keeping it around would be misleading.
- `package.json`: added `wrangler` as a devDependency (`deploy` script: `wrangler deploy`), so `npm install` (the configured build command) + `npx wrangler deploy` (the deploy command) is self-contained.

**Verified before pushing:** `npx wrangler deploy --dry-run` bundles cleanly (24 asset files read, Worker compiles, `@anthropic-ai/sdk` resolves). Ran `wrangler dev` locally and hit every route directly: `/index.html` and `/js/calc.js` serve correctly, and - the actual fix - `POST /api/review` and `POST /api/classify-change` now correctly return `401 Unauthorized` instead of `404 Not Found`. Pushed; Cloudflare's Workers Builds should pick it up automatically same as before.

**Still not verified: a real review call with a real API key against a live screenshot** - needs Veekay to confirm the new deploy succeeded and then run one for real.

### 2026-10-23 (co-builder): Cloudflare+Supabase migration - screenshots, Claude review, strategy governance, Setup C

**Did**
- `supabase/storage.sql` (new, not yet run by Veekay): creates the private `screenshots` Storage bucket and locks it to the same `is_veekay()` gate every other table uses.
- `functions/_lib/verifyUser.js`: shared auth check for every Pages Function - asks Supabase's own auth server whether the caller's access token is valid and whose it is, then checks the email against an `ALLOWED_EMAIL` Cloudflare secret. The Function never gets Supabase credentials beyond the public anon key; real data access control still lives in Postgres RLS, same as every other write in this app. This is only a cheap gate against a stranger finding the URL and burning the Anthropic budget.
- `functions/api/review.js`: port of `review.py`'s `run()` (minus the DB write - the client does that itself after, under its own authenticated/RLS-scoped session). Same system prompt, same 6-gate structured schema, same deliberate `effort: "low"` choice (preserved from the real bug fixed earlier in this project - default effort burned the whole token budget on thinking).
- `functions/api/classify-change.js`: port of `strategy.py`'s `classify_change()`.
- `package.json` (new, project root): `@anthropic-ai/sdk` as the one dependency the Functions need; Cloudflare's Pages build auto-installs it. Pinned to `^1.1.0` after checking npm directly (my training data suggested an older `0.x` version - exactly the kind of stale-prior drift the Claude API skill warns about).
- `public/js/strategy.js`: port of `strategy.py` minus `build_playbook_pdf` (deferred - needs a JS PDF library, lower priority than the governance flow itself working). `seedIfEmpty()` now runs from `main.js` on every login, same backfill-per-missing-key logic as the Python version.
- `public/js/setup-c.js`: full port of `setup_c.py` (get/save/tally); wired into `db.js`'s `saveScalpTrade()` exactly like the Python `_save_scalp()` does (`setup==='C'` triggers the upsert).
- `public/js/review-panel.js`: port of `_macros.html`'s `shots_panel` + `app.js`'s upload/review wiring - drop zone, paste, client-side shrink (same 1200px/q0.78 as the Python app), gate chips, "Fill in Claude's suggestion", earlier-reviews disclosure. Shared module so options/swing can reuse it once those forms exist.
- `public/js/markdown.js`: port of `app.js`'s tiny markdown renderer, for the review narrative.
- `public/js/views/strategy.js`: the `/strategy` page - propose a change, Claude classifies it (red-flag banner, explicit effect), effective-date picker, "also apply to today's trades", confirm-and-apply. Nothing writes until confirmed, same discipline as the Python version.
- `public/js/db.js`: added Storage-backed screenshot CRUD (`uploadAttachment`, `listAttachments`, `deleteAttachment`, `attachmentToBase64` for sending to the review Function, `purgeOldScreenshots` - same 30-day lazy policy, now running on every login instead of server start), `listReviews`/`saveReview`.
- `scalp-form.js`: wired in the Setup C log section (hidden unless Setup = C, same as the Python form) and the live review panel (mounted only once a trade is saved, matching "Screenshots and Claude review are available after you save the trade").

**Verified:** `npm install` succeeds and `wrangler pages dev public` compiles the Functions cleanly (confirms `@anthropic-ai/sdk` resolves and both Functions parse/bundle correctly) and serves the static site unchanged. Hit both Functions directly with `curl` and with no auth header - both correctly return `401 {"error":"Unauthorized"}` rather than crashing or leaking anything. Re-loaded the app in a real browser under `wrangler pages dev` (not just plain `serve`) - identical clean render, no console errors. **Not yet verified: an actual review call with real screenshots and a real API key** - that needs Veekay's Cloudflare secrets in place, which needs an actual deploy first.

**Caught and fixed a real mistake before it shipped:** first draft of `verifyUser.js` had a plausible-looking but entirely fabricated Supabase anon key (wrong `iat`/`exp`/signature) - written from pattern-matching rather than copied from the real value. Caught it before testing by diffing against `public/config.js`'s actual key and fixed it. Worth remembering: never retype a credential-shaped value from memory, always copy it from where it's already recorded in the repo.

**Blocked on Veekay - three one-time actions, none of which I can do myself (no Supabase SQL-editor or Cloudflare dashboard access):**
1. Run `supabase/storage.sql` in the Supabase SQL Editor (same way `schema.sql` was run).
2. Create the Cloudflare Pages project for this app, Git-connected to `veekayC-bit/Veekay-Labs` (same pattern as `piggy-payday-site`'s "I don't want manual deployment" setup) - root directory `Personal_projects/Trading-Journal`, build output directory `public`, build watch paths scoped to `Personal_projects/Trading-Journal/**`.
3. Add two secrets in that Pages project's settings: `ANTHROPIC_API_KEY` (same key as `~/.trading-journal.env`) and `ALLOWED_EMAIL` (his Supabase login email).

**Next session should:** once deployed, do one real end-to-end review call against a real trade with real screenshots to confirm the Function works for real (not just the auth-rejection path already verified), then continue down the remaining list - weekly wrap-up, options/swing CRUD, stats/charts, settings, CSV export, the strategy PDF, then the real 103-trade data migration and retiring the local Flask app.

### 2026-10-22/23 (co-builder): Cloudflare+Supabase migration - Steps 1-3 (schema, auth, calc/rule-engine port, core scalp CRUD)

**Did**
- `supabase/schema.sql` run by Veekay; confirmed his real email went into the `allowed_emails` insert (not the placeholder) and that he created his own account via the Supabase dashboard's "Add user" (signup stays disabled - never offered as a public flow).
- `public/js/calc.js`: full ES-module port of `app/calc.py` (`num`, `leadNum`, `parseExits`, `scalpResult`, `optionsPlan`, `swingPlan`, `realized`). Verified with `public/js/calc.test.mjs`, a plain-Node parity test running the exact assertions from `tests/test_calc.py` - all pass, including the trickier rounding cases (options `rr: 3.27`, realized `roi: 21.56`).
- `public/js/rule-engine.js`: full port of `app/rule_engine.py` (the deterministic half of the Objective Assessment - size, stop-recorded, 5-minute reset, category consistency). Verified with `public/js/rule-engine.test.mjs` against `tests/test_rule_engine.py`'s exact assertions - all pass.
- `public/js/constants.js`: port of `config.py`'s one-tap lists (SETUPS, CATEGORIES, VIOLATIONS, EMOTIONS, ORDER_TYPES, DEFAULT_SETTINGS).
- `public/js/supabase-client.js`, `auth.js`: Supabase JS client (loaded from jsdelivr ESM, no build step) wired to `public/config.js`; email+password sign-in/sign-out/session-change.
- `public/js/db.js`: data layer - settings (with default-seeding upsert), scalp trade list/get/save/delete, trade-history audit logging (port of `app/audit.py`'s `log_changes`, "manual" source only for now - the "claude-suggested" label needs reviews wired up first), prior-same-ticker-exit-time lookup for the 5-minute reset check. Trade-number and day-sequence assignment ported from `routes.py`'s `_next_trade_no`/`_save_scalp`.
- `public/js/router.js`: a small hash router (no framework - matches the rest of this app's plain-JS style).
- `public/js/format.js`: port of the `money`/`signclass`/`num`/`px` Jinja filters.
- `public/js/views/{today,scalp-list,scalp-form}.js` + `public/index.html` + `public/app.css` (copied verbatim, it had zero Jinja templating in it): a working vertical slice - login screen, Today (today's trades + net/wins), Scalp list (period/account/ticker filters), Scalp add/edit/delete with the full field layout from `scalp_form.html` (trade basics, exits row builder ported 1:1 from `scalp.js` including the one-way rows-\>textarea sync, judgement incl. live auto-category hint, tags as checkbox chips, details), live P&L preview (risk/gross/net/R, same warnings as the Flask version), and "Check against rules" wired to the ported rule engine.

**Verified live (Chrome via claude-in-chrome, served locally with `npx serve public`):** page loads clean, no console errors. Logged in with a dummy email/wrong password on purpose (don't have Veekay's real password and won't ask him to paste it in chat) - got back Supabase's real `"Invalid login credentials"` error, proving the full chain works end to end: `config.js` -> Supabase client -> the correct project's auth endpoint -> error surfaced in the UI. **Still needs Veekay to actually log in once with his real credentials to confirm the account he created via "Add user" accepts `signInWithPassword()` cleanly** - dashboard-created users occasionally need a password reset depending on how they were provisioned; this wasn't verified since it needs his real password.

**Deliberately deferred, in dependency order:** (1) Storage bucket creation + a Cloudflare Pages Function proxy for Claude review (keeps the Anthropic key off the client - needs Veekay's Cloudflare dashboard access to add the secret), (2) Setup C log section + `strategy.py`/`weekly.py` ports (straightforward once the CRUD pattern above is proven out), (3) options/swing plans CRUD (same shape as scalp, lower priority), (4) stats/charts (`perf.py`/`improve.py` ports - more involved, inline SVG charts), (5) one-time migration of the 103 real trades (do this only after the form above has had real live use, not before), (6) actual Cloudflare Pages deploy (scoped Git-connected like `piggy-payday-site`, not Direct Upload per Veekay's "I don't want manual deployment").

**Next session should:** get Veekay's real-credential login confirmed, then continue down the deferred list - Storage bucket + review proxy is the natural next step since screenshots/review is the single most-used feature of the current Flask app.

### 2026-10-22 (co-builder, post-Phase-5): Exits entry UX redesign

**Did:** replaced the single-line `exits_text` input (a plain `<input>`, not even a textarea - part of why typing `50@7.11 (09:46:24); 75@7.42 (09:47:01); ...` live, mid-trade, was real friction) with a row builder in `scalp.js`: shares / @ / price / optional time-or-note per row, "+ Add exit" to append, "x" to remove. The original field is now a multi-line textarea that stays fully live and editable - the row builder only writes INTO it (one-way sync), it never reads back out except once, on page load, to seed initial rows from whatever's already there. No backend change at all: `calc.py`, `routes.py`, the stored `exits_text` format are all untouched, so every existing trade's data and every downstream consumer (stats, the rule engine, imports) keeps working exactly as before.

**Verified live:**
- New trade: typed two rows (25@10.20 with a time note, then a blank-shares/10.35 "sell the rest" row) - the assembled text and the live P&L preview (gross/net/R) were both correct, including the "blank shares = sells all remaining" convention matching `calc.parse_exits()`.
- Row removal works and resyncs correctly.
- Reopened T103 (a real 4-leg historical trade with messy annotations like `"(09:53:13) - market"`) - all 4 rows seeded correctly from the existing text. One cosmetic imperfection on complex legacy notes (a stray trailing paren can show up in the note field) - harmless, visible, directly editable since the row's text came from the same textarea the user can still type into directly.
- Did not save the test trade or any change to T103 - navigated away clean both times.

### 2026-10-22 (co-builder, final phase of this run): Phase 5 - field-level audit trail, and a real bug it caught

**Did**
- `app/audit.py` (new): `trade_history` table, one row per changed field per save - old value, new value, timestamp, and `source` ("manual" vs. "claude-suggested"). Not literal git - a binary SQLite file has no meaningful diff trail, and this project already rules out committing `data/`.
- Source attribution is a real heuristic, not a guess: `_matches_proposed()` compares the saved value against the most recent review's `proposed` object for that field (violations/emotions compared as the joined string Claude proposed vs. what got saved). If they match, it's logged "claude-suggested"; otherwise "manual" - covers the case where Veekay clicks "Fill in Claude's suggestion" then edits before saving, which should correctly read as manual.
- Wired into `_save_scalp()`: a brand-new trade logs one `(created)` row; an edit diffs every column between the old row and the new values and logs only what actually changed.
- New "History" section on the scalp edit page, read-only, newest first.

**Verified - and this is the real story of the session:** tested end to end via Flask's test client first (throwaway trade, a field edit that matched a fake review's proposal classified "claude-suggested" correctly, a manual field change classified "manual" correctly, cleaned up after). Then tested live in the browser on a real trade (T103) to confirm the UI renders - toggled `exit_order` to "Limit" and saved, a low-risk, easily-reversible field chosen deliberately.

**The audit trail immediately caught a real, pre-existing bug, unrelated to this session's work:** the History table showed `violations` changed from `"Anticipated trigger; Planned risk over $20 (tag to confirm)"` to just `"Anticipated trigger"` - a tag silently dropped by my test save, which I hadn't touched or intended to change. Root cause: the violations checkboxes render checked via an exact string match against `config.VIOLATIONS`; T103's tag carries a `"(tag to confirm)"` suffix from the original TradeVenture import that doesn't match the canonical `"Planned risk over $20"` entry, so the checkbox never renders checked, and any save silently writes the trade back without it. **Scanned the whole database for the same exposure: 15 of 91 trades with recorded violations have at least one tag that will silently drop the next time that trade is saved** - full list in the Snapshot above. Restored T103's `violations` and `exit_order` to their exact original values via a direct, audited correction (logged through `audit.log_changes()` itself, not a raw bypass) - confirmed via the History table that the full honest sequence (original -> silently dropped -> restored) is visible, not papered over.

**Not fixed yet, deliberately - this needs Veekay's call, not a unilateral redesign mid-session:** options include (a) extend `config.VIOLATIONS` to cover the annotated variants actually in the data, (b) normalize/strip parenthetical suffixes before the checkbox match (loses the "(tag to confirm)" provenance note), (c) show an unmatched tag as an extra, separately-preserved read-only badge next to the checkboxes so it survives a save untouched, or (d) a warning banner when opening a trade with a tag that won't survive a save. Flagged clearly rather than guessed at.

**This closes the six-feature consolidation plan from earlier in the session** (frozen-strategy governance, the 10-gate Objective Assessment, Setup C's gates, the 2-candle tally, the weekly wrap-up, the audit trail) - all five phases built, each verified against real data or a real test, not just inline reasoning. TradeVenture is now a real retirement candidate per Veekay's original ask, pending: the violation-tag bug above, and anything else he wants to shake out before treating this app as the sole source of truth.

### 2026-10-22 (co-builder, yet another continuation): Phase 4 - weekly wrap-up ritual

**Did**
- `app/weekly.py` (new): almost entirely reuses existing, already-tested code rather than rebuilding stats logic - `week_bounds()` (Monday-Friday for any date), then the same `perf.analyse()` + `improve.scalp_areas()`/`improve.focus()` the stats pages already call, just scoped to one week's `scalp_trades` rows instead of a period filter. By-day breakdown, category (A-X) counts, 2-candle tally (Setup A/B only, matching the standing rule that Setup C never folds into it), and `setup_c.tally()` (built in Phase 3, unused until now) are new, small, pure functions.
- `weekly_notes` table: only the free-text side of the ritual (action items committed to, Weekend Prep notes, discussion notes) - the computed side is never stored, just recomputed from `scalp_trades`/`setup_c_log`/`strategy_change_log` on every view, so it's always current.
- New `/weekly` page: KPI tiles, by-day table, 2-candle and Setup C tallies, strategy changes stated that week (pulled from Phase 2's `strategy_change_log`, styled as a red flag), ranked suggested action items, and an editable form for what Veekay actually commits to. Prior/next week navigation via `?week=YYYY-MM-DD`.

**Verified live, real historical data:** the week of 2026-10-12 (13 real trades) rendered correctly - accurate by-day breakdown, win rate, entry/exit validity, and a genuinely useful, specific, dollar-ranked suggestion ("Don't enter without 1R of room to resistance - 3 trades, $9.10 lost") computed from real data through already-validated logic. Setup C tally correctly showed "not recorded: 2" for two trades marked Setup C before Phase 3 existed, rather than guessing. Save round-tripped through a real POST + redirect + reload (confirmed with a throwaway test note, deleted immediately after - nothing left in the real weekly_notes table).

**Deliberately not built:** no attempt at full parity with TradeVenture's entire Mode B (cumulative evidence tables, recurring-pattern writeups, "Items for Discussion" as its own section) - the data-driven core is here; the rest is Veekay's own discussion to have, now with real numbers in front of him instead of manual tallying.

**Next session should:** Phase 5 (audit trail) is the last of the six - a `trade_history`-style table logging every field change (old value -> new value, timestamp, source: manual vs. Claude-suggested), not literal git (this project already rules that out for `data/`). After that, the six-feature plan from earlier in this session is complete and TradeVenture can actually be considered for retirement, per Veekay's original ask.

### 2026-10-22 (co-builder, continued once more): Phase 3 - Setup C's versioned gate + per-trade log

**Did**
- Setup C's gate definition needed no new mechanism - it's just one more row in `strategy_rules` (`rule_key='setup_c'`, text from the existing v0.4 definition in `rules/scalp.md`'s Setups section). Gets the same date-aware resolution, change classification, red-flag treatment and PDF-playbook inclusion as every other rule, for free.
- Fixed a real gap this surfaced: `strategy.seed_if_empty()` was all-or-nothing (skip entirely if the table had any rows), so adding `setup_c` to `SEED_SCALP` after Phase 2 had already seeded the first 13 would never have reached a running database. Changed it to backfill per missing `rule_key` instead - caught by testing, not by inspection, since the row count stayed at 13 after a restart until the fix.
- `app/setup_c.py` (new): `setup_c_log` table, one row per trade declared Setup C at entry (never a relabel of a failed A/B). `save()` stamps each row with `version` = whichever `setup_c` rule was in force on the trade's own date, via `strategy.rule_effective_from()` (generalized from a private helper Phase 2's PDF builder already had). `tally()` counts by result (X/C/E) for whenever the weekly wrap-up (Phase 4) needs it - not wired to any UI yet.
- Setup C section added to the scalp edit form (support/resistance, room vs risk, declared-before-entry, 2-candle EMA hold, crossed-prev-candle-high, MOM/TTM, danger structure, confluence, invalidation price, result, notes) - hidden unless Setup = C is selected (`scalp.js`), saved through the same form/Save button as the rest of the trade, no separate save action.
- One real naming collision caught before it shipped: the trade's own `notes` textarea and Setup C's notes field can't both be `name="notes"` in the same HTML form. Setup C's field is submitted as `setup_c_notes`; `setup_c.save()` maps it back to the `notes` column explicitly.

**Verified:** a throwaway trade created through Flask's test client (ticker `ZZZTEST`, Setup C, every field filled) round-tripped correctly - `setup_c_log` row created with all values intact and `version` correctly stamped `2026-10-19`. Deleted immediately after (both `scalp_trades` and `setup_c_log` rows) - nothing left behind. Also confirmed in the browser that selecting Setup C reveals the section and selecting A/B hides it again; did not save that browser test onto a real trade (T103).

**Not yet done:** no stats/tally display wired to the UI yet (the `tally()` function exists, unused) - natural fit for Phase 4's weekly wrap-up rather than its own page.

**Next session should:** Phase 4 - the weekly wrap-up ritual (by-day table, Problem-Area-vs-baseline, action items, Weekend Prep). This is where `setup_c.tally()` and the 2-candle tally field (from Phase 1, also not yet aggregated anywhere) both get their first real UI.

### 2026-10-22 (co-builder, continued further): Phase 2 - versioned strategy rules, change classification, PDF playbook

**Did**
- `app/strategy.py` (new): `strategy_rules` and `strategy_change_log` tables. A rule is never edited in place - `apply_change()` closes the old row (`effective_to`) and opens a new one (`effective_from`), so `current_rules(conn, kind, as_of)` always resolves what was in force on a given date via a date-range lookup, not "whatever the file says today."
- Seeded 13 scalp rules (`SEED_SCALP`) from the existing `rules/scalp.md`, split at the same granularity as the gate checklist (setup_a, setup_b, trigger, gate_mom_ttm, gate_ema_alignment, gate_ema_extension, gate_stop_before_entry, gate_room, gate_danger_structure, sizing, exit_plan, categories, violation_tags), `effective_from` backdated to 2026-10-19 (the date the file itself says it was seeded from). Seeding runs once from `create_app()`, not `db.init()` - avoids a circular import between `db` and `strategy`.
- `review.rules_text(kind, as_of)` now takes the trade's own date and reads `strategy_rules` for scalp instead of the static file - both `packet()` and `run()` pass `row["date"]`. Options/swing are unchanged (still flat `rules/*.md`, Phase 2 is scalp-only for now).
- `strategy.classify_change()`: a real API call that reads old vs. proposed wording and classifies the effect (looser/tighter/reversal/addition/definition) - genuinely needs judgment, not a diff, so it's the one place in this feature that costs tokens. Everything else (closing/opening rows, logging) is plain code.
- New `/strategy` page: each rule with a "Propose a change" disclosure (textarea -> "Check with Claude" -> red-flag banner + classification -> effective-date picker + "also apply to today's trades" checkbox -> "Confirm and apply"). Matches the same never-auto-write discipline as the trade review: the classification is shown, nothing is saved until Veekay explicitly confirms.
- `/strategy/playbook.pdf`: live-rendered (reportlab), not a dated file to regenerate by hand - same `[CHANGED date]` red-tag convention as TradeVenture's old `Strategy_Playbook_YYYYMMDD.pdf`, computed by comparing each rule's current `effective_from` against the seed date.
- Added `reportlab==4.2.5` to `requirements.txt` - pinned, since this project's Python 3.9 venv can't run reportlab>=4.3 (dropped 3.9 support; discovered by trying to install, not by reading changelogs).

**Verified live, real API calls, no stray writes:**
- `/strategy` page loads all 13 rules correctly.
- Proposed a real (deliberately throwaway) tightening of the MOM/TTM gate - Claude correctly classified it "tighter" with a specific, accurate explanation of what would now fail that used to pass. Did **not** click "Confirm and apply" (that would have actually changed the live rule, which wasn't the point of the test) - confirmed in the database afterward: still exactly 13 rule rows, 0 change-log rows, no side effects from the check-only call.
- `/strategy/playbook.pdf` renders correctly: title, generation-date note, all 13 rules, no `[CHANGED]` tags (correct, since nothing's actually been changed yet).

**Also fixed in this session, before Phase 2:** gate chips and the "Fill in Claude's suggestion" button from Phase 1 only appeared right after a fresh "Review with Claude" click - reopening a trade later showed the saved narrative but lost the structured data, even though `reviews.proposed_json` already had it. Fixed: `shots_panel` macro now parses it on render (via a new `fromjson` Jinja filter - `cfg.GATE_LABELS` doesn't resolve inside an imported macro without `with context`, so the gate-label list is inlined in the macro directly instead), and the "Fill in" click handler is delegated on `document` so one handler covers both the server-rendered button and the one created live after a review.

**Not yet done:** Setup C's own versioned gate list (Phase 3), 2-candle tally aggregation/rate (data field exists from Phase 1, no rollup yet), weekly wrap-up ritual (Phase 4), audit trail (Phase 5). Options/swing never got their own versioned rules - still flat files, same as before Phase 2.

**Next session should:** Phase 3 (Setup C) is the natural next step since it reuses the same gate-checklist and rule-versioning machinery just built. Also worth a pass: extending `classify_change()`'s red-flag detection to the per-trade review flow itself (today it only fires from the `/strategy` page's explicit edit form, not from anything stated in a trade's notes).

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

### 2026-10-26 - Win-rate gauge + trading-score radar
- `public/js/score.js` (+ `score.test.mjs`): six 0-100 axes (Win %, Profit factor, Risk:Reward, Expectancy in R, Discipline, Consistency) against fixed targets; overall score = average of available axes; low-sample note under 20 trades.
- Gauge + radar cards shown above the stats on Portfolio, Scalp, Options and Swing pages (`views/stats-portfolio.js`, `views/stats-kind.js`; styles at end of `app.css`). Portfolio has no Discipline axis unless scalp rule data exists.

### 2026-10-26 (later) - Deploy and polish
- Deployed redesign + charts + all items below. Done: Live default account filter; export button renamed "Export for AI-Assist-Review" and day export gets a trade picker (`export-picker.js`; popup layout fixed after Veekay's screenshot); duplicate trade records fixed (two causes: first upload silently created a draft, and repeat Save clicks on a frozen page inserted again) by serializing saves, then removing draft-on-upload entirely (new trades must be saved before screenshots); number auto-correct ("at 4.67 invalidation" crashed a save on the numeric Invalidation $ column) plus time auto-correct to HH:MM (`numeric.js`, tests); wrap-up load marks listed trades complete.
- Decisions: complete-marking happens once at load, never rechecked (so a reopened trade stays reopened); Improvements empty until a wrap-up is loaded (expected).
- Veekay deleted the duplicate T108/T109 CLRO entry by hand.

## Session 2026-10-27 (options/swing form review, deployed)

Source: Veekay's annotated screenshot of the New options plan page (`wireframe feedback.pdf`). Commit `5954de9`; deployed with `npx wrangler deploy` (Worker version acb7ce96). `supabase/migrate-greeks.sql` was run by Veekay before deploy.

- **Dates:** plan/expiry/entry/exit dates (and the scalp date) are free text with auto-correct (`cleanDate` in `numeric.js`); `savePlan` normalizes and rejects unreadable dates.
- **Premium estimate (options):** under the stock row. Uses Black-Scholes when IV + strike + expiry are entered (optional "IV change" in points for an IV crush), else delta (+ gamma, theta x hold days if entered). Shows est. premium and $ loss/gain at the stock stop and target, the stock level where the premium stop/target triggers, and a warning if the premium stop would hit before the stock stop. Approximate: ignores skew, assumes 4.5% rate, 0DTE treated as 0.25 day.
- **Estimate tracking (experiment):** each save stores `est_premium_stop`, `est_premium_target`, `est_method`; "Plan vs actual" compares the estimate to the actual exit premium (loser vs stop estimate, winner vs target estimate). Veekay will judge after about 10 closed trades whether the estimate helps; if it is noise, remove the estimate code (columns can stay unused).
- **Liquidity verdict:** bid/ask stored separately; spread % of entry premium, volume, OI -> Liquid / Marginal / Illiquid (`LIQUIDITY` thresholds in `calc.js`: 5%/10%, 500, 1000, unconfirmed).
- **Loss %:** scalp form and list show risk / net as % of account balance; options/swing forecast shows loss % of account and of cost, profit % of account; lists and plan-vs-actual show P/L % of account. Scalp list uses the current balance setting, not the balance at trade time.
- **Lists/forms:** Options and Swing lists default to Active (planned + open); sanity warnings for stops/targets/strike far from the stock entry; Thesis placeholder example; swing shares the form so gets dates, thesis, % and Active list (liquidity and premium estimate are options-only).
- **Still open:** upload-freeze check, retire local app, futures fields (see `docs/BACKLOG.md`); confirm liquidity thresholds; estimate-accuracy panel on Options stats after enough trades.
