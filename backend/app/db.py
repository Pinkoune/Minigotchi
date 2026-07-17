"""Database setup: SQLite by default (zero config), Postgres via DATABASE_URL.

The business code only uses SQLAlchemy Core against the `saves` table, so
switching engines is purely an environment concern.
"""

from __future__ import annotations

import os

from sqlalchemy import Engine, create_engine

from .models import metadata

_engine: Engine | None = None


def database_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite:///./minigotchi.db")


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = database_url()
        kwargs: dict = {}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
        _engine = create_engine(url, **kwargs)
        metadata.create_all(_engine)
    return _engine


def reset_engine() -> None:
    """Testing hook: force re-reading DATABASE_URL."""
    global _engine
    if _engine is not None:
        _engine.dispose()
    _engine = None
