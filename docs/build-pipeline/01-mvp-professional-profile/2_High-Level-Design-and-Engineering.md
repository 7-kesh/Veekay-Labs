# High-Level Design & Engineering: Veekay Labs — Phase 1 (Professional Profile MVP)

> Source: 1_PRD.md | Owner: Venkat Krishnan Chellappa | Status: Draft — for review | Last updated: 2026-07-19
> Combines the HLD and Engineering Design templates (`2_HLD.md` + `3_engineering.md`) into a single document for this initiative.

---

# PART A — HIGH-LEVEL DESIGN

## 1. Overview
Veekay Labs Phase 1 is a statically-generated Next.js website, deployed on Cloudfare, that presents Venkat's professional profile, resume, and flagship project case studies. Content (bio, projects, page copy) lives as MDX/Markdown files in the repo — there is no CMS or database read-path in this phase. The only dynamic piece is the contact form, which posts to a single API route.

## 2. System Context
```
Visitor (browser)
      ↓
Next.js Frontend (Cloudfare, SSG/ISR)
      ↓
   ┌──────────────┬───────────────────┬──────────────────┐
   ↓              ↓                   ↓                  ↓
Content Layer   Contact API Route   GitHub API (opt.)   Analytics
(MDX in repo,   → Supabase or       → repo metadata      (PostHog / GA,
 build-time)      email provider      for GitHub page      client-side)
```
Everything except the contact form and (optionally) the GitHub page is resolved at build time — no runtime database read is required to render a page.

## 3. Major Components
| Component | Responsibility | Owner |
|---|---|---|
| Frontend App (Next.js App Router) | Renders Home, About, Resume, Contact, Build, Articles, Demos, GitHub pages | Venkat |
| Content Engine | Parses MDX/Markdown + frontmatter into typed page/project data at build time | Venkat |
| Contact API Route | Receives contact form submissions, validates, forwards to storage/email | Venkat |
| GitHub Data Fetcher (optional, V1) | Pulls repo metadata for the GitHub page — may be manually curated instead | Venkat |
| Resume Delivery | Serves a static, versioned resume PDF for download | Venkat |
| Deployment Pipeline | Builds and deploys the site on every push to `main`, with PR previews | Cloudfare |

## 4. Component Interactions
1. Build time: Content Engine reads all `.mdx` files under `/content` and `/projects`, validates frontmatter, and generates static params for each route.
2. Next.js statically generates (SSG) all content pages at build time; project/article pages use `generateStaticParams`.
3. Visitor requests a page → Cloudfare edge serves the pre-built static HTML (no server round-trip for content pages).
4. Visitor submits the contact form → client calls `POST /api/contact` → API route validates input, writes to storage (Supabase table or forwards via email API) → returns success/error to client.
5. (Optional) GitHub page either renders from a manually curated MDX file, or — if implemented — fetches repo data via ISR (revalidate every N hours) to avoid hitting GitHub API rate limits on every request.

## 5. Data Flow
- **Content:** Author writes MDX in `/content/{pages,projects,articles}` → Content Engine parses frontmatter + body at build time → statically rendered HTML/CSS shipped to visitor. No content is stored in a database in V1.
- **Contact form:** Visitor input (name, email, message) → client-side validation → `POST /api/contact` → server-side validation/sanitization → written to Supabase `contact_submissions` table (or sent via transactional email API) → Venkat is notified.
- **Resume:** Static PDF stored in `/public`, linked from nav/footer — no processing, direct download.
- **Analytics:** Page views and key interactions (resume download, contact submit) fire client-side events to PostHog/GA — no PII beyond what the visitor explicitly submits.

## 6. Architectural Decisions
| Decision | Options Considered | Chosen | Rationale |
|---|---|---|---|
| Rendering strategy | SSR vs. SSG vs. ISR | SSG for content pages, ISR for GitHub data (if implemented) | Content changes infrequently; SSG maximizes performance/SEO with zero runtime DB dependency |
| Content storage | Headless CMS vs. MDX-in-repo | MDX-in-repo | Matches Technical-Architecture.md's "Content as Data" principle; no CMS cost/complexity needed for one author |
| Contact form backend | Supabase table vs. transactional email API (e.g. Resend) vs. both | **Open — see §11** | Needs a decision before engineering is finalized |
| Component library | shadcn/ui vs. custom components | shadcn/ui | Already decided in Technical-Architecture.md; speeds up accessible, consistent UI |
| GitHub integration | Live API fetch vs. manually curated MDX | Manually curated for V1 launch, live API as stretch | Avoids rate-limit/availability risk on launch-critical path |

## 7. Non-Functional Requirements
- **Scale / load:** Low-traffic personal site; no special scaling needed at launch (hundreds, not thousands, of daily visitors expected)
- **Performance:** Lighthouse performance score > 90 on Home and Build pages; images optimized via `next/image`
- **Availability:** Matches Cloudfare's platform SLA; no custom uptime commitment needed for a personal site
- **Security & privacy:** Contact form inputs sanitized server-side; no secrets in client bundle; rate limiting on `/api/contact` to prevent spam/abuse
- **SEO:** Meta tags, sitemap.xml, structured data (schema.org Person/Article) per page
- **Accessibility:** WCAG 2.1 AA — keyboard navigation, contrast, ARIA labels (per Design-System.md)

## 8. External Dependencies
- Cloudfare (hosting, CI/CD, preview deployments)
- Supabase and/or a transactional email API (contact form backend — pending decision)
- GitHub API (optional, for GitHub page)
- PostHog and/or Google Analytics (client-side analytics)
- Custom domain registrar/DNS (not yet configured — open risk from PRD)

## 9. Alternatives Considered
- **Headless CMS (Sanity, Contentful):** rejected for V1 — adds cost and complexity for a single-author site; MDX-in-repo satisfies "Single Source of Truth" and "Build Once, Reuse Everywhere" principles without it.
- **Static site generators outside the React ecosystem (Astro, Hugo):** rejected — Next.js was already selected in Technical-Architecture.md to keep a consistent React/TypeScript stack for future AI Assistant and interactive features (Phase 3+).
- **WordPress / no-code site builder:** rejected — inconsistent with "AI-native, not a portfolio" principle and blocks future programmatic AI/content integration.

## 10. Open Risks
- Contact form backend is undecided — blocks finalizing the data model in Part B.
- Custom domain not yet configured — blocks final production deployment step, not the build itself.
- If live GitHub API integration is attempted, rate limits and auth (PAT storage) need explicit handling — deferred to a stretch goal.

---

# PART B — ENGINEERING DESIGN

## 1. Scope of This Document
Covers implementation-ready detail for the Phase 1 MVP: Next.js app scaffold, page routing, the MDX content pipeline, the contact form API route, resume delivery, and deployment configuration. Does **not** cover the AI Assistant, PMOS Knowledge Hub, search, or Supabase-backed user accounts — those belong to later phases with their own HLD/engineering docs.

## 2. Detailed Component Design

### Component: Content Engine (`lib/content.ts`)
- Responsibility: read and parse MDX files from `/content` and `/projects`, validate frontmatter against a schema, expose typed getters for pages to consume
- Internal structure: `getAllProjects()`, `getProjectBySlug(slug)`, `getAllArticlesMeta()`, frontmatter parsed via `gray-matter`, MDX compiled via `next-mdx-remote` or Contentlayer
- Key interfaces exposed: typed functions consumed by page components in `app/build/[slug]/page.tsx`, `app/articles/page.tsx`, etc.

### Component: Contact API Route (`app/api/contact/route.ts`)
- Responsibility: validate and persist/forward contact form submissions
- Internal structure: input validation (zod schema), rate limiter (per-IP), storage adapter (Supabase insert or email send)
- Key interfaces exposed: `POST /api/contact`

### Component: Frontend App (`app/*`)
- Responsibility: route-level pages per the Information Architecture — Home, About, Resume, Contact, Build (list + detail), Articles, Demos, GitHub
- Internal structure: shared `Nav`/`Footer` layout components, shadcn/ui primitives, page-level Server Components reading from the Content Engine
- Key interfaces exposed: standard Next.js App Router routes

## 3. Data Models / Schemas
```
// Entity: ProjectFrontmatter (MDX frontmatter, /content/projects/*.mdx)
title: string
slug: string
summary: string
problem: string
productDecisions: string        // markdown body section
aiDecisions: string             // markdown body section, optional
architecture: string            // markdown body section, optional
tags: string[]
technologies: string[]
githubUrl: string | null
demoUrl: string | null
status: "live" | "in-progress" | "archived"
publishedAt: date
```
```
// Entity: ContactSubmission (Supabase table — pending backend decision, see §11)
id: uuid
name: string
email: string
message: string
created_at: timestamp
```

## 4. API Contracts
| Endpoint / Interface | Method | Request | Response | Errors |
|---|---|---|---|---|
| `/api/contact` | POST | `{ name, email, message }` | `{ success: true }` | 400 invalid input, 429 rate limited, 500 storage/send failure |
| `/api/github/repos` *(optional, stretch)* | GET | — | `{ repos: RepoMeta[] }` | 502 GitHub API unavailable (falls back to cached/curated data) |

## 5. Tech Stack & Tooling
Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion (per Technical-Architecture.md). MDX parsing via `gray-matter` + `next-mdx-remote` (or Contentlayer if preferred for build-time type safety). Contact form backend: Supabase **or** a transactional email API (Resend) — decision pending, see §11. Deployment on Cloudfare. Analytics via PostHog and/or Google Analytics.

## 6. Error Handling & Edge Cases
| Scenario | Expected Behavior |
|---|---|
| MDX file missing a required frontmatter field | Build fails with a clear validation error (fail fast, not a silent bad render) |
| Contact form submitted with invalid email | 400 response, inline client-side error, no write attempted |
| Contact form spam / repeated submissions | Rate limited per IP (e.g. 5 requests / 15 min) → 429 |
| Resume PDF link broken/missing | Build-time check ensures the file exists in `/public`; CI fails otherwise |
| GitHub API unavailable (if live-fetch implemented) | Falls back to last cached/curated data, page still renders |

## 7. Security Considerations
No secrets in client-side bundles — all API keys (Supabase, email provider, GitHub PAT if used) live in Cloudfare environment variables. Contact form input is sanitized and validated server-side before storage. Rate limiting applied to `/api/contact` to prevent abuse. No authentication/session handling exists in this phase, so there is no attack surface around auth.

## 8. Performance & Scalability Notes
Content pages are statically generated at build time — no per-request database read, so performance is effectively CDN-bound. Images served via `next/image` for automatic optimization. If GitHub API integration is added, use ISR (e.g., revalidate every 6–12 hours) rather than fetching on every request, to stay within rate limits and keep pages fast.

## 9. Infra & Deployment
Cloudfare project connected to the GitHub repo. Every PR gets a preview deployment; merges to `main` deploy to production. Environment variables (Supabase keys, email API key, analytics IDs) configured in the Cloudfare dashboard, not committed to the repo. Custom domain to be attached once purchased/configured (tracked as an open risk in Part A, §10).

## 10. Engineering Constraints ("Constitution")
- Must follow the repository structure defined in `/docs/technical-architecture.md`: `/src /components /app /content /projects /pmos /lib /services /public /styles /docs`
- All page content must be authored as MDX/Markdown with validated frontmatter — no ad-hoc content storage outside `/content` and `/projects`
- No CMS dependency introduced in this phase
- Forbidden: hardcoded API keys/secrets anywhere in the repo; inline styles that bypass the Tailwind/shadcn design system
- Required: Lighthouse performance score > 90 on Home and Build pages before this phase is considered done; responsive check across mobile/tablet/desktop before merge

## 11. Open Technical Questions
- **Contact form backend:** Supabase table, transactional email API, or both (write + notify)? Needs a decision before `spec.md` is written for the contact form.
 The Contact form backend will be both supabase table and transaction email API. Please note the Supabase will capture contact information and timestamp only and not the content.The content will be managed through email.      
- **GitHub page:** manually curated MDX for launch, or build the live API integration now? Affects whether `/api/github/repos` is in scope for this release.
 Build the live API integration 
- **Custom domain:** has it been purchased? Needed to finalize the Infra & Deployment section and the production launch checklist.
The name of custom domain is still in discussion.