from __future__ import annotations

import asyncio
from dataclasses import dataclass
from time import perf_counter
from typing import Any, Protocol

from app.agents.prompts import NegotiationContext, build_negotiation_messages
from app.agents.schemas import AgentDecision
from app.config import Settings


class NegotiationFailure(Exception):
    """Sanitized provider/structured-output failure marker."""


@dataclass(frozen=True, slots=True)
class NegotiationMetadata:
    model: str
    latency_ms: int
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    fallback_used: bool = False


@dataclass(frozen=True, slots=True)
class NegotiationProposal:
    decision: AgentDecision
    metadata: NegotiationMetadata


class NegotiationModel(Protocol):
    async def propose(self, context: NegotiationContext) -> NegotiationProposal: ...


class OpenRouterNegotiationModel:
    """No-tool adapter with two primary attempts and one fallback attempt."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def propose(self, context: NegotiationContext) -> NegotiationProposal:
        if self.settings.openrouter_api_key is None:
            raise NegotiationFailure("Negotiation model is unavailable")
        attempts = [
            (self.settings.openrouter_model, False),
            (self.settings.openrouter_model, False),
            (self.settings.openrouter_fallback_model, True),
        ]
        for model_name, fallback_used in attempts:
            try:
                return await self._attempt(model_name, fallback_used, context)
            except asyncio.CancelledError:
                raise
            except Exception:
                continue
        raise NegotiationFailure("Negotiation model is unavailable")

    async def _attempt(
        self, model_name: str, fallback_used: bool, context: NegotiationContext
    ) -> NegotiationProposal:
        from langchain_openai import ChatOpenAI

        model = ChatOpenAI(
            model=model_name,
            api_key=self.settings.openrouter_api_key.get_secret_value(),
            base_url=str(self.settings.openrouter_base_url).rstrip("/"),
            timeout=self.settings.openrouter_timeout_seconds,
            max_retries=0,
            temperature=0,
        )
        structured = model.with_structured_output(
            AgentDecision, method="json_schema", strict=True, include_raw=True
        )
        started = perf_counter()
        result: Any = await structured.ainvoke(build_negotiation_messages(context))
        parsed = result.get("parsed") if isinstance(result, dict) else None
        if not isinstance(parsed, AgentDecision):
            raise NegotiationFailure("Invalid structured negotiation response")
        raw = result.get("raw") if isinstance(result, dict) else None
        usage = getattr(raw, "usage_metadata", None) or {}
        return NegotiationProposal(
            decision=parsed,
            metadata=NegotiationMetadata(
                model=model_name,
                latency_ms=round((perf_counter() - started) * 1000),
                prompt_tokens=usage.get("input_tokens"),
                completion_tokens=usage.get("output_tokens"),
                total_tokens=usage.get("total_tokens"),
                fallback_used=fallback_used,
            ),
        )
