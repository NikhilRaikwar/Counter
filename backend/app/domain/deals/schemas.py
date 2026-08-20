from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StringConstraints


class StrictDealSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DealCreateResponse(StrictDealSchema):
    deal_capability: str = Field(repr=False)
    deal_status: Literal["negotiating"] = "negotiating"


class BuyerMessageRequest(StrictDealSchema):
    message: Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=10_000)]
    client_message_id: Annotated[
        str, StringConstraints(strict=True, pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$")
    ]


class BuyerSafeMessage(StrictDealSchema):
    role: Literal["counter"] = "counter"
    content: str


class BuyerSafeCandidate(StrictDealSchema):
    action: Literal["counter", "offer_bundle", "accept", "refuse", "clarify"]
    amount_paise: StrictInt | None = None
    bundle_id: str | None = None
    validation_status: Literal["passed", "failed"]


class PrivateCandidateValidation(StrictDealSchema):
    """Merchant-inspector-ready DTO; never used by a public buyer route."""

    action: Literal["counter", "offer_bundle", "accept", "refuse", "clarify"]
    amount_paise: StrictInt | None = None
    bundle_id: str | None = None
    validation_status: Literal["passed", "failed"]
    violation_codes: list[str] = Field(default_factory=list)
    agreement_created: bool


class BuyerTurnResponse(StrictDealSchema):
    deal_status: Literal["negotiating", "agreed", "refused_candidate"]
    round: int
    message: BuyerSafeMessage
    candidate: BuyerSafeCandidate


class MerchantDealSummary(StrictDealSchema):
    id: str
    status: str
    current_round: int
    candidate_action: str | None
    candidate_amount_paise: StrictInt | None
    candidate_bundle_id: str | None
    candidate_validation_status: str | None
    candidate_violation_codes: list[str]
    accepted_amount_paise: StrictInt | None
    accepted_currency: str | None
    accepted_bundle_id: str | None
    agreement_locked_at: datetime | None
    created_at: datetime
    updated_at: datetime


class MerchantDealMessage(StrictDealSchema):
    id: str
    sequence: int
    sender: str
    text: str
    metadata: dict[str, Any]
    created_at: datetime


class MerchantDealListResponse(StrictDealSchema):
    deals: list[MerchantDealSummary]


class MerchantDealDetailResponse(StrictDealSchema):
    deal: MerchantDealSummary
    messages: list[MerchantDealMessage]
