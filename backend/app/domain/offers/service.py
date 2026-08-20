from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Offer, OfferStatus, PolicyVersion
from app.domain.offers.repository import OfferRepository
from app.domain.offers.schemas import OfferCreate, OfferUpdate, PolicyPublish
from app.domain.offers.security import (
    generate_management_capability,
    hash_management_capability,
    verify_management_capability,
)
from app.domain.offers.slug import generate_public_slug
from app.errors import ApplicationError


class OfferService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = OfferRepository(session)

    async def create_draft(self, payload: OfferCreate) -> tuple[Offer, str]:
        capability = generate_management_capability()
        offer = Offer(
            public_slug=None,
            management_capability_hash=hash_management_capability(capability),
            merchant_name=payload.merchant_display_name,
            product_name=payload.product_name,
            description=payload.description,
            image_url=str(payload.image_url) if payload.image_url else None,
            list_price_paise=payload.list_price_paise,
            currency=payload.currency,
            status=OfferStatus.DRAFT,
        )
        async with self.session.begin():
            await self.repository.add(offer)
        return offer, capability

    async def get_merchant_offer(self, offer_id: str, capability: str | None) -> tuple[Offer, PolicyVersion | None]:
        offer = await self.repository.get(offer_id)
        self._authorize(offer, capability)
        return offer, await self.repository.current_policy(offer_id)

    async def update_draft(self, offer_id: str, capability: str | None, payload: OfferUpdate) -> Offer:
        async with self.session.begin():
            offer = await self.repository.get(offer_id)
            self._authorize(offer, capability)
            if offer.status != OfferStatus.DRAFT:
                raise ApplicationError("offer_not_editable", "Only draft offers can be edited", 409)
            updates = payload.model_dump(exclude_unset=True)
            if "merchant_display_name" in updates:
                offer.merchant_name = updates.pop("merchant_display_name")
            if "image_url" in updates and updates["image_url"] is not None:
                updates["image_url"] = str(updates["image_url"])
            for field, value in updates.items():
                setattr(offer, field, value)
            await self.session.flush()
            await self.session.refresh(offer)
        return offer

    async def publish(
        self, offer_id: str, capability: str | None, payload: PolicyPublish
    ) -> tuple[Offer, PolicyVersion]:
        try:
            await self.session.execute(text("BEGIN IMMEDIATE"))
            offer = await self.repository.get(offer_id)
            self._authorize(offer, capability)
            current = await self.repository.current_policy(offer_id)
            if offer.status == OfferStatus.LIVE:
                if current and self._policy_matches(current, payload, offer):
                    await self.session.commit()
                    return offer, current
                raise ApplicationError("offer_already_live", "Offer is already published", 409)
            if offer.status != OfferStatus.DRAFT:
                raise ApplicationError("offer_not_publishable", "Offer cannot be published", 409)
            self._validate_policy(offer, payload)
            if offer.public_slug is None:
                offer.public_slug = await self._unique_slug(offer.product_name)
            policy = PolicyVersion(
                offer_id=offer.id,
                version=1 if current is None else current.version + 1,
                list_price_paise=offer.list_price_paise,
                floor_price_paise=payload.floor_price_paise,
                max_discount_paise=payload.max_discount_paise,
                max_rounds=payload.max_rounds,
                expiry_minutes=payload.expiry_minutes,
                currency=payload.currency,
                raw_rules=payload.original_rules_text,
                policy_json={
                    "allowed_bundles": [bundle.model_dump() for bundle in payload.allowed_bundles],
                    "allowed_actions": payload.allowed_actions,
                    "forbidden_actions": payload.forbidden_actions,
                },
            )
            self.session.add(policy)
            offer.status = OfferStatus.LIVE
            await self.session.flush()
            await self.session.refresh(offer)
            await self.session.refresh(policy)
            await self.session.commit()
            return offer, policy
        except ApplicationError:
            await self.session.rollback()
            raise
        except IntegrityError as exc:
            await self.session.rollback()
            raise ApplicationError(
                "publication_conflict", "Offer publication conflicted with another request", 409
            ) from exc
        except Exception:
            await self.session.rollback()
            raise

    async def get_public_offer(self, slug: str) -> Offer:
        offer = await self.repository.get_live_by_slug(slug)
        if offer is None:
            raise ApplicationError("public_offer_not_found", "Public offer not found", 404)
        return offer

    @staticmethod
    def _authorize(offer: Offer | None, capability: str | None) -> None:
        if offer is None:
            raise ApplicationError("offer_not_found", "Offer not found", 404)
        if not capability or not verify_management_capability(
            capability, offer.management_capability_hash
        ):
            raise ApplicationError("invalid_management_capability", "Merchant capability is invalid", 403)

    @staticmethod
    def _validate_policy(offer: Offer, payload: PolicyPublish) -> None:
        if payload.currency != offer.currency:
            raise ApplicationError("policy_currency_mismatch", "Policy currency must match offer currency", 400)
        if payload.floor_price_paise > offer.list_price_paise:
            raise ApplicationError("invalid_policy_bounds", "Policy financial bounds are contradictory", 400)
        if offer.list_price_paise - payload.max_discount_paise < payload.floor_price_paise:
            raise ApplicationError("invalid_policy_bounds", "Policy financial bounds are contradictory", 400)

    async def _unique_slug(self, product_name: str) -> str:
        for _ in range(8):
            slug = generate_public_slug(product_name)
            if not await self.repository.slug_exists(slug):
                return slug
        raise ApplicationError("slug_generation_failed", "Could not allocate a public URL", 503)

    @staticmethod
    def _policy_matches(current: PolicyVersion, payload: PolicyPublish, offer: Offer) -> bool:
        return (
            current.list_price_paise == offer.list_price_paise
            and current.floor_price_paise == payload.floor_price_paise
            and current.max_discount_paise == payload.max_discount_paise
            and current.max_rounds == payload.max_rounds
            and current.expiry_minutes == payload.expiry_minutes
            and current.currency == payload.currency
            and current.raw_rules == payload.original_rules_text
            and current.policy_json
            == {
                "allowed_bundles": [bundle.model_dump() for bundle in payload.allowed_bundles],
                "allowed_actions": payload.allowed_actions,
                "forbidden_actions": payload.forbidden_actions,
            }
        )
