"""One writer at a time across machines.

The folder syncs to the cloud, so a second machine could open the same database
while the first has it open. A heartbeat lock file in the data folder stops that.
It is advisory: it protects against forgetting, not against a deliberate override.
"""
import json
import os
import socket
import threading
import time

from . import config

STALE_AFTER = 120  # seconds without a heartbeat before a lock is treated as dead
BEAT = 20
HOST = socket.gethostname()


def _read():
    try:
        return json.loads(config.LOCK_PATH.read_text())
    except (OSError, ValueError):
        return None


def _pid_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def holder():
    """The other machine/process holding the lock, or None if we may take it."""
    cur = _read()
    if not cur:
        return None
    if cur.get("host") == HOST:
        return cur if _pid_alive(cur.get("pid", -1)) and cur.get("pid") != os.getpid() else None
    fresh = time.time() - cur.get("beat", 0) < STALE_AFTER
    return cur if fresh else None


def _write():
    config.LOCK_PATH.write_text(json.dumps({"host": HOST, "pid": os.getpid(), "beat": time.time()}))


def acquire(force=False):
    other = holder()
    if other and not force:
        return other
    _write()

    def loop():
        while True:
            time.sleep(BEAT)
            cur = _read()
            if cur and (cur.get("host"), cur.get("pid")) != (HOST, os.getpid()):
                os._exit(3)  # another instance took over: stop writing at once
            _write()

    threading.Thread(target=loop, daemon=True).start()
    return None


def release():
    cur = _read()
    if cur and (cur.get("host"), cur.get("pid")) == (HOST, os.getpid()):
        config.LOCK_PATH.unlink(missing_ok=True)
