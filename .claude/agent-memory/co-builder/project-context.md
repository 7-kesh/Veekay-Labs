---
name: project-context
description: Veekay Labs platform context — who Veekay is, the product vision, tech stack, phase-gated build sequence, and risks to track. Migrated from the retired PRO agent (.claude/agents/pro.md) on 2026-09-28.
metadata:
  type: project
---

# Veekay Labs — Project Context (for co-builder)

## Who You Are Building With

**Venkat Krishnan Chellappa (Veekay)** — Senior AI Product Manager transitioning into an AI PM + hands-on builder role. 19 years in enterprise product delivery. Strong product instinct, growing technical depth. Veekay Labs is his professional portfolio and long-term platform. He needs a partner who respects his experience while filling his technical gaps honestly.

## The Platform

**Veekay Labs** — An AI-native platform that documents Veekay's journey building AI products, sharing product thinking, and creating practical resources for Product Management and AI Product Management. It begins as a professional profile and product portfolio, then evolves into a living builder platform, an AI Product Management knowledge hub, and ultimately an AI-powered learning ecosystem.

**Corporate structure (confirmed 2026-09-28):** "Veekay Labs" is the site/product name. It is operated under **Venara Inc** (Veekay's AI product consulting company) as the owning legal entity. Footer/legal copy credits Venara Inc as owner.

### Core Pillars
Me • Build • Think • Learn • Ask AI

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Supabase (user data, newsletter, feedback, future AI conversation history) |
| Vector DB | Pinecone |
| AI | OpenAI Responses API — hybrid keyword + semantic search, RAG |
| Content | Markdown/MDX (structured, with metadata) |
| Integrations | GitHub API, Vercel (hosting) |
| Analytics | PostHog, Google Analytics |

### Repository Structure
```
/src /components /app /content /projects /pmos /lib /services /public /styles /docs /websites
```
`websites/venara/` holds the separate Venara Inc consulting-site sub-project (React+Vite) — see its own `CLAUDE.md`/`docs/PROJECT-SUMMARY.md`, not this file, for that project's state.

### Key Documents (in `/docs`)
Vision, Roadmap, PRD, Information-Architecture, Design-System, Technical-Architecture, AI-Assistant, Content-Strategy, Content-Governance, Implementation-Plan, Page-Content.

### Target Personas
Recruiter, Hiring Manager, Founder, Product Manager, AI Engineer, Student — each with distinct goals (fast vetting, evidence of impact, technical depth, learning resources).

### Product Evolution (5 Versions — additive, nothing replaced)
| Version | Identity | Primary Outcome |
|---|---|---|
| V1 | Professional Profile | Visitors quickly understand who Veekay is, what he's built, impact created |
| V2 | Living Builder Platform | Show how products evolve through execution, iteration, learning |
| V3 | AI PM Knowledge Hub | Searchable, interconnected knowledge platform around PMOS |
| V4 | AI PM Academy | Guided learning via AI mentoring, structured paths, exercises |
| V5 | Veekay Labs Platform | Full AI-native ecosystem — sandbox, simulations, marketplace, public APIs |

## Build Sequence (Phase-Gated)

Progress through these phases in order. Do not jump ahead. Each phase has exit criteria Veekay must meet before handing him the next phase.

### Phase 1 — Foundation (MVP / V1 Professional Profile)
- [ ] Project setup (Next.js, Tailwind, shadcn/ui)
- [ ] Responsive layout + navigation
- [ ] Home, About, Resume, Contact pages
- [ ] Featured Projects section
- [ ] Articles landing page
- [ ] Demo Videos page
- [ ] GitHub page
- **Gate:** Website deployed. Responsive desktop/mobile. Resume downloadable. Minimum 3 flagship projects published.

### Phase 2 — Content Platform (V2 Living Builder Platform)
- [ ] PMOS Knowledge Hub scaffold
- [ ] Article library
- [ ] Builder's Journal
- [ ] Weekly Build Log
- [ ] Public Roadmap page
- [ ] Search
- [ ] Tags & categories
- [ ] GitHub integration (repos, README, commits, activity)
- **Gate:** Knowledge Hub searchable. First learning paths published. Article navigation complete. Live project progress visible.

### Phase 3 — AI Experience (V3 AI PM Knowledge Hub)
- [ ] RAG pipeline (OpenAI Responses API + Pinecone)
- [ ] Knowledge ingestion (resume, projects, PRDs, PMOS, articles, Builder's Journal, GitHub READMEs)
- [ ] Chat interface
- [ ] Resume Q&A
- [ ] Project Q&A
- [ ] PMOS Q&A
- **Gate:** AI answers profile and project questions accurately with grounded, cited responses. Knowledge base synchronized.

### Phase 4 — Learning Platform (V4 AI PM Academy)
- [ ] Interactive learning paths
- [ ] Trivia / quizzes
- [ ] Interview preparation coach
- [ ] AI Mentor
- [ ] Templates & framework library
- **Gate:** End-to-end learning journey available. AI mentor operational.

### Phase 5 — AI-Native Ecosystem (V5 Veekay Labs Platform)
- [ ] Knowledge graph connecting projects, articles, PMOS, GitHub repos
- [ ] Multi-agent orchestration
- [ ] AI Product Sandbox / Prompt Playground / Evaluation Playground
- [ ] Community contribution model
- **Gate:** Knowledge graph live. Community-driven content growth established.

## Risks to Track Proactively

| Risk | Trigger to watch for | Action |
|---|---|---|
| Scope creep past current version | Building V3+ features while V1 incomplete | Flag explicitly, let Veekay decide, make trade-off visible |
| Content sprawl without structure | Pages/articles added without metadata (tags, topics, dates) | Enforce Content-as-Data principle before publishing |
| AI hallucination in Ask AI | Assistant answers without source grounding | Require citations, tighten RAG retrieval before shipping |
| Secrets exposure | API keys (OpenAI, Supabase, Pinecone) in client code or commits | Verify env vars used, never hardcoded |
| Single Source of Truth violations | Same fact (e.g. bio, project status) duplicated across pages/docs | Consolidate into canonical content source |
| Design System drift | New pages built without following Design-System.md | Check against design tokens before merge |
| Analytics/privacy gaps | Tracking added without privacy-first review | Confirm PostHog/GA config respects privacy-first principle |
| Docs vs. reality drift | Session log / roadmap not updated after a real commit (happened 2026-09-25 → 2026-09-28) | Cross-check `git log` against PROJECT-SUMMARY.md's last session date whenever it looks stale |
| Stack mismatch in reused assets | Reference templates or scaffolds pulled in from elsewhere use a different stack than `docs/technical-architecture.md` specifies (e.g. Vite instead of Next.js) | Flag explicitly before porting any code from such a template |

## What You Never Do (Veekay Labs specifically)

- Never skip a phase gate. If Veekay wants to rush ahead, flag the risk and let him decide — but make the risk explicit.
- Never give generic Next.js / Supabase / OpenAI documentation. Everything is specific to this build.
- Never soften a problem. If content is unstructured or the AI is hallucinating, say so directly.
- Never suggest features outside the current version's scope without flagging it as scope creep.
- Never assume a step is done unless Veekay confirms the exit criteria are met.

## Standing State Notes (carried over from PRO, 2026-09-28)

- **This initiative is named "Veekay Labs — Profile"** (working name, chosen 2026-09-28) — the Phase 1/V1 Professional Profile build. See the milestone-sequenced Build Roadmap (M0–M7) in `../../docs/build-pipeline/ROADMAP.md`.
- **Phase 1 is still pre-code.** As of 2026-09-28, `websites/` (product code) had zero Next.js scaffold — only `websites/venara/` (a separate sub-project) exists there.
- **Open questions blocking `docs/build-pipeline/01-mvp-professional-profile/4_spec.md`:** (1) contact form backend — Supabase table vs. transactional email API vs. both; (2) GitHub page — manually curated MDX at launch vs. live GitHub API integration; (3) custom domain status.
- **Piggy Payday** (`Personal_projects/piggy-payday/`) — confirmed by Veekay as a paused side project, not active work, not part of Phase 1.
- **Unresolved:** the Vite/React "Build website from reference" template under `assets/Build website from reference/` — stack conflicts with the documented Next.js architecture. Don't reuse it without flagging that conflict first.
