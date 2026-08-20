# Backend Dependency Plan

Phase 1 resolved and locked the environment on 2026-08-20 in `backend/requirements.lock`: FastAPI 0.141.1, Uvicorn 0.52.4, Pydantic 2.13.4, pydantic-settings 2.15.0, SQLAlchemy 2.0.52, aiosqlite 0.22.1, Alembic 1.19.1, pytest 9.1.1, pytest-asyncio 1.4.0, and httpx 0.28.1. `backend/pyproject.toml` retains compatible bounded ranges while the lock provides exact reproducibility.

Pin compatible minor lines in a backend lock file after Phase 1 verifies current releases; do not install in Phase 0.

| Package | Proposed constraint | Purpose |
|---|---|---|
| `fastapi` | `>=0.116,<1` | Typed async HTTP API, dependencies, lifespan, raw requests |
| `uvicorn[standard]` | `>=0.35,<1` | ASGI development/runtime server |
| `pydantic` | `>=2.11,<3` | Strict domain/input/output schemas |
| `pydantic-settings` | `>=2.10,<3` | Environment configuration |
| `langchain` | `>=1.1,<2` | Model abstractions/structured output where useful |
| `langgraph` | `>=1.1,<2` | Explicit negotiation graph |
| `langgraph-checkpoint-sqlite` | compatible with LangGraph | Async SQLite checkpointer in development |
| `langchain-openai` | current LangChain-compatible | OpenAI-compatible `ChatOpenAI` pointed at OpenRouter |
| `httpx` | `>=0.28,<1` | Razorpay and internal async HTTP client |
| `sqlalchemy[asyncio]` | `>=2.0,<3` | Durable application entities and transactions |
| `aiosqlite` | `>=0.21,<1` | Development SQLite driver |
| `alembic` | `>=1.16,<2` | Schema migrations |
| `python-dotenv` | `>=1.1,<2` | Optional local environment loading |
| `sse-starlette` | `>=2.4,<4` | SSE only if Phase 6 proves event streaming is needed |
| `pytest`, `pytest-asyncio` | current compatible majors | Unit/integration/adversarial tests |
| `respx` | current compatible major | Mock `httpx` at the Razorpay boundary |

No separate `langchain-openrouter` package is required: OpenRouter exposes an OpenAI-compatible API, so `ChatOpenAI(base_url="https://openrouter.ai/api/v1", api_key=...)` is the smaller integration. Use `extra_body`/headers for OpenRouter routing and attribution parameters as supported.

For production later, add an async Postgres driver and `langgraph-checkpoint-postgres`; do not add them to the first SQLite-only slice. No vector database or embedding dependency is justified for MVP.
