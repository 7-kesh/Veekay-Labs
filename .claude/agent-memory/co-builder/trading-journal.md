---
name: trading-journal
description: Working notes on Trading-Journal (Veekay Labs side project): now hosted on Cloudflare Worker + Supabase; state as of 2026-10-26, open items, what to pick up next.
metadata:
  type: project
---

# Trading-Journal

**Authoritative docs:** `Personal_projects/Trading-Journal/docs/PROJECT-SUMMARY.md` (snapshot, session log) and `docs/1_PRD.md`. These notes are only co-builder's pointers. Not part of the Phase 1-5 gates.

**State (2026-10-26):** hosted at `veekay-labs-trade-journal.venkatkrishnanchellappa.workers.dev` (Cloudflare Worker via Workers Builds + Supabase), full feature parity with the original local Flask app (still at `./run.sh`, not retired; Veekay's call). 103 scalp trades migrated and verified to the cent. Scalp form redesigned into 5 sections on 2026-10-23; `migrate-section3-assessments.sql` run successfully (confirmed 2026-10-26). Exposed Anthropic key rotated and updated (confirmed 2026-10-26).

**Violation-tag silent-drop:** resolved 2026-10-26 by extending the list with 6 real tags (not yet deployed). Five trades (3 "(tag to confirm)" variants, 2 "None") deliberately left uncategorized and unchanged, still counted in stats; they are paper.

**Open (Veekay's call):** New scalp form's first real use (draft-save on first screenshot, Save vs Complete review, Claude filling Section 3) not yet reported on. Futures fields, retiring local app.

**Gotchas:** Cloudflare dashboard can't add Variables to this static-assets-origin Worker; use `wrangler secret put`. Never have Veekay paste secrets into chat or inline commands; use a temp file (`printf "$(cat ~/.tmp-secret)" | npx wrangler secret put NAME && rm ~/.tmp-secret`). Strategy changes are a red flag per `TradeVenture/Strategy_Change_Log.md`; confirm before editing `rules/*.md`.

**Direction change 2026-10-26:** the app no longer reviews trades via API; it captures fields + original-res screenshots, exports zips (`tj-export/1`, per trade and per day), and will import Claude chat's "wrap up for today" block (`tj-wrapup/1`) and rank improvements from the data. Build order is in the project's `docs/1_PRD.md` section 12: step 1 (capture + export) pushed (4f144a7) but its Cloudflare build was cancelled (slow), so NOT live; steps 2-3 (import + improvement items, target-based ranking/before-after) and a year/month filter on the Scalp list are built locally and uncommitted (need `supabase/migrate-wrapup.sql` run); Veekay wants ONE final deploy, so don't push piecemeal; app's journal is FINAL (skill stops writing markdown/Trade_Log.csv); screenshots purge at 7 days; consumed export zips in TradeVenture/App_Exports deleted by EOD; metric targets approved; year/month filters on Scalp list, Stats, plan lists; Daily journal pages with download/load built; step 4 (skill update, `docs/skill-changes.md`, awaiting Veekay's sign-off) pending. Reason: API reviews were weak (1200px JPEG screenshots, thin rules copy, low effort, no conversation).

**Pick up next (supersedes the older list below):** get Veekay's feedback on a real export; deploy step 1 (`npm install` first if wrangler fails with an esbuild platform error); then step 2. Older list: commit/push the tag change (awaiting Veekay's go), then test a new scalp trade end to end.
