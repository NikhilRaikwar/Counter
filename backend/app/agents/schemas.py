from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StringConstraints,
    field_validator,
    model_validator,
)

NonBlank = Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1)]


class BuyerIntent(StrEnum):
    PRICE_OBJECTION = "price_objection"
    MAKE_OFFER = "make_offer"
    ASK_DISCOUNT = "ask_discount"
    ASK_CURRENT_OFFER = "ask_current_offer"
    ASK_PRODUCT_QUESTION = "ask_product_question"
    ASK_BUNDLE = "ask_bundle"
    ACCEPT_OFFER = "accept_offer"
    MAKE_FINAL_OFFER = "make_final_offer"
    REJECT = "reject"
    CLARIFY = "clarify"
    ADVERSARIAL = "adversarial"
    OTHER = "other"


class NegotiationStrategy(StrEnum):
    HOLD = "hold"
    PROBE_BUDGET = "probe_budget"
    VALUE_SELL = "value_sell"
    COUNTER = "counter"
    MATCH_BUYER = "match_buyer"
    OFFER_BUNDLE = "offer_bundle"
    CLARIFY = "clarify"
    CLOSE = "close"
    ACCEPT = "accept"
    REFUSE = "refuse"
    SUMMARIZE_TERMS = "summarize_terms"


class AgentAction(StrEnum):
    COUNTER = "counter"
    OFFER_BUNDLE = "offer_bundle"
    ACCEPT = "accept"
    REFUSE = "refuse"
    CLARIFY = "clarify"


class AgentDecision(BaseModel):
    """An untrusted model proposal. It never represents financial authority."""

    model_config = ConfigDict(extra="forbid", strict=True)

    intent: BuyerIntent = BuyerIntent.OTHER
    strategy: NegotiationStrategy = NegotiationStrategy.HOLD
    action: AgentAction
    proposed_amount_paise: Annotated[StrictInt, Field(gt=0, le=10_000_000_000)] | None = None
    bundle_id: Annotated[str, StringConstraints(strict=True, pattern=r"^[a-z0-9][a-z0-9_-]{0,119}$")] | None = None
    response_goal: Annotated[str, StringConstraints(max_length=500)] = ""
    message: str = Field(default="", max_length=2_000)
    reason_code: Annotated[str, StringConstraints(strict=True, pattern=r"^[a-z][a-z0-9_]{0,63}$")] | None = None

    @field_validator("action", mode="before")
    @classmethod
    def _parse_action(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return AgentAction(v)
            except ValueError:
                return v
        return v

    @field_validator("intent", mode="before")
    @classmethod
    def _parse_intent(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return BuyerIntent(v)
            except ValueError:
                return v
        return v

    @field_validator("strategy", mode="before")
    @classmethod
    def _parse_strategy(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return NegotiationStrategy(v)
            except ValueError:
                return v
        return v

    @model_validator(mode="after")
    def validate_action_fields(self) -> "AgentDecision":
        if self.action in {AgentAction.COUNTER, AgentAction.ACCEPT} and self.proposed_amount_paise is None:
            raise ValueError("counter and accept decisions require proposed_amount_paise")
        if self.action == AgentAction.OFFER_BUNDLE and (
            self.bundle_id is None or self.proposed_amount_paise is None
        ):
            raise ValueError("offer_bundle decisions require bundle_id and proposed_amount_paise")
        return self


class SafeOutcome(BaseModel):
    """Authoritative output of deterministic validation gates passed to response composition."""

    model_config = ConfigDict(extra="forbid", strict=True)

    action: AgentAction
    status: str
    validated_amount_paise: StrictInt | None = None
    validated_bundle_id: str | None = None
    bundle_name: str | None = None
    response_goal: str = ""
    buyer_intent: BuyerIntent = BuyerIntent.OTHER
    strategy: NegotiationStrategy = NegotiationStrategy.HOLD
    replan_count: int = 0
    validation_passed: bool = True
    violations: list[str] = Field(default_factory=list)
    public_allowlist_paise: list[StrictInt] = Field(default_factory=list)

    @field_validator("action", mode="before")
    @classmethod
    def _parse_action(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return AgentAction(v)
            except ValueError:
                return v
        return v

    @field_validator("buyer_intent", mode="before")
    @classmethod
    def _parse_intent(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return BuyerIntent(v)
            except ValueError:
                return v
        return v

    @field_validator("strategy", mode="before")
    @classmethod
    def _parse_strategy(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return NegotiationStrategy(v)
            except ValueError:
                return v
        return v


class ReplanFeedback(BaseModel):
    """Categorical, safe feedback provided to planner when a candidate violates gates."""

    model_config = ConfigDict(extra="forbid", strict=True)

    status: str
    reason: str
    seller_position: str
    current_public_offer_paise: StrictInt
    eligible_tactics: list[str] = Field(default_factory=list)
