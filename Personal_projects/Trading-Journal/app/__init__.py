from flask import Flask

from . import config, db


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024
    app.secret_key = "local-only"  # flash messages only; the server binds to 127.0.0.1
    db.init()
    from .routes import bp
    app.register_blueprint(bp)
    return app
