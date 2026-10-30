"""Single-user login gate. Credentials (hashed) live in the per-machine env file,
the same place the Anthropic API key lives, never in the synced data folder.
"""
import secrets

from flask import redirect, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from . import config

PUBLIC_ENDPOINTS = {"main.login_view", "static"}


def secret_key():
    key = config.env_get("TJ_SECRET_KEY")
    if not key:
        key = secrets.token_hex(32)
        config.env_set("TJ_SECRET_KEY", key)
    return key


def configured():
    return bool(config.env_get("TJ_LOGIN_EMAIL") and config.env_get("TJ_LOGIN_PASSWORD_HASH"))


def check(email, password):
    stored_email = (config.env_get("TJ_LOGIN_EMAIL") or "").strip().lower()
    stored_hash = config.env_get("TJ_LOGIN_PASSWORD_HASH") or ""
    return bool(stored_hash) and email.strip().lower() == stored_email and check_password_hash(stored_hash, password)


def set_credentials(email, password):
    # pbkdf2, not werkzeug's scrypt default: this machine's Python 3.9 hashlib has no scrypt support.
    config.env_set("TJ_LOGIN_EMAIL", email.strip())
    config.env_set("TJ_LOGIN_PASSWORD_HASH", generate_password_hash(password, method="pbkdf2:sha256"))


def require_login():
    if request.endpoint in PUBLIC_ENDPOINTS or request.endpoint is None:
        return None
    if not configured():
        return None if request.endpoint == "main.login_view" else redirect(url_for("main.login_view"))
    if not session.get("authed"):
        return redirect(url_for("main.login_view", next=request.path))
    return None
