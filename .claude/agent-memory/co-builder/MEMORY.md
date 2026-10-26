# Co-builder Memory Index — Veekay Labs (umbrella repo)

> Co-builder is Veekay's **universal** build-partner agent (`~/.claude/agents/co-builder.md`). On "start co-builder" it **asks which project** (AskUserQuestion), then reads only that project's entries below. Never blend two projects' context.

Veekay Labs is an umbrella repo. Each sub-project is separate, with its own state, docs and memory file. Authoritative state always lives in the project's own tracked docs; the files here are co-builder's working notes.

## Projects (pick one)

| Project | Path | Working notes | Authoritative docs |
|---|---|---|---|
| **Professional Profile** (main platform, Phase 1) | repo root | [project-context.md](project-context.md) | `docs/PROJECT-SUMMARY.md`, `docs/build-pipeline/ROADMAP.md`, `CLAUDE.md` |
| **Piggy Payday** (family chore bank, live) | `Personal_projects/piggy-payday-site/` | [piggy-payday.md](piggy-payday.md) | its `CLAUDE.md`, `docs/PROJECT-SUMMARY.md` |
| **Trading-Journal** (local Flask + SQLite) | `Personal_projects/Trading-Journal/` | [trading-journal.md](trading-journal.md) | its `CLAUDE.md`, `docs/PROJECT-SUMMARY.md`, `docs/1_PRD.md` |
| **Venara Inc site** (React + Vite) | `websites/venara/` | none yet; create `venara.md` on first session | its `CLAUDE.md`, `docs/PROJECT-SUMMARY.md` |

Outside this repo: **Product ER AI Assist** (`~/Documents/GitHub/Product-er-ai-assist-system`, ON HOLD) keeps its own memory in its own repo's `.claude/agent-memory/co-builder/`.

## Rules
- Professional Profile's Phase 1–5 gates do not include Piggy Payday, Trading-Journal, or Venara; each tracks its own progress.
- Venara Inc copy stays separate from Veekay Labs copy.
- `Personal_projects/piggy-payday/` is the superseded single-file version; use `piggy-payday-site/`.
- Notes in `project-context.md` apply only to the Professional Profile project, not the side projects.
