#!/bin/bash
# Start the Trading Journal. The Python environment lives outside the synced folder, one per machine.
set -e
cd "$(dirname "$0")"
VENV="$HOME/.venvs/trading-journal"
if [ ! -x "$VENV/bin/python" ]; then
  echo "First run on this machine: creating the Python environment..."
  python3 -m venv "$VENV"
fi
"$VENV/bin/pip" install -q -r requirements.txt
(sleep 1.5; open "http://127.0.0.1:5057") &
exec "$VENV/bin/python" run.py "$@"
