from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.config import Settings


def test_default_configuration_is_local_and_async() -> None:
    settings = Settings(_env_file=None)
    assert settings.database_url.startswith("sqlite+aiosqlite://")
    assert settings.cors_origins == ["http://localhost:8080"]
    assert "api_key" not in repr(settings).lower()


def test_sync_database_driver_is_rejected() -> None:
    with pytest.raises(ValidationError, match="async driver"):
        Settings(database_url="sqlite:///./counter.db", _env_file=None)


def test_invalid_frontend_url_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(frontend_url="not-a-url", _env_file=None)
