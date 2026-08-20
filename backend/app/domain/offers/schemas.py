from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, StringConstraints, model_validator
from app.domain.policies.schemas import ConcessionStrategy

Currency = Literal["INR"]
NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class OfferCreate(StrictSchema):
    merchant_display_name: NonBlank = Field(max_length=160)
    product_name: NonBlank = Field(max_length=240)
    description: NonBlank = Field(max_length=10_000)
    image_url: AnyHttpUrl | None = None
    list_price_paise: int = Field(gt=0, le=10_000_000_000)
    currency: Currency = "INR"


class OfferUpdate(StrictSchema):
    merchant_display_name: NonBlank | None = Field(default=None, max_length=160)
    product_name: NonBlank | None = Field(default=None, max_length=240)
    description: NonBlank | None = Field(default=None, max_length=10_000)
    image_url: AnyHttpUrl | None = None
    list_price_paise: int | None = Field(default=None, gt=0, le=10_000_000_000)
    currency: Currency | None = None

    @model_validator(mode="after")
    def require_change(self) -> "OfferUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field must be supplied")
        return self


class AllowedBundle(StrictSchema):
    id: Annotated[str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9_-]{0,63}$")]
    name: NonBlank = Field(max_length=160)
    additional_cost_paise: int = Field(ge=0, le=10_000_000_000)


class PolicyPublish(StrictSchema):
    currency: Currency = "INR"
    floor_price_paise: int = Field(ge=0, le=10_000_000_000)
    max_discount_paise: int = Field(ge=0, le=10_000_000_000)
    max_rounds: int = Field(ge=1, le=10)
    expiry_minutes: int = Field(ge=5, le=1440)
    allowed_bundles: list[AllowedBundle] = Field(default_factory=list, max_length=25)
    allowed_actions: list[Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]{0,63}$")]] = Field(
        default_factory=list, max_length=25
    )
    forbidden_actions: list[Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]{0,63}$")]] = Field(
        default_factory=list, max_length=25
    )
    original_rules_text: str = Field(default="", max_length=10_000)
    concession_strategy: ConcessionStrategy | None = None

    @model_validator(mode="after")
    def unique_policy_entries(self) -> "PolicyPublish":
        bundle_ids = [bundle.id for bundle in self.allowed_bundles]
        if len(bundle_ids) != len(set(bundle_ids)):
            raise ValueError("allowed_bundles IDs must be unique")
        if len(self.allowed_actions) != len(set(self.allowed_actions)):
            raise ValueError("allowed_actions must be unique")
        if len(self.forbidden_actions) != len(set(self.forbidden_actions)):
            raise ValueError("forbidden_actions must be unique")
        if set(self.allowed_actions) & set(self.forbidden_actions):
            raise ValueError("An action cannot be both allowed and forbidden")
        return self


class OfferSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    merchant_display_name: str
    product_name: str
    description: str
    image_url: str | None
    list_price_paise: int
    currency: str
    status: str
    public_slug: str | None
    created_at: datetime
    updated_at: datetime


class CapabilityResponse(StrictSchema):
    offer: OfferSummary
    management_capability: str = Field(repr=False)


class PrivatePolicyResponse(BaseModel):
    version: int
    currency: str
    list_price_paise: int
    floor_price_paise: int
    max_discount_paise: int
    max_rounds: int
    expiry_minutes: int
    allowed_bundles: list[AllowedBundle]
    allowed_actions: list[str]
    forbidden_actions: list[str]
    original_rules_text: str
    concession_strategy: ConcessionStrategy
    created_at: datetime


class MerchantOfferResponse(StrictSchema):
    offer: OfferSummary
    current_policy: PrivatePolicyResponse | None


class PublishResponse(StrictSchema):
    offer: OfferSummary
    policy: PrivatePolicyResponse
    public_url_path: str


class PublicOfferResponse(StrictSchema):
    slug: str
    merchant_display_name: str
    product_name: str
    description: str
    image_url: str | None
    list_price_paise: int
    currency: str
    status: Literal["live"]
