# Trading Journal

Local web app for Veekay's trade logging (Scalp, Options, Swing; Futures coming soon). Part of Veekay Labs, but separate from the Phase 1-5 gates in the repo root.

## Session protocol
At the start of a session read `docs/PROJECT-SUMMARY.md` (Snapshot, Gotchas) and `docs/1_PRD.md`. At the end, update the Snapshot and add a Session Log entry, and tick off or add items in the PRD's open list.

## Rules of the road
- Run with `./run.sh`; restart after code changes (not in debug mode). One machine at a time (lock file).
- Never commit `data/`. Never put the API key in the project folder (`~/.trading-journal.env`).
- `rules/*.md` are the review rubric and mirror Veekay's strategy in `TradeVenture/`. Any strategy change is a red flag: confirm with Veekay and log it in `TradeVenture/Strategy_Change_Log.md`.
- Python in `app/calc.py` is the source of truth for numbers; the JS calculators only preview.
- Run `~/.venvs/trading-journal/bin/python -m pytest tests` after changing calculations.
