from __future__ import annotations

from dataclasses import dataclass

# USD per 1M tokens rate card for models
@dataclass(frozen=True)
class ModelPrice:
    input_usd_per_m: float
    output_usd_per_m: float


MODEL_PRICING: dict[str, ModelPrice] = {
    "openai/gpt-5.4-mini": ModelPrice(input_usd_per_m=0.15, output_usd_per_m=0.60),
    "openai/gpt-4o-mini": ModelPrice(input_usd_per_m=0.15, output_usd_per_m=0.60),
    "anthropic/claude-sonnet-4.6": ModelPrice(input_usd_per_m=3.00, output_usd_per_m=15.00),
    "anthropic/claude-3.5-sonnet": ModelPrice(input_usd_per_m=3.00, output_usd_per_m=15.00),
    "meta-llama/llama-3.3-70b-instruct": ModelPrice(input_usd_per_m=0.12, output_usd_per_m=0.30),
    "default": ModelPrice(input_usd_per_m=0.20, output_usd_per_m=0.80),
}

USD_TO_INR_RATE = 86.50


def calculate_token_cost(
    model: str,
    prompt_tokens: int | None,
    completion_tokens: int | None,
) -> dict[str, float | int]:
    """Calculate exact USD and INR token cost for a model invocation."""
    price = MODEL_PRICING.get(model, MODEL_PRICING["default"])
    p_tokens = prompt_tokens or 0
    c_tokens = completion_tokens or 0

    cost_usd = (p_tokens * price.input_usd_per_m / 1_000_000) + (
        c_tokens * price.output_usd_per_m / 1_000_000
    )
    cost_inr = cost_usd * USD_TO_INR_RATE
    cost_paise = round(cost_inr * 100, 2)

    return {
        "model": model,
        "prompt_tokens": p_tokens,
        "completion_tokens": c_tokens,
        "total_tokens": p_tokens + c_tokens,
        "cost_usd": round(cost_usd, 6),
        "cost_inr": round(cost_inr, 4),
        "cost_paise": cost_paise,
    }
