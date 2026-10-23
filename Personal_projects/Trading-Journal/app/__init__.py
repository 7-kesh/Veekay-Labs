from flask import Flask

from . import auth, config, db, strategy


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024
    app.secret_key = auth.secret_key()  # persisted per machine, now signs real login sessions too
    db.init()
    with db.connect() as c:
        strategy.seed_if_empty(c)
    from .routes import bp
    app.register_blueprint(bp)
    app.before_request(auth.require_login)
    return app
