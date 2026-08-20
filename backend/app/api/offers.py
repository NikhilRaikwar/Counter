from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session
from app.db.models import Offer, PolicyVersion
from app.domain.offers.schemas import (
    CapabilityResponse,
    MerchantOfferResponse,
    OfferCreate,
    OfferSummary,
    OfferUpdate,
    PolicyPublish,
    PrivatePolicyResponse,
    PublicOfferResponse,
    PublishResponse,
)
from app.domain.offers.service import OfferService
from app.domain.deals.schemas import MerchantDealDetailResponse, MerchantDealListResponse
from app.domain.deals.service import MerchantDealReadService

router = APIRouter(prefix="/api", tags=["offers"])
Session = Annotated[AsyncSession, Depends(get_db_session)]
Capability = Annotated[
    str | None,
    Header(
        alias="X-Counter-Management-Capability",
        description="High-entropy merchant capability returned once at draft creation.",
    ),
]


def offer_summary(offer: Offer) -> OfferSummary:
    return OfferSummary(
        id=offer.id,
        merchant_display_name=offer.merchant_name,
        product_name=offer.product_name,
        description=offer.description,
        image_url=offer.image_url,
        list_price_paise=offer.list_price_paise,
        currency=offer.currency,
        status=offer.status.value,
        public_slug=offer.public_slug,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
    )


def policy_response(policy: PolicyVersion) -> PrivatePolicyResponse:
    data = policy.policy_json
    return PrivatePolicyResponse(
        version=policy.version,
        currency=policy.currency,
        list_price_paise=policy.list_price_paise,
        floor_price_paise=policy.floor_price_paise,
        max_discount_paise=policy.max_discount_paise,
        max_rounds=policy.max_rounds,
        expiry_minutes=policy.expiry_minutes,
        allowed_bundles=data.get("allowed_bundles", []),
        allowed_actions=data.get("allowed_actions", []),
        forbidden_actions=data.get("forbidden_actions", []),
        original_rules_text=policy.raw_rules,
        concession_strategy=data.get("concession_strategy", {}),
        created_at=policy.created_at,
    )


@router.post("/offers", response_model=CapabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_offer(payload: OfferCreate, session: Session) -> CapabilityResponse:
    offer, capability = await OfferService(session).create_draft(payload)
    return CapabilityResponse(offer=offer_summary(offer), management_capability=capability)


@router.get("/offers/{offer_id}", response_model=MerchantOfferResponse)
async def get_merchant_offer(offer_id: str, session: Session, capability: Capability = None) -> MerchantOfferResponse:
    offer, policy = await OfferService(session).get_merchant_offer(offer_id, capability)
    return MerchantOfferResponse(
        offer=offer_summary(offer), current_policy=policy_response(policy) if policy else None
    )


@router.patch("/offers/{offer_id}", response_model=MerchantOfferResponse)
async def update_offer(
    offer_id: str, payload: OfferUpdate, session: Session, capability: Capability = None
) -> MerchantOfferResponse:
    offer = await OfferService(session).update_draft(offer_id, capability, payload)
    return MerchantOfferResponse(offer=offer_summary(offer), current_policy=None)


@router.post("/offers/{offer_id}/publish", response_model=PublishResponse)
async def publish_offer(
    offer_id: str, payload: PolicyPublish, session: Session, capability: Capability = None
) -> PublishResponse:
    offer, policy = await OfferService(session).publish(offer_id, capability, payload)
    return PublishResponse(
        offer=offer_summary(offer),
        policy=policy_response(policy),
        public_url_path=f"/d/{offer.public_slug}",
    )


@router.get("/public/offers/{slug}", response_model=PublicOfferResponse)
async def get_public_offer(slug: str, session: Session) -> PublicOfferResponse:
    offer = await OfferService(session).get_public_offer(slug)
    return PublicOfferResponse(
        slug=offer.public_slug or "",
        merchant_display_name=offer.merchant_name,
        product_name=offer.product_name,
        description=offer.description,
        image_url=offer.image_url,
        list_price_paise=offer.list_price_paise,
        currency=offer.currency,
        status="live",
    )


@router.get("/offers/{offer_id}/deals", response_model=MerchantDealListResponse)
async def list_merchant_deals(
    offer_id: str, session: Session, capability: Capability = None
) -> MerchantDealListResponse:
    return await MerchantDealReadService(session).list(offer_id, capability)


@router.get("/offers/{offer_id}/deals/{deal_id}", response_model=MerchantDealDetailResponse)
async def get_merchant_deal(
    offer_id: str, deal_id: str, session: Session, capability: Capability = None
) -> MerchantDealDetailResponse:
    return await MerchantDealReadService(session).detail(offer_id, deal_id, capability)
