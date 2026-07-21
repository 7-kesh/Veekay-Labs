# PRD: Veekay Labs — Phase 1 (Professional Profile MVP)

> Owner: Venkat Krishnan Chellappa | Status: Draft | Last updated: 2026-07-19
> Reviewers: Venkat (Owner)
> Source: Scoped from `/prd.md` (product-level PRD) and `/docs/implementation-plan.md` (Phase 1 — Foundation)

## 1. Problem Statement
Venkat needs a live, public website that establishes his professional credibility as a Senior AI Product Manager and hands-on builder. Today there is no single, canonical place for recruiters, hiring managers, and founders to see his experience, resume, and real product work — it's scattered across LinkedIn, GitHub, and documents. This is the foundation release; later phases (Builder Platform, Knowledge Hub, Learning Platform) depend on this shipping first.

## 2. Goals
- Launch a public, responsive website establishing Veekay's professional presence
- Give recruiters/hiring managers/founders a fast path to resume, experience, and flagship work
- Publish at least 3 flagship projects with real technical depth (not portfolio fluff)
- Establish the content architecture (MDX-as-data) that later phases build on

### Non-Goals
- No AI Assistant / Ask AI (Phase 3)
- No Knowledge Hub / PMOS / search (Phase 2+)
- No authentication or user accounts
- No Builder's Journal or public roadmap page (Phase 2)
- No CMS — content is MDX in the repo for this phase

## 3. Target Users / Personas
| Persona | Context | What they need from V1 |
|---|---|---|
| Recruiter | Fast-scanning, high volume | Quick validation of skills, resume, contact |
| Hiring Manager | Evaluating depth | Evidence of product thinking + business impact |
| Founder | Evaluating a potential partner | End-to-end delivery evidence, technical depth |

## 4. User Stories & Acceptance Criteria
| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|--------------|------------|----------------------|
| 1 | Recruiter | Download Veekay's resume from any page | I can screen him quickly | Resume link in nav/footer on every page; downloads a current PDF |
| 2 | Hiring Manager | Read 3+ flagship project case studies | I can assess technical and product depth | Each project has overview, problem, decisions, architecture, outcome |
| 3 | Founder | See real GitHub activity | I can validate hands-on technical involvement | GitHub page links to real repos with descriptions |
| 4 | Any visitor | Contact Veekay directly | I can start a conversation | Contact form submits successfully and Veekay receives it |
| 5 | Any visitor | View the site on mobile | I can browse comfortably from my phone | All pages responsive at mobile/tablet/desktop breakpoints |

## 5. Success Metrics
- Site publicly deployed on a custom domain
- 3+ flagship projects published with full case-study structure
- Resume downloadable from every page
- Lighthouse performance score > 90 on Home and Build pages
- Contact form delivers messages reliably (0 silent failures)

## 6. Scope
### In Scope
- Home, About, Resume, Contact pages
- Build section (flagship project case studies, min. 3)
- Articles landing page (static links/aggregation to existing external posts)
- Demo Videos page
- GitHub page
- Responsive navigation + footer
- Deployment to production (Vercel) with custom domain

### Out of Scope
- AI Assistant / chat interface
- PMOS Knowledge Hub, search, tags
- Builder's Journal, Weekly Build Log, public roadmap page
- User accounts, auth
- Live GitHub API sync (may be manually curated in V1)

## 7. Constraints
- Single builder (Venkat) — implementation time is the primary constraint
- Must follow the stack already decided in `/docs/technical-architecture.md` (Next.js, Tailwind, shadcn/ui, MDX, Vercel)
- No budget for a CMS or paid content tooling in this phase

## 8. Assumptions
- Content (bio, project write-ups, resume) will be authored by Venkat as MDX/Markdown, not pulled from an external CMS
- 3 flagship projects are already substantially built and can be documented (e.g., ER Triage AI Co-pilot)
- Vercel free/hobby tier is sufficient for V1 traffic levels

## 9. Risks & Open Questions
| Risk / Question | Impact | Owner | Resolution |
|---|---|---|---|
| Contact form backend not yet chosen (Supabase table vs. email API) | Blocks Phase 1 engineering | Venkat | To resolve in engineering.md |
| Custom domain not yet purchased/configured | Blocks final deployment step | Venkat | Open |
| Only partial content ready (case studies not written) | Delays launch, not architecture | Venkat | Track separately from technical build |

## 10. Dependencies
- `/docs/technical-architecture.md` — stack decisions this PRD assumes
- `/docs/design-system.md` — visual language for implementation
- `/docs/information-archtecture.md` — navigation and page structure
- `/docs/page-content.md` — source copy for pages

## Appendix
- Product-level PRD: `/prd.md`
- Roadmap: `/docs/roadmap.md`
- Implementation Plan (Phase 1 — Foundation): `/docs/implementation-plan.md`
