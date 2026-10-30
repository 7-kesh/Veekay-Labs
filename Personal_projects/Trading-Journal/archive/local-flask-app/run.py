"""Start the journal on this machine: python run.py [--force]"""
import atexit
import signal
import sys

from app import config, create_app, db, lock

if __name__ == "__main__":
    config.DATA.mkdir(parents=True, exist_ok=True)
    other = lock.acquire(force="--force" in sys.argv)
    if other:
        print("\nThe journal is already running on %s (pid %s)." % (other.get("host"), other.get("pid")))
        print("Only one machine should write to the database at a time. Close it there first,")
        print("or start with --force if you are sure it is not running (it may just have crashed).\n")
        sys.exit(2)
    atexit.register(lock.release)
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))  # run atexit so the lock is released
    app = create_app()
    db.backup()
    print("Trading Journal on http://127.0.0.1:%d  (Ctrl+C to stop)" % config.PORT)
    app.run(host="127.0.0.1", port=config.PORT, debug=False)
