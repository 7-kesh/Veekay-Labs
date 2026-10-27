# Trading Journal

A local web app for logging trades: Scalp, Options, Swing (Futures coming soon). Part of Veekay Labs.

## Run
- Double-click `Trading-Journal.command`, or run `./run.sh`. It opens http://127.0.0.1:5057.
- The first run on each machine builds its own Python environment in `~/.venvs/trading-journal` (outside the synced folder).

## Data
- `data/journal.db` (SQLite, rollback-journal mode) and `data/screenshots/` sync with this folder. Neither is in git.
- Run it on **one machine at a time**. A heartbeat lock in `data/.lock` makes the second machine refuse to start.
  `./run.sh --force` overrides it after a crash. Wait for the cloud sync to finish before switching machines.
- Daily backups: `data/backups/` (last 14).

## Claude review
- The hosted app makes no Claude calls: use "Export for AI-Assist-Review" and review in a Claude chat. (The old local Flask app's key lives in `~/.trading-journal.env`.)
- Reviews grade against `rules/scalp.md`, `rules/options.md`, `rules/swing.md`. Edit those when the strategy changes.

## Dev
- `~/.venvs/trading-journal/bin/python -m pytest tests`
- `python -m app.importer [path]` imports `TradeVenture/Trade_Log.csv` (idempotent).
- One-tap lists (violations, emotions, checklists, categories) are in `app/config.py`.
