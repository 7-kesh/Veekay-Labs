# Veekay Labs — Project Summary

> Living session log. Read the **Current Snapshot** first at the start of every session — it's the fast-path to context. The **Session Log** below has full history, most recent first. Update both at the end of a session (or whenever meaningful progress/decisions happen).

---

## Current Snapshot

- **Active phase:** Phase 1 — Foundation (MVP / Professional Profile)
- **Active initiative:** **Veekay Labs — Profile** (named 2026-09-28) — `docs/build-pipeline/01-mvp-professional-profile/`. See the milestone-sequenced Build Roadmap (M0–M7) in `docs/build-pipeline/ROADMAP.md`.
- **Pipeline doc status:** `1_PRD.md` ✅ drafted · `2_High-Level-Design-and-Engineering.md` ✅ drafted, pending Venkat's review · `4_spec.md` ⬜ not started · `5_execution.md` ⬜ not started
- **Last session:** 2026-09-28
- **Waiting on:** Venkat's review of the HLD/Engineering doc + answers to its 3 open questions (contact form backend, GitHub page approach, custom domain status)
- **Next up:** Once open questions are answered → write `4_spec.md` for the contact form (first implementation-ready piece), then `5_execution.md` task breakdown
- **Sub-project note:** `websites/venara/` (Venara Inc site) now lives in this repo — separate page/checklist, not part of these phase gates. See `websites/venara/docs/PROJECT-SUMMARY.md`.
- **Side project note (Piggy Payday, 2026-10-22):** `Personal_projects/piggy-payday/` (single-file chore bank) was revived and extended with a **Market Investment** section; a deployable build lives in `Personal_projects/piggy-payday-site/` (Cloudflare Pages + Supabase) at https://piggy-payday.pages.dev. Still a side project, separate from the Phase 1–5 gates; see `Personal_projects/piggy-payday-site/README.md`.
- **Corporate structure (confirmed 2026-09-28):** Venara Inc is the parent legal entity; "Veekay Labs" is a site name operated under it. Footer copy updated in `docs/page-content.md` §18 to credit Venara Inc.
- **Agent note:** the project-scoped **PRO** agent is retired. Say **"co-builder"** instead — a universal build-partner agent at `~/.claude/agents/co-builder.md` that works across all of Veekay's projects. Its working notes for this project live at `.claude/agent-memory/co-builder/`.
- **Assets confirmed as build inputs (2026-09-28):** `assets/image.png` (Home page mockup), `assets/Build website from reference/src/app/App.tsx` (a near-complete built implementation of it — real content, real design tokens), `assets/Veekay Labs Type and Color Pairings.html` (font/color exploration — navy/cyan pairing confirmed selected), `assets/Veekay_AI_Product_Website_Blueprint_v1.pdf` (IA/content source). Full breakdown in `docs/build-pipeline/ROADMAP.md`'s "Reference Assets" table and `docs/design-system.md`.

---

## Session Log

### 2026-10-22 — Piggy Payday: Market Investment + Cloudflare/Supabase deployment (side project)

**Did:**
- Added a **Market Investment** section to Piggy Payday: invest from the Save bank into the S&P 500 or NASDAQ, daily growth/loss chart (1W/1M/3M/All, hover for any day), holdings with gain/loss, sell back to Save. Uses live Yahoo Finance data when reachable, otherwise a deterministic simulated "Practice market" (badge says which). Lifetime summary gained a **Net to market** column so investing/selling never distorts earned/withdrawn.
- Moved the app off the Claude artifact to **`Personal_projects/piggy-payday-site/`**: static page + Cloudflare Pages Function `/api/market` (price proxy, only `^GSPC`/`^IXIC` allowed) on Cloudflare Pages; data in **Supabase** (one `docs` table) with email-link sign-in locked to an `allowed_emails` list. Existing balances/history migrated via `supabase/seed.sql` (lifetime totals corrected to match history). Old artifact deleted.
- Hardening: database functions (`supabase/atomic-writes.sql`) make every deposit/withdraw/invest/sell one locked operation that refuses overdraws, and direct table writes are blocked for signed-in users. Added in-app **Download a backup** (JSON) with a restore query in the README.
- Tested: 32 SQL checks + backup/restore round-trip in Postgres (PGlite); data-layer unit tests; headless-Chrome click-throughs in local and cloud modes.

**Decided (Venkat):** use Supabase (not D1) for storage; skip parent/kid roles for now; turn off open signups and tighten email limits in the Supabase dashboard; backups via in-app export.

**Open / for Venkat:**
- Run `supabase/atomic-writes.sql` in the Supabase SQL Editor (the new page needs it), turn off "Allow new users to sign up", set email rate limits, add any other family emails (Authentication -> Users, plus `allowed_emails`).
- Known limits: no parent/kid roles (everyone on the allow-list has full control); the database can't verify live prices; free Supabase has no auto-backups and pauses after ~1 week idle.

### 2026-09-28 — PRO session-start audit; Venara sub-project folded in; PRO retired for co-builder; "Veekay Labs — Profile" named + roadmapped

**Did:**
- Ran a PRO session-start check. Found this Snapshot/Session Log was stale (last entry 2026-07-19) against an undocumented 2026-09-25 commit that added `Personal_projects/piggy-payday/` and a Vite+React "Build website from reference" template under `assets/`. Flagged both as risks (docs drift, and the reference template's stack — Vite, not Next.js App Router — conflicts with `docs/technical-architecture.md`).
- Confirmed Phase 1 code progress is still effectively zero: `websites/` was empty, no `package.json`/`next.config` anywhere outside that reference asset dump.
- At Venkat's direction, moved the standalone **Venara Inc** website project (`../Venara`, React+Vite consulting/founder-profile site) into this repo at `websites/venara/` — his stated reason: "the project was originally VeekayLabs." Updated root `.gitignore` (added `websites/venara/{node_modules,dist,.vercel}`), root `CLAUDE.md` (new "Sub-projects" section), and Venara's own `CLAUDE.md`/`docs/PROJECT-SUMMARY.md` (fixed a relative path that broke on the move, logged the relocation, reiterated it keeps a separate content scope and its own checklist — not part of the Phase 1–5 gates).
- Venkat then clarified the corporate structure: "Veekay Labs" is the site name, operated **under Venara Inc** (Venara Inc = parent legal entity, not a sibling brand). Corrected the "Sub-projects" framing in root `CLAUDE.md` and in Venara's own `CLAUDE.md`/`PROJECT-SUMMARY.md` (was implying two independent sibling brands; now states Venara Inc owns/operates Veekay Labs). Updated the footer copy in `docs/page-content.md` §18 from "© 2024 Veekay AI Product Management Platform" to "© 2026 Venara Inc. Veekay Labs is a Venara Inc site."
- Venkat also resolved the Piggy Payday open question: it's a **side project, paused/done-for-now**, small in scope — not active work and not to be confused with the main effort. **The Veekay Labs professional-profile build (Phase 1) is the main work.** The Vite/React "Build website from reference" template's status is still unclear — not addressed by this clarification.
- Venkat then directed retiring the project-scoped **PRO** agent in favor of a **universal co-builder agent**, modeled on the existing `co-builder` agent from the ER Triage AI Co-pilot project (`Product-er-ai-assist-system`), to be usable across all of Veekay's projects. Actions taken:
  - Deleted `.claude/agents/pro.md`.
  - Created `~/.claude/agents/co-builder.md` (user-level, so it resolves in any project directory) — a project-agnostic mentor/co-builder persona that establishes which project is active each session, then reads that project's own docs + its own `.claude/agent-memory/co-builder/` folder for context, rather than hardcoding one product's phases/stack.
  - Migrated PRO's Veekay-Labs-specific content (persona details, Phase 1–5 build sequence, risk table, standing open items) into `.claude/agent-memory/co-builder/project-context.md` + a `MEMORY.md` index, so nothing was lost — co-builder reads this when operating in this repo.
  - Updated references to PRO in root `CLAUDE.md` and `websites/venara/CLAUDE.md` to point at co-builder instead.
  - Left the ER Triage project's own project-scoped `co-builder.md` + its rich existing memory untouched — that project's more specific definition takes precedence when working in that repo; the new universal file explicitly defers to it.
- Venkat asked to **name this profile-building project** (something under the Veekay Labs umbrella) and to **build a roadmap** for it. Named it **"Veekay Labs — Profile"** (working name — the Phase 1/V1 Professional Profile initiative, distinct from the "Veekay Labs" platform name itself; easy to rename later). Rewrote the flat Phase 1 checklist in `docs/build-pipeline/ROADMAP.md` into a milestone-sequenced Build Roadmap (M0 owner decisions → M1 spec → M2 scaffold → M3 core pages → M4 Build section case studies → M5 supporting pages → M6 QA → M7 launch), and surfaced two decisions M0 hadn't captured yet: which 3 projects become the flagship case studies (Piggy Payday is out per this session's earlier call), and what to do with the still-unresolved Vite reference template.
- Venkat then said the Profile Page should use **all the assets under Veekay Labs**. Opened and reviewed all four files in `assets/` (had only been listed by filename before, never actually inspected):
  - **`assets/image.png`** turned out to be the actual Home page mockup — full nav, hero, impact-metric bar, Featured Projects (ER Triage AI Co-pilot + Document Parser), Now Building, Latest Writing, an "AI Assistant (Personal)" chat panel, Public Roadmap, Recent Activity, footer — plus an annotated infographic of the blueprint plan. Confirms the Navy Blue + Cyan Gradient + White palette already stated in `docs/design-system.md`.
  - **`assets/Build website from reference/src/app/App.tsx` turned out NOT to be generic boilerplate** — it's a 1,001-line, already-built React implementation of that exact Home page, with real content wired in (same two projects, same stats, same roadmap lists, `VeekayC@icloud.com`) and real inline hex/rgba design tokens matching `image.png`. This reframes the earlier "Vite vs. Next.js stack conflict" risk: it's not a throwaway scaffold to discard, it's a near-complete Home page build to **port** into Next.js App Router. The sibling file `default_shadcn_theme.css` in the same folder, by contrast, is confirmed unused/unedited shadcn boilerplate — `App.tsx` doesn't reference it.
  - **`assets/Veekay Labs Type and Color Pairings.html`** is a font/color exploration doc with ~9 candidate font pairings and 30+ candidate colors across several palette directions — the navy/blue/cyan family in it matches what's actually used in `App.tsx`, so that's the one to treat as selected; the warm/teal alternatives in the same file look rejected, not additional options to apply.
  - **`assets/Veekay_AI_Product_Website_Blueprint_v1.pdf`** is a legitimate 1-page IA/content-strategy brief (Vision, Explore/Learn/Ask core experiences, Homepage sections, Navigation, Project page structure, Knowledge Hub taxonomy, Progressive Disclosure model, Future features) — not yet cross-checked against `docs/information-archtecture.md`/`docs/vision.md` for gaps (e.g. "Journey" nav item, "Recruiter Mode").
  - Recorded all of this in `docs/build-pipeline/ROADMAP.md`'s new "Reference Assets" table and in `docs/design-system.md`.
  - ⚠ **Two things flagged, not decided unilaterally:** (1) the reference design's footer shows a personal phone number, `(408) 726-2320` — worth confirming it's meant to go public, especially since Venara Inc's own content rules explicitly exclude a personal phone number from its site. (2) Several sections in the reference Home page (Now Building, Public Roadmap, the AI Assistant chat panel, Recent Activity) are Phase 2/Phase 3 features per this project's own phase gates — recommended shipping them as static/"Coming Soon" placeholders for the V1 launch rather than building them functionally now, but left this as Venkat's call per the Working Agreement (don't skip a phase gate without flagging it explicitly).
  - Also still unresolved: the mockup only wires up 2 flagship projects (ER Triage, Document Parser); exit criteria needs 3+, so a 3rd is still an open M0 item.

**Decided:**
- Venara move is a repo-location consolidation, not a page-content merge — its page copy, checklist, and decisions log stay independent of the Veekay Labs product roadmap.
- Corporate ownership: Venara Inc is the parent entity; Veekay Labs is a site it operates. Both sites' footers should credit Venara Inc.
- Co-builder replaces PRO as the mentor/co-builder agent for this project (and every other Veekay project) going forward; PRO's content lives on as this project's co-builder memory, not deleted.
- No git commit was made for the audit, the Venara move, the ownership-framing edits, or the agent swap — left for Venkat to review and commit explicitly.

**Blockers / Open Questions (M0 in `docs/build-pipeline/ROADMAP.md`):**
1. Contact form backend — Supabase table vs. transactional email API vs. both?
2. GitHub page — manually curated MDX for launch, or live GitHub API integration now?
3. Custom domain — purchased/configured yet?
4. The 3rd flagship project (mockup only shows 2: ER Triage, Document Parser).
5. Personal phone number in the reference design's footer — public or remove?
6. Now Building / Public Roadmap / AI Assistant chat / Recent Activity sections — static placeholders for V1, or built functionally now (phase-gate risk)?

**Resolved this session:**
- Piggy Payday — side project, paused/done-for-now, not part of active Phase 1 work.
- The Vite/React "Build website from reference" template — **use it.** `App.tsx` is a near-complete Home page implementation to port into Next.js, not boilerplate to discard.

**Next session should:**
- Start at **M0** of the Build Roadmap in `docs/build-pipeline/ROADMAP.md`: get the 6 open questions above answered/decided, then M1 (`4_spec.md` for the contact form) unblocks.
- Review and `git add`/commit everything from this session (Venara move, ownership-framing edits, agent swap, roadmap/naming updates, asset-review updates) if Venkat approves them as-is.

### 2026-07-19 — PRO agent created; Phase 1 build-pipeline docs drafted

**Did:**
- Created the **PRO** sub-agent (`.claude/agents/pro.md`) — mentor/co-builder for Veekay Labs, modeled on the `co-builder` agent pattern. Phase-gated build sequence (5 phases matching the product's 5 versions), risk list, session-starter format.
- Set up the document pipeline folder structure mirroring `Templates-PMWork` (`1_PRD → 2_HLD → 3_engineering → 4_spec → 5_execution`) under `docs/build-pipeline/<initiative>/`.
- Scoped and wrote `docs/build-pipeline/01-mvp-professional-profile/1_PRD.md` — Phase 1 PRD derived from the product-level `/prd.md`, narrowed to the Professional Profile MVP only.
- Wrote `docs/build-pipeline/01-mvp-professional-profile/2_High-Level-Design-and-Engineering.md` — combines the HLD and Engineering templates into one doc for review. Covers: Next.js SSG architecture, MDX-as-content-source, contact form flow, data models, API contracts, deployment plan.
- Created this file (`PROJECT-SUMMARY.md`) and `docs/build-pipeline/ROADMAP.md` (execution progress tracker) so every session starts with full context.

**Decided:**
- Phase 1 HLD/Engineering scope is the MVP only (not all 5 product versions) — later phases get their own HLD when reached.
- Content stays as MDX-in-repo for V1; no CMS.
- Document pipeline lives under `docs/build-pipeline/<initiative-name>/`, one subfolder per feature/release.

**Blockers / Open Questions (from the HLD/Engineering doc, §11):**
1. Contact form backend — Supabase table vs. transactional email API vs. both?
2. GitHub page — manually curated MDX for launch, or live GitHub API integration now?
3. Custom domain — purchased/configured yet?

**Next session should:**
- Start by reading this Snapshot + `docs/build-pipeline/ROADMAP.md`.
- Check whether Venkat has reviewed `2_High-Level-Design-and-Engineering.md` and answered the open questions above.
- If yes → move to `4_spec.md` (contact form first, since it's the only non-static piece).
- If no → don't proceed to spec; surface the open questions again.
