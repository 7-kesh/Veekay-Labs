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

## Active Initiative: `01-mvp-professional-profile`

**Folder:** `docs/build-pipeline/01-mvp-professional-profile/`

| Pipeline Doc | Status |
|---|---|
| `1_PRD.md` | 🟢 Drafted |
| `2_High-Level-Design-and-Engineering.md` | 🟡 Drafted — pending Venkat's review + 3 open questions |
| `4_spec.md` | ⬜ Not started (blocked on HLD/Engineering review) |
| `5_execution.md` | ⬜ Not started |

### Phase 1 Deliverables Checklist
- [ ] Project setup (Next.js, Tailwind, shadcn/ui)
- [ ] Responsive layout + navigation
- [ ] Home page
- [ ] About page
- [ ] Resume page (downloadable PDF)
- [ ] Contact page + working contact form
- [ ] Build section — minimum 3 flagship project case studies published
- [ ] Articles landing page
- [ ] Demo Videos page
- [ ] GitHub page
- [ ] Deployed to production (Vercel) on a custom domain

**Exit criteria (from PRD):** Website deployed · responsive desktop/mobile · resume downloadable · Lighthouse performance > 90 on Home/Build · 3+ flagship projects published · contact form delivers reliably.

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
