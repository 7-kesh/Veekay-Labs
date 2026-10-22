---
name: piggy-payday
description: Working notes on the Piggy Payday side project (family chore bank + Market Investment, Cloudflare Pages + Supabase): state as of 2026-10-22, decisions, gotchas, what to pick up next.
metadata:
  type: project
---

# Piggy Payday (side project, revived and shipped 2026-10-22)

**Where:** `Personal_projects/piggy-payday-site/` (live build). Its own docs are authoritative: `docs/PROJECT-SUMMARY.md` (snapshot, security model, runbook, session log) and `CLAUDE.md`. This file is only co-builder's working notes. Not part of the Veekay Labs Phase 1-5 gates; don't count it toward them. (`Personal_projects/piggy-payday/` is the superseded single-file version.)

**What it is:** Veekay's family chore bank. Weekly earnings are split into Save / Gift / Spend piggy banks; withdraw any time, never move between banks. **Market Investment** puts Save money into the S&P 500 or NASDAQ (live Yahoo prices through a Cloudflare Pages Function, else a deterministic simulated "Practice market"), with a growth chart, holdings, and sell-back to Save. Lives at https://piggy-payday.pages.dev/ ; data in Supabase (`wjlynndfylepjkbulwrv`); email-link sign-in locked to an `allowed_emails` list.

**Decisions Veekay made:** Supabase (not Cloudflare D1) for storage because he already had an account; money moves as atomic DB functions with direct writes blocked; parent/kid roles deferred; turn off open signups; backups via in-app JSON export; delete the old Claude artifact; push once working.

**Open (waiting on Veekay):** partner's first sign-in (Supabase built-in email hit its rate limit; retry later), then turn OFF "Allow new users to sign up" and verify via `/auth/v1/settings`; confirm the lifetime-totals correction SQL was run on the live DB (seed.sql is corrected but the live rows may still be stale); whether to build parent/kid roles before a child gets a login.

**Gotchas (learned the hard way):**
- Supabase default **Site URL is localhost:3000**: emailed links break until Site URL + Redirect URL are set to the Pages URL.
- Built-in Supabase email is heavily rate limited ("email rate limit exceeded"); Gmail app-password SMTP is the fix if it recurs. Dashboard "Add user" also failed for him.
- Probing PostgREST: send the function's real parameter names. `{}` returns PGRST202 "not found" even when it exists (caused a false alarm and a premature deploy decision).
- Order of operations: SQL first, deploy immediately after; old and new app versions break against the other's database state.
- `wrangler pages deploy` needs the project created first. The Cloudflare dashboard list can lag behind the CLI.
- Everyone on the allow-list has full control and the DB can't verify live prices. Don't give a child his own login yet.

**Pick up next:** (1) ask if the partner signed in; verify signups are off; (2) confirm the totals-fix SQL ran; (3) offer parent/kid roles; (4) optional hardening: custom SMTP, SRI hash + CSP header, GitHub-connected Pages deploys; delete the superseded `piggy-payday/` copy.

Related: [project-context](project-context.md) for the main platform; root `docs/PROJECT-SUMMARY.md` has a 2026-10-22 entry for this work.
