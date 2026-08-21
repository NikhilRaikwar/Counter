# Counter Backend

FastAPI backend for Counter's bounded AI negotiation and payment authorization pipeline.

## Core Modules
- **Policy Extraction:** Structured extraction of commercial limits from plain English merchant rules.
- **LangGraph Negotiation:** Multi-step cognitive loop (Observe → Plan → Gate Check → Replan → Compose).
- **Deterministic Strategy Gate:** Merchant-controlled concession curves and step-size governance.
- **Deterministic Financial Policy Gate:** Immutable floor price, list price, max discount, and round checks.
- **Transactional Agreement Locking:** SQLite/Postgres atomic agreement state machine.
- **Razorpay Payment Links:** Server-side Test Mode payment link creation bound to locked agreements.
- **Signed Webhook Verification:** HMAC-SHA256 signature verification establishing canonical payment truth.

## Reproducible Local Setup

From `backend/` with Python 3.11+:

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.lock
.venv/Scripts/python -m pip install -e . --no-deps
.venv/Scripts/python -m alembic upgrade head
```

Run test suite & API:

```bash
.venv/Scripts/python -m pytest
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

See root [README.md](../README.md) and [/docs](https://counter.nikhilraikwar.me/docs) for full system architecture.
