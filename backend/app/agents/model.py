from __future__ import annotations

import asyncio
from dataclasses import dataclass
from time import perf_counter
from typing import Any, Protocol

from app.agents.prompts import (
    NegotiationContext,
    build_composer_messages,
    build_planner_messages,
)
from app.agents.schemas import AgentDecision, SafeOutcome
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
    async def compose(self, context: NegotiationContext, safe_outcome: SafeOutcome) -> str: ...


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
        return await self._attempt_proposal(model_name, fallback_used, context)

    async def compose(self, context: NegotiationContext, safe_outcome: SafeOutcome) -> str:
        if self.settings.openrouter_api_key is None:
            raise NegotiationFailure("Negotiation model is unavailable")
        attempts = [
            (self.settings.openrouter_model, False),
            (self.settings.openrouter_fallback_model, True),
        ]
        for model_name, _ in attempts:
            try:
                return await self._attempt_composition(model_name, context, safe_outcome)
            except asyncio.CancelledError:
                raise
            except Exception:
                continue
        raise NegotiationFailure("Negotiation composer is unavailable")

    async def _attempt_proposal(
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
        result: Any = await structured.ainvoke(build_planner_messages(context))
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

    async def _attempt_composition(
        self, model_name: str, context: NegotiationContext, safe_outcome: SafeOutcome
    ) -> str:
        from langchain_openai import ChatOpenAI

        model = ChatOpenAI(
            model=model_name,
            api_key=self.settings.openrouter_api_key.get_secret_value(),
            base_url=str(self.settings.openrouter_base_url).rstrip("/"),
            timeout=self.settings.openrouter_timeout_seconds,
            max_retries=0,
            temperature=0.3,
        )
        response = await model.ainvoke(build_composer_messages(context, safe_outcome))
        content = getattr(response, "content", "")
        if isinstance(content, str) and content.strip():
            return content.strip()
        if isinstance(content, list):
            joined = " ".join(item.get("text", "") for item in content if isinstance(item, dict))
            if joined.strip():
                return joined.strip()
        raise NegotiationFailure("Empty response from composer model")
