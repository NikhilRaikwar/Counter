from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import Settings
from app.errors import ApplicationError
from app.main import create_app


def test_startup_and_health(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{(tmp_path / 'health.db').as_posix()}"
    app = create_app(Settings(database_url=database_url, _env_file=None))
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "reachable"}


def test_cors_allows_only_configured_frontend(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{(tmp_path / 'cors.db').as_posix()}"
    app = create_app(Settings(database_url=database_url, _env_file=None))
    with TestClient(app) as client:
        allowed = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:8080",
                "Access-Control-Request-Method": "GET",
            },
        )
        rejected = client.options(
            "/health",
            headers={
                "Origin": "https://evil.example",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:8080"
    assert "access-control-allow-origin" not in rejected.headers


def test_application_errors_have_stable_structure(tmp_path) -> None:
    database_url = f"sqlite+aiosqlite:///{(tmp_path / 'errors.db').as_posix()}"
    app = create_app(Settings(database_url=database_url, _env_file=None))

    @app.get("/_test/error")
    async def raise_error() -> None:
        raise ApplicationError(code="test_error", message="Safe public message", status_code=409)

    with TestClient(app) as client:
        response = client.get("/_test/error")

    assert response.status_code == 409
    assert response.json() == {
        "error": {"code": "test_error", "message": "Safe public message"}
    }
