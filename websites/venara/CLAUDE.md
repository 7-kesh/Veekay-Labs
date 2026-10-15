# Venara Inc Website

The marketing and founder-profile site for Venara Inc (AI product consulting). It's a React + Vite static site with Vercel as the target host.

## Session Protocol
- **Start of every session:** read `docs/PROJECT-SUMMARY.md` before doing anything else. The Current Snapshot and Build Checklist tell you where things stand and what's next.
- **End of every session** (or after meaningful progress): update `docs/PROJECT-SUMMARY.md`. Refresh the Snapshot, tick the checklist, log decisions, and append a Session Log entry.

## Working Rules
- Site copy lives in `src/content.js`. Edit text there, not in components.
- Never fabricate founder facts. The source of truth is `/Users/venkatkrishnanchellappa/Documents/GitHub/Job-Search/Job-Applications/Master_Resume/` (latest Master Resume).
- Never present past employers as Venara clients.
- **Repo home:** this folder now lives inside the Veekay Labs repo, at `websites/venara/` (moved here 2026-09-28; previously its own standalone repo at `../Venara`). It is managed by the universal **co-builder** agent (`~/.claude/agents/co-builder.md`, replaces the retired project-scoped PRO agent as of 2026-09-28), but keep its **page content separate** from the main Veekay Labs site — this is the Venara Inc consulting-business homepage, not the personal AI-PM platform's own pages. Don't fold its checklist into the Phase 1–5 gates in `../../docs/build-pipeline/ROADMAP.md`; it tracks its own progress in `docs/PROJECT-SUMMARY.md` below.
- **Ownership (confirmed 2026-09-28):** Venara Inc is the legal/business entity. "Veekay Labs" is a site name operated **under** Venara Inc — Venara Inc is the parent, not a sibling brand. Both sites' footers should credit Venara Inc as owner.
