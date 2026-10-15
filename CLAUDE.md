# Veekay Labs

AI-native personal platform for Venkat Krishnan Chellappa (Veekay) — see `readme.md` and `prd.md` for the full product vision (5-version evolution: Professional Profile → Living Builder Platform → AI PM Knowledge Hub → AI PM Academy → AI-native Ecosystem).

**Corporate structure:** "Veekay Labs" is the site/product name. It is operated under **Venara Inc** (Veekay's AI product consulting company) as the owning legal entity — confirmed 2026-09-28. Footer/legal copy should credit Venara Inc as owner (see `docs/page-content.md` §18).

## Session Protocol

**At the start of every session**, before doing anything else, read:
1. `docs/PROJECT-SUMMARY.md` — Current Snapshot section for fast context, Session Log for history
2. `docs/build-pipeline/ROADMAP.md` — current phase/initiative status and what's checked off

Use both together to know what was done last time, what's still open, and what the next concrete step is. Don't re-derive this from scratch each session — it's already tracked.

Also read `.claude/agent-memory/co-builder/MEMORY.md` for co-builder's own working notes on this project (persona/build-sequence/risk-table context that used to live in the now-retired PRO agent definition).

**At the end of every session** (or after a meaningful chunk of progress/decisions), update:
1. `docs/PROJECT-SUMMARY.md` — refresh the Current Snapshot, append a new Session Log entry (what was done, decisions made, blockers, what next session should do)
2. `docs/build-pipeline/ROADMAP.md` — check off completed deliverables, update pipeline doc status, flip phase status if a gate was met

## Key Docs
| Doc | Purpose |
|---|---|
| `docs/PROJECT-SUMMARY.md` | Session-by-session narrative log — what happened, decided, blocked |
| `docs/build-pipeline/ROADMAP.md` | Structural progress tracker — phase/gate/checklist status |
| `docs/roadmap.md` | Product vision roadmap (V1–V5) — the long-term plan, not execution status |
| `docs/build-pipeline/<initiative>/` | Per-initiative doc pipeline: `1_PRD → 2_HLD/Engineering → 4_spec → 5_execution` |
| `docs/technical-architecture.md` | Stack decisions (Next.js, Tailwind, shadcn/ui, MDX, Supabase, Pinecone) |
| `.claude/agent-memory/co-builder/MEMORY.md` | **Co-builder**'s working notes for this project (project context, phase sequence, risk table). The old project-scoped **PRO** agent was retired 2026-09-28 — say "co-builder" to invoke the universal agent instead (defined at `~/.claude/agents/co-builder.md`, works across all of Veekay's projects). |
| `websites/venara/docs/PROJECT-SUMMARY.md` | Venara Inc sub-project (React+Vite consulting site) — read before touching `websites/venara/` |

## Sub-projects
- **`websites/venara/`** — Venara Inc's own marketing + founder-profile site (the consulting-business homepage, distinct from the Veekay Labs product site this repo otherwise builds). React + Vite, targets Vercel/Cloudflare Pages free tier. Brought under this repo on 2026-09-28. It has its own `CLAUDE.md` and `docs/PROJECT-SUMMARY.md` — read those before working on it. **Keep page content separate**: Venara Inc's consulting-site copy (services, engagements, founder bio) is a different page from Veekay Labs' own pages — don't reuse Venara copy on the main Veekay Labs site or vice versa, and don't count Venara's build progress toward the Phase 1–5 gates above (it tracks its own checklist). Note the ownership direction: **Venara Inc owns/operates Veekay Labs**, not the reverse — Venara Inc is the legal entity, Veekay Labs is a site it operates.

## Working Agreement
- Don't jump ahead of the current phase gate (see ROADMAP.md) without flagging it explicitly.
- New initiatives get their own folder under `docs/build-pipeline/`, following the same 5-doc pipeline naming.
- Content is MDX-in-repo (no CMS) through Phase 1–2 — see technical-architecture.md before introducing new content tooling.
