# Counter Backend

Phase 1 provides the FastAPI application, configuration, async SQLite foundation, and initial Alembic schema. It intentionally contains no negotiation, LangGraph, or Razorpay business integration.

## Reproducible setup

From `backend/` with Python 3.11+:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.lock
.venv\Scripts\python.exe -m pip install -e . --no-deps
.venv\Scripts\python.exe -m alembic upgrade head
```

Run tests and API:

```powershell
.venv\Scripts\python.exe -m pytest
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

`GET http://127.0.0.1:8000/health` checks application startup and database reachability. Copy `.env.example` to `.env` for local configuration; never commit `.env`.
