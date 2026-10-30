# Trading Journal

A web app for logging trades: Scalp, Options, Swing (Futures coming soon). Part of Veekay Labs.

## Run
- Hosted: https://veekay-labs-trade-journal.venkatkrishnanchellappa.workers.dev (Cloudflare Worker + Supabase). Deploy with `npx wrangler deploy` (`npm install` first on a new machine).
- The original local Flask app was retired on 2026-10-30 and archived, untouched, in `archive/local-flask-app/` (see its README).
- SQL migrations are in `supabase/`; run each new one once in the Supabase SQL editor.

## Claude review
- The hosted app makes no Claude calls: use "Export for AI-Assist-Review" and review in a Claude chat. 
- Reviews grade against `rules/scalp.md`, `rules/options.md`, `rules/swing.md`. Edit those when the strategy changes.

## Dev
- JS tests: `node --test public/js/*.test.mjs`
- Archived Python tests (old app): `archive/local-flask-app/tests`.
