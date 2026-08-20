from __future__ import annotations

import asyncio
from dataclasses import dataclass
from time import perf_counter
from typing import Any, Protocol

from pydantic import ValidationError

from app.config import Settings
from app.domain.policies.prompts import build_extraction_messages
from app.domain.policies.schemas import ExtractionModelOutput, TrustedOfferContext


class PolicyExtractionFailure(Exception):
    """A provider or structured-output failure. Never contains provider text."""


@dataclass(frozen=True, slots=True)
class ExtractionMetadata:
    model: str
    latency_ms: int
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    fallback_used: bool = False


@dataclass(frozen=True, slots=True)
class ModelExtraction:
    draft: ExtractionModelOutput
    metadata: ExtractionMetadata


class PolicyExtractor(Protocol):
    async def extract(self, offer: TrustedOfferContext, rules_text: str) -> ModelExtraction: ...


class OpenRouterPolicyExtractor:
    """Bounded ChatOpenAI adapter: primary twice, then fallback once."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def extract(self, offer: TrustedOfferContext, rules_text: str) -> ModelExtraction:
        if self.settings.openrouter_api_key is None:
            raise PolicyExtractionFailure("Policy extraction is unavailable")

        attempts = [
            (self.settings.openrouter_model, False),
            (self.settings.openrouter_model, False),
            (self.settings.openrouter_fallback_model, True),
        ]
        for model_name, fallback_used in attempts:
            try:
                return await self._attempt(model_name, fallback_used, offer, rules_text)
            except asyncio.CancelledError:
                raise
            except Exception:
                continue
        raise PolicyExtractionFailure("Policy extraction is unavailable")

    async def _attempt(
        self,
        model_name: str,
        fallback_used: bool,
        offer: TrustedOfferContext,
        rules_text: str,
    ) -> ModelExtraction:
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
            ExtractionModelOutput,
            method="json_schema",
            strict=True,
            include_raw=True,
        )
        started = perf_counter()
        result: Any = await structured.ainvoke(build_extraction_messages(offer, rules_text))
        parsed = result.get("parsed") if isinstance(result, dict) else None
        if not isinstance(parsed, ExtractionModelOutput):
            error = result.get("parsing_error") if isinstance(result, dict) else None
            if isinstance(error, ValidationError):
                raise error
            raise PolicyExtractionFailure("Invalid structured model response")
        raw = result.get("raw") if isinstance(result, dict) else None
        usage = getattr(raw, "usage_metadata", None) or {}
        return ModelExtraction(
            draft=parsed,
            metadata=ExtractionMetadata(
                model=model_name,
                latency_ms=round((perf_counter() - started) * 1000),
                prompt_tokens=usage.get("input_tokens"),
                completion_tokens=usage.get("output_tokens"),
                total_tokens=usage.get("total_tokens"),
                fallback_used=fallback_used,
            ),
        )
