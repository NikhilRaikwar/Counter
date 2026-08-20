from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StringConstraints

NonBlank = Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1)]
Money = Annotated[StrictInt, Field(ge=0, le=10_000_000_000)]


class StrictPolicySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PolicyAction(StrEnum):
    NEGOTIATE_PRICE = "negotiate_price"
    OFFER_BUNDLE = "offer_bundle"
    ACCEPT_DEAL = "accept_deal"
    CREATE_CHECKOUT = "create_checkout"


class ForbiddenAction(StrEnum):
    INVENT_BUNDLE = "invent_bundle"
    CHANGE_PRODUCT_SCOPE = "change_product_scope"


class ExtractedBundle(StrictPolicySchema):
    name: NonBlank = Field(max_length=160)
    additional_cost_paise: Money = 0
    description: str | None = Field(default=None, max_length=500)


class ExtractionModelOutput(StrictPolicySchema):
    floor_price_paise: Money | None = None
    max_discount_paise: Money | None = None
    max_rounds: Annotated[StrictInt, Field(ge=1, le=10)] | None = None
    expiry_minutes: Annotated[StrictInt, Field(ge=5, le=1440)] | None = None
    allowed_bundles: list[ExtractedBundle] = Field(default_factory=list, max_length=25)
    allowed_actions: list[PolicyAction] = Field(default_factory=list, max_length=4)
    forbidden_actions: list[ForbiddenAction] = Field(default_factory=list, max_length=2)
    missing_fields: list[NonBlank] = Field(default_factory=list, max_length=20)
    warnings: list[NonBlank] = Field(default_factory=list, max_length=20)


class PolicyDraftRequest(StrictPolicySchema):
    rules_text: NonBlank = Field(max_length=10_000)


class TrustedOfferContext(StrictPolicySchema):
    product_name: str
    description: str
    list_price_paise: int
    currency: Literal["INR"]
    status: str


class DraftOfferResponse(StrictPolicySchema):
    product_name: str
    list_price_paise: int
    currency: Literal["INR"]


class PolicyConflict(StrictPolicySchema):
    code: str
    message: str


class PolicyDraftResponse(StrictPolicySchema):
    status: Literal["review_required", "conflict"]
    offer: DraftOfferResponse
    draft: ExtractionModelOutput
    conflicts: list[PolicyConflict]
    warnings: list[str]
    missing_fields: list[str]
