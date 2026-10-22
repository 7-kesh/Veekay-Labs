# Piggy Payday

Family chore-bank web app (Save / Gift / Spend piggy banks + Market Investment). Static page on Cloudflare Pages, data in Supabase. Part of the Veekay Labs repo but a separate side project, not part of the Phase 1–5 gates in the repo root.

## Session protocol
At the start of a session read `docs/PROJECT-SUMMARY.md` (Current Snapshot, Open Items, Runbook). At the end, update the Snapshot and add a Session Log entry.

## Rules of the road
- **Money only moves through the database functions** in `supabase/atomic-writes.sql` (`piggy_deposit/withdraw/invest/sell`). Never add a direct `insert/update` on `docs` from the page: the database blocks it by design. If a money rule changes, change the SQL function and re-run the file (it is idempotent), then update the matching local-mode branch in `public/index.html`.
- Keep the per-bank invariant: `totalEarned − totalWithdrawn − marketNet = balance`.
- Only the Supabase **anon** key belongs in `public/config.js`. Never put the service_role key or the database password in this folder.
- After changing SQL, re-run the PGlite checks described in the summary's "Testing done" before deploying; probe the live DB with real parameter names (an empty `{}` body gives a false "function missing").
- Deploy: `npx wrangler pages deploy public --project-name piggy-payday --branch main --commit-dirty=true` from this folder. Run the SQL first if the app now depends on it, then deploy right away (the old and new app versions don't tolerate each other's database state).
- Don't invite a child's own login until parent/kid roles exist: everyone on `allowed_emails` currently has full control.
