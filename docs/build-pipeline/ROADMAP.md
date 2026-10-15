# Veekay Labs — Execution Roadmap (Progress Tracker)

> This tracks **build/execution progress**. For the product vision and long-term version narrative, see `/docs/roadmap.md`. This doc answers "where are we, right now, against the plan" — update it whenever a checklist item, gate, or initiative status changes.

---

## Phase Status Overview

| Phase | Maps to Version | Status | Gate |
|---|---|---|---|
| Phase 1 — Foundation | V1 Professional Profile | 🟡 In progress (design) | Deployed, responsive, resume downloadable, 3+ flagship projects published |
| Phase 2 — Content Platform | V2 Living Builder Platform | ⬜ Not started | Knowledge Hub searchable, Builder's Journal live, GitHub integrated |
| Phase 3 — AI Experience | V3 AI PM Knowledge Hub | ⬜ Not started | AI answers profile/project questions with grounded citations |
| Phase 4 — Learning Platform | V4 AI PM Academy | ⬜ Not started | End-to-end learning journey + AI mentor operational |
| Phase 5 — AI-Native Ecosystem | V5 Veekay Labs Platform | ⬜ Not started | Knowledge graph live, community contribution model established |

Legend: ⬜ Not started · 🟡 In progress · 🟢 Gate met · 🔴 Blocked

---

## Active Initiative: **Veekay Labs — Profile** (`01-mvp-professional-profile`)

> Named 2026-09-28 — this is the working name for the Phase 1 / V1 Professional Profile build, distinct from the "Veekay Labs" platform name it will grow under. Rename freely if a better name lands later; update this heading + `docs/PROJECT-SUMMARY.md`'s snapshot together if so.

**Folder:** `docs/build-pipeline/01-mvp-professional-profile/`

| Pipeline Doc | Status |
|---|---|
| `1_PRD.md` | 🟢 Drafted |
| `2_High-Level-Design-and-Engineering.md` | 🟡 Drafted — pending Venkat's review + 3 open questions |
| `4_spec.md` | ⬜ Not started (blocked on HLD/Engineering review) |
| `5_execution.md` | ⬜ Not started |

### Build Roadmap (milestone-sequenced)

**M0 — Owner decisions (blocking everything below, no build work yet)**
- [ ] Contact form backend — Supabase table vs. transactional email API vs. both?
- [ ] GitHub page — manually curated MDX at launch, or live GitHub API integration now?
- [ ] Custom domain — purchased/configured yet? What's the domain?
- [ ] Pick the **3rd flagship project** — the reference design (see below) only wires up 2 (ER Triage AI Co-pilot, Document Parser); exit criteria needs 3+. Piggy Payday is explicitly paused/out.
- [x] ~~Decide the fate of the Vite/React "Build website from reference" template in `assets/`~~ — **RESOLVED 2026-09-28: use it.** Venkat directed that the Profile Page use all assets under `assets/`. See "Reference Assets" below — this is a bigger decision than "discard vs. reuse a generic scaffold": `App.tsx` is an already-built, content-complete implementation of the actual Home page design, not boilerplate.
- [ ] **New, surfaced by the asset review:** several Home page sections in the reference design (Now Building, Public Roadmap, "AI Assistant (Personal)" chat panel, Recent Activity feed) are Phase 2/Phase 3 features per this project's own phase gates, not Phase 1. Decide: ship them as static/"Coming Soon" placeholders in V1 (recommended, avoids scope creep), or build them functionally now (would jump the phase gate — flagging per the Working Agreement, not deciding solo).
- [ ] **New, surfaced by the asset review:** the reference design's footer shows a personal phone number, `(408) 726-2320`. Confirm before launch whether that's intended to be public — Venara Inc's own content rules explicitly exclude a personal phone number from its public site; worth applying the same bar here.

### Reference Assets (added 2026-09-28 — Venkat: "the Profile Page should use all the assets under Veekay Labs")

All four files in `assets/` are now in scope as build inputs for this initiative, not inert reference material:

| Asset | Role | Notes |
|---|---|---|
| `assets/image.png` | **The canonical Home page visual reference.** A full-page mockup of the actual Home page design (nav, hero, impact-metric bar, Featured Projects, Now Building, Latest Writing, AI Assistant panel, Public Roadmap, Recent Activity, footer) plus an annotated infographic of the blueprint plan. | Matches `docs/design-system.md`'s stated Navy Blue + Cyan Gradient + White palette. Brand shown as "Veekay C" (personal byline) under the "Veekay Labs" platform. |
| `assets/Veekay_AI_Product_Website_Blueprint_v1.pdf` | IA/content-strategy source (Vision, Core Experiences — Explore/Learn/Ask, Homepage sections, Navigation, Project page structure, Knowledge Hub taxonomy, AI Assistant scope, Progressive Disclosure model, UX Principles, Future features). | Cross-check against `docs/information-archtecture.md`, `docs/vision.md`, `docs/page-content.md` for gaps — e.g. the "Journey" nav item and "Recruiter Mode" future feature aren't obviously reflected there yet. |
| `assets/Build website from reference/src/app/App.tsx` | **A near-complete, already-built React implementation of the Home page** — 1,001 lines, real content wired in (ER Triage AI Co-pilot + Document Parser project cards, the exact impact stats, roadmap completed/in-progress lists, recent-activity feed, `VeekayC@icloud.com`), not a generic template. Styling is inline hex/rgba (e.g. `#22d3ee` cyan, navy backgrounds), matching `image.png` exactly. | **This is the real build target to port into Next.js App Router**, not just a mood board — treat it as a strong head start on M3's Home page. Requires an actual Vite→Next.js port (routing, data fetching, file structure), not a drop-in copy. |
| `assets/Build website from reference/default_shadcn_theme.css` | **Not used by the design above** — confirmed this is shadcn/ui's unedited default theme (generic OKLCH grayscale tokens), left over from whatever scaffolding tool generated the export. `App.tsx` doesn't reference these CSS variables; it hardcodes its own navy/cyan values inline. | Don't port this file's tokens as-is. When building the real Next.js theme, extract the actual hex/rgba values used throughout `App.tsx` into proper Tailwind/CSS custom properties instead. |
| `assets/Veekay Labs Type and Color Pairings.html` | A font/color **exploration** doc — contains ~9 candidate font pairings (DM Serif Display, Karla, Literata, Manrope, Newsreader, Public Sans, Source Serif 4, Spectral, Syne, Libre Caslon Text) and 30+ candidate hex colors across several different palette directions (navy/blue, warm coral/terracotta, teal). | The navy/blue/cyan family in this file (`#0a1628`, `#1a3a7a`, `#2451ff`, `#2a78d6`, `#2fc4c9`) matches what's actually used in `App.tsx`/`image.png` — treat that as the selected pairing unless Venkat says otherwise. The warm/teal palettes appear to be rejected alternatives, not additional themes to apply. |

**M1 — Spec (unblocked once M0's first 3 questions are answered)**
- [ ] `4_spec.md` — contact form (first implementation-ready piece, per the existing plan)
- [ ] `5_execution.md` — full task breakdown

**M2 — Scaffold**
- [ ] Project setup (Next.js App Router, Tailwind, shadcn/ui)
- [ ] Deploy an empty shell to Vercel
- [ ] Connect the custom domain (once purchased)
- [ ] Extract the real design tokens (colors/fonts actually used in `App.tsx`) into Tailwind config / CSS custom properties — do not carry over `default_shadcn_theme.css` unedited

**M3 — Core pages**
- [ ] Responsive layout + navigation
- [ ] Home page — **port `assets/Build website from reference/src/app/App.tsx`** into Next.js App Router (see Reference Assets above), resolving the Phase 2/3-feature placeholder question first
- [ ] About page
- [ ] Resume page (downloadable PDF)
- [ ] Contact page + working contact form (wired to the M0 backend decision)

**M4 — Build section**
- [ ] Write and publish the 3 flagship project case studies chosen in M0

**M5 — Supporting pages**
- [ ] Articles landing page
- [ ] Demo Videos page
- [ ] GitHub page

**M6 — QA**
- [ ] Responsive check — desktop + mobile
- [ ] Lighthouse performance > 90 on Home and Build pages

**M7 — Launch**
- [ ] Deployed to production on the custom domain
- [ ] Phase 1 gate confirmed met (see Exit criteria below) → kick off Phase 2 (`02-content-platform`)

**Exit criteria (from PRD):** Website deployed · responsive desktop/mobile · resume downloadable · Lighthouse performance > 90 on Home/Build · 3+ flagship projects published · contact form delivers reliably.

**Where we are now (2026-09-28):** M0 not resolved (3 of 5 decisions still open) → nothing past M0 is unblocked yet. No code exists in `websites/` for this project.

---

## Upcoming Initiatives (not yet started)

| # | Initiative | Phase | Trigger to start |
|---|---|---|---|
| 02 | Content Platform (Knowledge Hub, Builder's Journal, Build Log, search) | Phase 2 | Phase 1 gate met |
| 03 | AI Experience (RAG pipeline, Ask AI chat) | Phase 3 | Phase 2 gate met |
| 04 | Learning Platform (learning paths, AI mentor) | Phase 4 | Phase 3 gate met |
| 05 | AI-Native Ecosystem (knowledge graph, multi-agent) | Phase 5 | Phase 4 gate met |

---

## How This Gets Updated

- Whenever a checklist item is completed, check it off here.
- Whenever a pipeline doc (`1_PRD` → `5_execution`) is created or advances status, update the table above.
- Whenever a phase gate is met, flip its status to 🟢 in the Phase Status Overview and start the next initiative's folder under `docs/build-pipeline/`.
- Cross-reference `/docs/PROJECT-SUMMARY.md` for the narrative "what happened last session" — this file is the structural "where do things stand" view.
