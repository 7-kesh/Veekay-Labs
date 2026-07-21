# Veekay Labs

AI-native personal platform for Venkat Krishnan Chellappa (Veekay) — see `readme.md` and `prd.md` for the full product vision (5-version evolution: Professional Profile → Living Builder Platform → AI PM Knowledge Hub → AI PM Academy → AI-native Ecosystem).

## Session Protocol

**At the start of every session**, before doing anything else, read:
1. `docs/PROJECT-SUMMARY.md` — Current Snapshot section for fast context, Session Log for history
2. `docs/build-pipeline/ROADMAP.md` — current phase/initiative status and what's checked off

Use both together to know what was done last time, what's still open, and what the next concrete step is. Don't re-derive this from scratch each session — it's already tracked.

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
| `.claude/agents/pro.md` | **PRO** — the co-builder agent for this project. Say "PRO" to invoke it directly. |

## Working Agreement
- Don't jump ahead of the current phase gate (see ROADMAP.md) without flagging it explicitly.
- New initiatives get their own folder under `docs/build-pipeline/`, following the same 5-doc pipeline naming.
- Content is MDX-in-repo (no CMS) through Phase 1–2 — see technical-architecture.md before introducing new content tooling.
