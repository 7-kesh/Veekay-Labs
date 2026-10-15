# Venara Inc Website — Project Build Summary

> Read this at the start of every session. Update it at the end: refresh the **Current Snapshot**, tick the **Build Checklist**, and add a **Session Log** entry.

---

## Current Snapshot
| | |
|---|---|
| **Last session** | 2026-09-28 |
| **Status** | 🟡 V1 site built locally. Not in git, not deployed. Repo location changed — see below. |
| **Live URL** | — (not deployed) |
| **Repo** | Folded into the Veekay Labs repo at `websites/venara/` (2026-09-28). No standalone git repo of its own; will be tracked as part of `Veekay-Labs` git history going forward. |
| **Next session should** | Decide the hosting plan (Vercel Hobby vs Cloudflare Pages, see Decisions), confirm the placeholders, then commit these files into the Veekay-Labs repo, push, and deploy. |
| **Open blockers** | None technical. Waiting on owner decisions: contact email, engagement lengths, hosting plan, domain. |

---

## What This Project Is
- **Company:** Venara Inc, a product consulting firm offering AI solutions that improve **existing workflows** without disrupting operations.
- **Owner/Founder:** Venkat Krishnan Chellappa (Veekay), Senior Product Manager.
- **Site purpose:** (1) sell Venara's consulting services; (2) carry the founder profile page.
- **Traffic expectation:** low and non-transactional. The goal is zero hosting cost.
- **Lives inside the Veekay Labs repo** (`websites/venara/`, moved here 2026-09-28 — originally conceived as part of Veekay Labs, then spun into its own standalone repo, now folded back in at the owner's direction) but stays a **separate page/content scope**. Don't mix Venara consulting-site copy with Veekay Labs' own pages, and don't count this checklist toward the Phase 1–5 gates in `../../docs/build-pipeline/ROADMAP.md`.
- **Ownership (confirmed 2026-09-28):** Venara Inc is the parent legal entity; "Veekay Labs" is a site it operates. Not two sibling brands — Venara Inc owns Veekay Labs. Footer copy on both sites should credit Venara Inc.

## Tech Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite 5 | Owner asked for React. Vite gives a static build with no server. |
| Styling | Plain CSS (`src/styles.css`), with CSS variables for light/dark mode | No extra dependencies for a single page |
| Fonts | Google Fonts: Fraunces (headings), Inter (body) | |
| Backend | **None.** Contact is a `mailto:` link. | Zero cost, no form service needed |
| Hosting (target) | Vercel, free tier (build `npm run build`, output `dist`) | Owner's preference. See the commercial-use caveat below. |

## File Map
| File | Purpose |
|---|---|
| `src/content.js` | **All site copy**: proof stats, services, approach steps, industries, founder bio, timeline, credentials, engagements, `CONTACT_EMAIL`, `LINKEDIN_URL`. Edit text here. |
| `src/App.jsx` | Page sections as components: Header, Hero, Problem, Services, Approach, Industries, Founder, Engagements, Contact, Footer |
| `src/main.jsx` | React entry point |
| `src/styles.css` | All styling. Breakpoints at 900px and 640px. |
| `index.html` | HTML shell, SEO/OG meta tags, font links |
| `public/favicon.svg` | Tab icon (V mark) |
| `README.md` | Run and deploy instructions |
| `docs/PROJECT-SUMMARY.md` | This file |

## Page Sections (in order)
1. **Hero:** "Make the workflows you already run work better…", plus 4 proof stats (13+ yrs PM, 10,000+ users, ~35% faster processing, 4 industries)
2. **Problem:** "Most AI projects fail at the workflow, not the model."
3. **Services (4):** Workflow & opportunity assessment · AI solution design & pilot · Platform & integration strategy · Fractional product leadership
4. **Approach (4 steps):** Understand the work → Find the bottleneck → Design for trust → Roll out in phases
5. **Industries (4):** Healthcare & pharmacy · Automotive · Fintech & banking · Retail
6. **Founder:** owner's own bio (verbatim), prior-role timeline, credentials, LinkedIn link
7. **Engagements (3):** Assessment (2–4 wks) · Design & pilot (6–12 wks) · Advisory (monthly retainer)
8. **Contact:** mailto call to action
9. **Footer:** © Venara Inc · Milpitas, California

## Content Rules (keep these)
- **No fabrication.** Every founder fact must trace to `/Users/venkatkrishnanchellappa/Documents/GitHub/Job-Search/Job-Applications/Master_Resume/Master_Resume_260817_v2.md`. If the resume changes, re-check the timeline and stats.
- **Past employers are prior roles, not Venara clients.** The timeline is labelled that way on purpose. Never present Shoppers Drug Mart, CVS, Panasonic, etc. as Venara engagements.
- The founder bio paragraphs are the owner's own words. Don't reword them without asking.
- No personal phone number on the public site.

## Decisions Log
| Date | Decision | Notes |
|---|---|---|
| 2026-09-25 | React + Vite, static build | Replaced the first plain HTML/CSS version at the owner's request |
| 2026-09-25 | Target host: Vercel free tier | ⚠ Vercel Hobby terms are for **non-commercial** use, and a consulting business site likely counts as commercial. Cloudflare Pages (free, commercial use allowed) runs this build unchanged. **Owner to decide.** |
| 2026-09-25 | Contact via `mailto:` only, no form backend | Keeps cost at zero. Revisit if lead volume grows. |

## Build Checklist
### V1 — Launch
- [x] Site content drafted from resume + owner's bio
- [x] React/Vite app built; `npm run build` passes
- [x] README with run/deploy steps
- [ ] Visual review in the browser (desktop + mobile)
- [ ] Replace `CONTACT_EMAIL` with a Venara domain address
- [ ] Confirm engagement lengths / offerings
- [ ] Decide hosting: Vercel Hobby vs Cloudflare Pages
- [ ] `git init`, create GitHub repo, push
- [ ] Deploy and record the live URL above
- [ ] Buy/connect custom domain (+ domain email)

### Later (not scoped yet)
- [ ] Founder headshot
- [ ] Case studies / Venara client engagements (once real ones exist)
- [ ] Contact form (e.g. a free form service), if mailto isn't enough
- [ ] Analytics (privacy-friendly)
- [ ] Link to Veekay Labs once it's live

## Session Log
### 2026-09-28 — Folded into Veekay Labs repo
- **Done:** Moved the whole project from its standalone location (`../Venara`) into the Veekay Labs repo at `websites/venara/`, at the owner's direction ("the project was originally VeekayLabs"). Added `websites/venara/node_modules`, `dist`, `.vercel` to Veekay-Labs' root `.gitignore`. Fixed the Master Resume path reference (was a relative `../Job-Search/...` that broke after the move — now absolute). Updated this file and `CLAUDE.md` to reflect the new location and clarified this stays a separate brand/content scope from the main Veekay Labs site.
- **Decided:** Repo consolidation only — Venara keeps its own checklist, decisions log, and content rules; it is not merged into the Phase 1–5 product roadmap.
- **Not done:** Still not committed to git (no commit was made — awaiting explicit go-ahead), still not deployed.
- **Next:** See "Next session should" in the snapshot.

### 2026-09-25 — Initial build
- **Done:** Pulled founder facts from the Master Resume. Built a static HTML/CSS page, then converted it to React + Vite at the owner's request. Moved all copy into `src/content.js`. Verified `npm install` + `npm run build`. Wrote the README.
- **Decided:** React/Vite, static site, mailto contact, target Vercel free tier.
- **Flagged:** Vercel Hobby non-commercial clause. Placeholder email and engagement lengths.
- **Not done:** Browser visual check, git repo, deployment, domain.
- **Next:** See "Next session should" in the snapshot.
