import shutil
import sqlite3
from datetime import datetime

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS scalp_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_no TEXT UNIQUE,
  account TEXT DEFAULT 'paper',      -- paper | live
  date TEXT, ticker TEXT, day_seq INTEGER,
  entry_time TEXT, exit_time TEXT,
  entry_price REAL, shares REAL, stop REAL, planned_risk REAL,
  exits_text TEXT, avg_exit REAL,
  commission REAL, gross_pnl REAL, net_pnl REAL, r_multiple REAL,
  category TEXT, setup TEXT,
  setup_valid TEXT, entry_valid TEXT, exit_valid TEXT,
  violations TEXT, emotions TEXT,
  entry_order TEXT, exit_order TEXT,
  orders_text TEXT, notes TEXT,
  tally_2candle TEXT,                -- success | fail | contaminated | '' (not scored) - Setup A/B only
  legacy_json TEXT,
  created_at TEXT, updated_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_scalp_date ON scalp_trades(date);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,                -- options | swing
  account TEXT DEFAULT 'paper',      -- paper | live
  ticker TEXT, direction TEXT, status TEXT DEFAULT 'planned',
  plan_date TEXT, thesis TEXT,
  strike REAL, expiry TEXT, delta REAL, bid_ask_spread REAL, volume REAL, open_interest REAL,
  underlying_entry REAL, underlying_stop REAL, underlying_target REAL,
  entry_price REAL, stop_price REAL, target_price REAL, qty REAL,
  account_balance REAL, risk_pct REAL,
  checklist TEXT,
  investment REAL, planned_loss REAL, potential_profit REAL, rr REAL,
  entry_date TEXT, exit_date TEXT, actual_entry REAL, actual_exit REAL, fees REAL,
  exit_reason TEXT, exit_scenario TEXT, entry_followed TEXT, exit_followed TEXT,
  realized_pl REAL, roi REAL, realized_r REAL,
  orders_text TEXT, notes TEXT,
  created_at TEXT, updated_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_plans_kind ON plans(kind, status);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT, ref_id INTEGER, filename TEXT, created_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_att ON attachments(kind, ref_id);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT, ref_id INTEGER, model TEXT, text TEXT, proposed_json TEXT, created_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_rev ON reviews(kind, ref_id);
"""


def now():
    return datetime.now().isoformat(timespec="seconds")


def connect():
    """The file lives in a cloud-synced folder, so use rollback-journal mode.

    WAL would add -wal/-shm side files that sync tools copy out of step with the
    main file, which corrupts the database. The machine lock keeps writers to one.
    """
    conn = sqlite3.connect(config.DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=DELETE")
    conn.execute("PRAGMA synchronous=FULL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init():
    config.DATA.mkdir(parents=True, exist_ok=True)
    config.SHOTS.mkdir(parents=True, exist_ok=True)
    with connect() as c:
        c.executescript(SCHEMA)
        for table in ("scalp_trades", "plans"):  # databases created before the paper/live field
            if "account" not in [r["name"] for r in c.execute("PRAGMA table_info(%s)" % table)]:
                c.execute("ALTER TABLE %s ADD COLUMN account TEXT DEFAULT 'paper'" % table)
        if "proposed_json" not in [r["name"] for r in c.execute("PRAGMA table_info(reviews)")]:
            c.execute("ALTER TABLE reviews ADD COLUMN proposed_json TEXT")
        if "tally_2candle" not in [r["name"] for r in c.execute("PRAGMA table_info(scalp_trades)")]:
            c.execute("ALTER TABLE scalp_trades ADD COLUMN tally_2candle TEXT")
        for k, v in config.DEFAULT_SETTINGS.items():
            c.execute("INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)", (k, v))


def settings(conn):
    return {r["key"]: r["value"] for r in conn.execute("SELECT key, value FROM settings")}


def backup(keep=14):
    """One consistent copy per day, taken with SQLite's online backup API."""
    if not config.DB_PATH.exists():
        return None
    config.BACKUPS.mkdir(exist_ok=True)
    dest = config.BACKUPS / ("journal-%s.db" % datetime.now().strftime("%Y%m%d"))
    if dest.exists():
        return dest
    src, dst = connect(), sqlite3.connect(dest)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    for old in sorted(config.BACKUPS.glob("journal-*.db"))[:-keep]:
        old.unlink()
    return dest


def purge_shots(kind, ref_id, conn):
    for r in conn.execute("SELECT filename FROM attachments WHERE kind=? AND ref_id=?", (kind, ref_id)):
        (config.SHOTS / r["filename"]).unlink(missing_ok=True)
    conn.execute("DELETE FROM attachments WHERE kind=? AND ref_id=?", (kind, ref_id))
    conn.execute("DELETE FROM reviews WHERE kind=? AND ref_id=?", (kind, ref_id))


__all__ = ["connect", "init", "settings", "backup", "now", "purge_shots", "shutil"]
