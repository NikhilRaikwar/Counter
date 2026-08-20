from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncEngine

from app.config import Settings, get_settings
from app.db.session import create_engine, create_session_factory, verify_database
from app.errors import install_error_handlers
from app.api.offers import router as offers_router
from app.api.policies import router as policies_router
from app.api.deals import router as deals_router
from app.api.payments import router as payments_router
from app.ai.model import OpenRouterPolicyExtractor
from app.agents.graph import build_negotiation_graph
from app.agents.model import OpenRouterNegotiationModel
from app.payments.client import RazorpayPaymentLinksClient, UnconfiguredPaymentLinksClient


class HealthResponse(BaseModel):
    status: str
    database: str


def create_app(
    settings: Settings | None = None,
    policy_extractor: Any | None = None,
    negotiation_model: Any | None = None,
    payment_links_client: Any | None = None,
) -> FastAPI:
    resolved = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

        engine = create_engine(resolved.database_url)
        await verify_database(engine)
        app.state.db_engine = engine
        app.state.db_session_factory = create_session_factory(engine)
        app.state.policy_extractor = policy_extractor or OpenRouterPolicyExtractor(resolved)
        app.state.negotiation_model = negotiation_model or OpenRouterNegotiationModel(resolved)
        key_id = resolved.razorpay_key_id.get_secret_value() if resolved.razorpay_key_id else ""
        key_secret = (
            resolved.razorpay_key_secret.get_secret_value() if resolved.razorpay_key_secret else ""
        )
        app.state.payment_links_client = payment_links_client or (
            RazorpayPaymentLinksClient(key_id, key_secret)
            if key_id and key_secret
            else UnconfiguredPaymentLinksClient()
        )
        app.state.razorpay_webhook_secret = (
            resolved.razorpay_webhook_secret.get_secret_value()
            if resolved.razorpay_webhook_secret
            else ""
        )
        app.state.frontend_url = str(resolved.frontend_url).rstrip("/")
        checkpoint_path = resolved.langgraph_checkpoint_path
        if checkpoint_path == "./counter_graph.db" and resolved.database_url.startswith(
            "sqlite+aiosqlite:///"
        ):
            application_path = Path(resolved.database_url.removeprefix("sqlite+aiosqlite:///"))
            checkpoint_path = str(application_path.with_suffix(".graph.db"))
        async with AsyncSqliteSaver.from_conn_string(checkpoint_path) as checkpointer:
            app.state.negotiation_graph = build_negotiation_graph(checkpointer)
            yield
        await engine.dispose()

    app = FastAPI(title=resolved.app_name, version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "X-Counter-Management-Capability",
            "X-Counter-Deal-Capability",
        ],
    )
    install_error_handlers(app)
    app.include_router(offers_router)
    app.include_router(policies_router)
    app.include_router(deals_router)
    app.include_router(payments_router)

    @app.get("/health", response_model=HealthResponse, tags=["system"])
    async def health(request: Request) -> HealthResponse:
        engine: AsyncEngine = request.app.state.db_engine
        await verify_database(engine)
        return HealthResponse(status="healthy", database="reachable")

    return app


app = create_app()
