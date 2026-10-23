# Piggy Payday — Project Build Summary

> Source of truth for this project's state. Read **Current Snapshot** first, then the Session Log. Side project under `Veekay-Labs/Personal_projects/`, separate from the Veekay Labs Phase 1–5 gates.

## Current Snapshot

- **What it is:** a family chore-bank web app. Weekly chore earnings are split into three piggy banks (**Save / Gift / Spend**); money can be withdrawn any time but never moved between banks. **Market Investment** lets money from Save be "invested" in the S&P 500 or NASDAQ, shows daily growth/loss on a chart, and sells back into Save.
- **Status (2026-10-22):** live and working. Deposit, withdraw, invest and sell all confirmed by Venkat on the live site against the real database.
- **Data (after cleanup, 2026-10-22):** real money only. Save $3.70, Gift $2.00, Spend $6.00; 5 transactions (the Oct 4 and Oct 11 deposits); lifetime totals earned = balance, withdrawn = 0, net to market = 0; no investments. All September test rounds and the live-site test entries were deleted.
- **Live URL:** https://piggy-payday.pages.dev/ (Cloudflare Pages project `piggy-payday`, account `Venkatkrishnanchellappa@gmail.com's Account`, production branch `main`).
- **Database:** Supabase project `wjlynndfylepjkbulwrv` (https://wjlynndfylepjkbulwrv.supabase.co). Free tier.
- **Code:** `Personal_projects/piggy-payday-site/` in `github.com/veekayC-bit/Veekay-Labs` (pushed, commits `9135431` and `f70aac0`). The older single-file version (`Personal_projects/piggy-payday/`) is superseded and can be deleted.
- **Waiting on Venkat:**
  1. Partner's first sign-in (Supabase email rate limit was hit; retry after it resets).
  2. Then turn OFF "Allow new users to sign up" (Authentication → Sign In / Providers). Verify with `curl <supabase-url>/auth/v1/settings -H "apikey: <anon key>"` → `"disable_signup": true`.
- **Next up (if/when wanted):** parent/kid roles; see Open Items.
- **Pending, not deployed (2026-10-22):** added a "Property of VeekayLabs" footer line to `public/index.html` (`.sync-note` style, bottom of `.page`). The auto-mode safety classifier blocked the production `wrangler pages deploy` (deploys to shared/live infra need explicit go-ahead) - change is committed to the working tree but not live or pushed. Deploy with `npx wrangler pages deploy public --project-name piggy-payday --branch main --commit-dirty=true` once Veekay confirms.

## Architecture

```
Browser (public/index.html + cloud.js)
   │  signs in with emailed link (Supabase Auth)
   │  reads:  Supabase REST/Realtime  (rows visible only to allow-listed emails)
   │  writes: Supabase RPC functions  (piggy_deposit / withdraw / invest / sell)
   │  prices: same-origin /api/market  ──►  Cloudflare Pages Function ──► Yahoo Finance
   ▼
Cloudflare Pages (static hosting + Function)        Supabase (Postgres + Auth + Realtime)
```

| Piece | File | Notes |
|---|---|---|
| App (single page) | `public/index.html` | Vanilla JS, no build step. Light/dark theme. Local-storage fallback if Supabase isn't configured. |
| Data layer + sign-in | `public/cloud.js` | Presents `collection/doc/get/orderBy/limit/onSnapshot` + `rpc()` over one Supabase table; email-link sign-in screen. Live sync via Realtime + 30 s polling safety net. |
| Config | `public/config.js` | Supabase URL + **anon** key (public by design). Never put the service_role key anywhere. |
| Price proxy | `functions/api/market.js` | `GET /api/market?url=<Yahoo chart URL>`. Only `^GSPC` and `^IXIC` allowed; upstream URL is rebuilt server-side; cached 5 min. Needed because Yahoo sends no CORS header. |
| Schema | `supabase/schema.sql` | `docs` table, `allowed_emails`, `is_family()`, read-only policy, realtime publication. Run 1st. |
| Money functions | `supabase/atomic-writes.sql` | The four write functions + helpers; blocks direct table writes. Run 2nd; safe to re-run. |
| Seed | `supabase/seed.sql` | Migrated balances + 17 transactions from the old artifact. Run 3rd, once. |

### Data model (`docs` table: `collection`, `id`, `data jsonb`)
- `buckets/{save|gift|spend}`: `balance, totalEarned, totalWithdrawn, marketNet, label, updatedAt`
- `transactions/{id}`: `type (deposit|withdraw|invest|divest), bucket, amount, balanceAfter, note, ts`
- `positions/{id}`: `index (sp|nas), amount, units, buyLevel, status (open|sold), ts, soldValue?, soldTs?`
- **Invariant (per bank):** `totalEarned − totalWithdrawn − marketNet = balance`. `marketNet` = money put into investments minus proceeds from selling, so investing/selling never distorts earned/withdrawn.

### Market Investment behavior
- Invest only from **Save**; sell returns the current value (gain or loss) to **Save**.
- Position value = `units × current index level`, where `units = amount ÷ level at purchase`.
- Chart: portfolio value over time with a dashed "money put in" line; 1W/1M/3M/All; hover/touch for any day. With no investments it shows what $100 would have become in each index.
- Data source badge: **Live market** (Yahoo via `/api/market`) / **Partly live** / **Practice market (simulated)**. The simulation is deterministic (seeded by date), so it's identical on every device.
- Refreshes on open, on tab refocus, and via a "Refresh market" button (live quotes cached 10 min in the browser).

## Security Model

**Verified (2026-10-22):** anonymous callers cannot read `docs`, cannot insert, and cannot call any money function (all return permission-denied); the internal helper `piggy_apply_bucket` is also locked; email confirmation is enabled.

- **Read:** only emails in `allowed_emails` (checked by `is_family()`, a `security definer` function).
- **Write:** nobody can write to `docs` directly, signed in or not. Only the four `piggy_*` functions can, and each checks `is_family()`, locks the rows it touches, does the whole step in one transaction, and refuses to go below $0 or sell twice.
- **Known limits (accepted):**
  - Everyone on the allow-list has full control (no parent/kid roles). Do not give a child his own login until roles exist.
  - The database can't verify live prices; `piggy_invest`/`piggy_sell` trust the level the app sends and only reject absurd values (<1,000 or >200,000).
  - Signups were still open at last check (see Waiting on).
  - No automatic backups on the free Supabase plan; project pauses after ~1 week idle (data kept; click Restore).
  - Minor: Supabase script loaded from CDN without an integrity hash; no Content-Security-Policy header.

## Runbook

- **Deploy:** `cd Personal_projects/piggy-payday-site && npx wrangler pages deploy public --project-name piggy-payday --branch main` (add `--commit-dirty=true` to silence the git warning). Needs `npx wrangler login` once. The `functions/` folder is bundled automatically from the current directory.
- **Fresh Supabase setup order:** `schema.sql` (edit the placeholder email first) → `atomic-writes.sql` → `seed.sql`. In Auth → URL Configuration set **Site URL** to the Pages URL and add `https://piggy-payday.pages.dev/**` to Redirect URLs.
- **Add a person:** `insert into public.allowed_emails (email) values ('x@y.com') on conflict do nothing;` then have them sign in once (while signups are on) via the emailed link.
- **Remove a person:** `delete from public.allowed_emails where lower(email) = lower('x@y.com');`
- **Backup:** in the app, "Download a backup" (JSON). **Restore:** the `insert … from jsonb_array_elements(…)` query in `README.md`.
- **Recalculate lifetime totals from the transaction history** (idempotent; run in the SQL Editor if totals ever look off). Per bank: earned = sum of `deposit`, withdrawn = sum of `withdraw`, marketNet = sum of `invest` minus sum of `divest`; then verify `earned − withdrawn − marketNet = balance`. The full query is in the 2026-10-22 cleanup entry's message history; rebuild it from this definition if needed.
- **Checking the DB from outside:** probe functions with their *real parameter names*, e.g. `POST /rest/v1/rpc/piggy_deposit` with `{"p_alloc":{"save":1}}`; `42501 permission denied` = installed and locked, `PGRST202` = missing. (An empty `{}` body returns PGRST202 even when the function exists, which caused a false alarm during the build.)

## Testing done

- **SQL (PGlite in-process Postgres, stubbed Supabase auth/roles):** 32 checks: access control (anon, stranger, direct writes, helper lockout), deposit/withdraw/invest/sell behavior, overdraw/negative/double-sell refusal, and the balance invariant. Plus a fresh-database first-use check and a backup → restore round-trip.
- **Data layer:** in-memory fake of the Supabase builder: get/set/update/add/orderBy/limit/onSnapshot/rpc/error surfacing.
- **App (headless Chrome):** local mode and cloud mode (stand-in DB) click-throughs for deposit, withdraw, overdraw message, invest, sell, backup button; live `/api/market` through `wrangler pages dev`.
- **Live (Venkat, real DB):** add, withdraw, invest, sell all confirmed working.
- **Not tested:** partner sign-in; behavior at Supabase free-tier limits; phone/dark-mode visual pass on the live site.

## Open Items

1. Partner first sign-in → then disable signups (Waiting on #1–2).
2. ~~Lifetime totals correction~~ **Done 2026-10-22.** The migrated totals were stale; the test history was then removed entirely (see Session Log) and totals recalculated from the 5 real transactions. `seed.sql` now contains only the real data. Still to verify: the "Worth now $1.00" tile Venkat saw before cleanup (no matching open position was found; all positions were deleted in the cleanup). If a Market Investment tile ever shows with nothing invested, check `select * from docs where collection='positions'` and `piggy_sell`'s status update.
3. Parent/kid roles (deferred by Venkat): add a role to `allowed_emails`; kid read-only or invest/sell-only, enforced in the functions.
4. Optional: custom SMTP (Gmail app password) to lift the built-in email rate limit; GitHub-connected Pages deploys; custom domain; SRI hash + CSP header; delete the superseded `Personal_projects/piggy-payday/` single-file copy.

## Session Log

### 2026-10-22 — Built end to end (Market Investment → Cloudflare + Supabase → hardening)

**Did**
- Added **Market Investment** to the existing single-file app (invest from Save into S&P 500 / NASDAQ, growth chart, holdings, sell back), with live Yahoo data and a deterministic simulated fallback.
- Merged onto the Claude-artifact version that had a **Lifetime summary** table; added a **Net to market** column so investing/selling doesn't distort earned/withdrawn.
- Moved the app off the artifact: static page + Cloudflare Pages Function `/api/market`; Supabase for data with email-link sign-in locked to an allow-list. Migrated 3 banks + 17 transactions; deleted the old artifact (confirmed by Venkat).
- Hardening: all money moves became atomic database functions; direct writes blocked; in-app JSON backup + restore query; findings from a live probe of the design written up (see Security Model).
- Committed and pushed (`9135431`, `f70aac0`); added a Piggy Payday entry to the repo's `docs/PROJECT-SUMMARY.md`.

**Decided (Venkat)**
- Supabase rather than Cloudflare D1 for storage (already had an account); Cloudflare Pages for hosting.
- Parent/kid roles **not now**; turn off open signups; tighten email limits; backups via in-app export.
- Delete the old artifact; push commits once working.

**Problems hit and how they resolved (so they aren't re-learned)**
- Yahoo Finance sends no CORS header and Stooq blocks bots → browsers can't call them directly → same-origin Pages Function proxy.
- Supabase default **Site URL is `http://localhost:3000`** → emailed links landed on "site can't be reached". Fix: set Site URL + Redirect URL to the Pages URL.
- The default email template contains a link, not a code; the template editor's "Source" tab was greyed out for Venkat. Resolution: skip custom templates; sign in by tapping the emailed link.
- First sign-in of a new address sends the **Confirm signup** template, returning users get **Magic link**. Edit both if ever customizing.
- Supabase **built-in email sender is heavily rate-limited** ("email rate limit exceeded") → wait ~1 hour, or configure custom SMTP.
- Dashboard "Add user" failed for Venkat (likely the invitation email hit the same limit) → added people via `allowed_emails` + a one-time sign-in while signups are on.
- Cloudflare dashboard list lagged behind CLI (project existed and was serving); direct dashboard link resolved it. `wrangler pages deploy` needs the project created first (`wrangler pages project create piggy-payday --production-branch main`).
- A false "functions missing" alarm came from probing PostgREST with an empty body; always probe with real parameter names (see Runbook).
- A bug caught in testing before release: a variable named `bal` shadowed the `bal()` helper in the invest handler, which would have made the Invest button silently do nothing.

### 2026-10-22 (later) — Real-money cleanup

**Did**
- Recalculated lifetime totals from history (Save 6.71/3.01, Gift 7/5, Spend 8/2, net to market 0). Venkat questioned the withdrawals: the history showed they were all testing, with deposit/withdraw pairs seconds apart on Sept 18 (23:56) and Sept 19 (02:08) that cancelled exactly, plus today's $0.01 test pair and invest/sell test on the live site.
- **Decided (Venkat):** "I only want real money." Deleted every transaction except the 5 real deposits (Oct 4: Save $1.50, Spend $4; Oct 11 "10102026 week": Save $2.20, Gift $2, Spend $2) and deleted all positions, then recalculated totals. Result: Save $3.70, Gift $2.00, Spend $6.00 with withdrawn 0 and net to market 0. A backup was downloaded first. Venkat ran the SQL in the Supabase editor (the app can't delete rows by design) and confirmed it ran.
- Rewrote `supabase/seed.sql` to the real data only (tested in PGlite: invariant holds, recalculation SQL agrees), so a restore or fresh setup never reintroduces the test rows.

**Lessons**
- Lifetime totals will always include any test activity: keep tests off the live database, or clean up like this afterwards.
- The earlier artifact's stored totals had drifted from its history; the transaction history is the source of truth, totals are derived (recalculation query is idempotent).

**Next session should**
- Ask whether the partner has signed in and signups are off; verify via the public auth-settings endpoint.
- Confirm the lifetime-totals SQL was run.
- Offer the parent/kid roles work if a child login is planned.
