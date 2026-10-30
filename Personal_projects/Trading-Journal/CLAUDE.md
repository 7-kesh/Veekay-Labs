# Trading Journal

Local web app for Veekay's trade logging (Scalp, Options, Swing; Futures coming soon). Part of Veekay Labs, but separate from the Phase 1-5 gates in the repo root.

## Session protocol
At the start of a session read `docs/PROJECT-SUMMARY.md` (Snapshot, Gotchas) and `docs/1_PRD.md`. At the end, update the Snapshot and add a Session Log entry, and tick off or add items in the PRD's open list.

## Rules of the road
- Hosted app: `public/` (browser code), `src/worker.js` (serves static files only), `supabase/` (SQL already run). Deploy with `npx wrangler deploy`, only when Veekay says "deploy". Batch changes into one deploy.
- The local Flask app is retired and archived in `archive/local-flask-app/`; don't edit it.
- Never put secrets in chat or the project folder. Run `node --test public/js/*.test.mjs` after changing calculations (`public/js/calc.js` is the source of truth now).
- `rules/*.md` mirror Veekay's strategy in `TradeVenture/`. Any strategy change is a red flag: confirm with Veekay and log it in `TradeVenture/Strategy_Change_Log.md`.
