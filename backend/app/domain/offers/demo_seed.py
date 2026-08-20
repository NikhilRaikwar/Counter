from __future__ import annotations

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Offer, OfferStatus, PolicyVersion
from app.domain.offers.security import generate_management_capability, hash_management_capability

DEMO_OFFER_SLUG = "growth-sprint-demo"
DEMO_MERCHANT_NAME = "Velocity Labs"
DEMO_PRODUCT_NAME = "Growth Sprint"
DEMO_DESCRIPTION = (
    "A 2-week growth consulting sprint for early-stage startups. "
    "Includes two strategy calls and a written growth plan."
)
DEMO_LIST_PRICE_PAISE = 600_000
DEMO_FLOOR_PRICE_PAISE = 520_000
DEMO_MAX_DISCOUNT_PAISE = 80_000


def _policy_payload() -> dict[str, object]:
    return {
        "allowed_bundles": [
            {
                "id": "review-call",
                "name": "30-minute review call",
                "additional_cost_paise": 0,
            }
        ],
        "allowed_actions": ["negotiate_price", "offer_bundle", "accept_deal", "create_checkout"],
        "forbidden_actions": ["price_below_floor", "invent_bundle", "change_product_scope"],
        "concession_strategy": {
            "mode": "buyer_must_improve",
            "opening_counter_paise": DEMO_LIST_PRICE_PAISE,
            "min_buyer_improvement_paise": 20_000,
            "max_concession_per_round_paise": 20_000,
            "hold_on_repeat_offer": True,
            "hold_on_worse_offer": True,
            "accept_buyer_offer_if_authorized": True,
            "hold_at_floor": True,
        },
    }


def _matches(policy: PolicyVersion) -> bool:
    return (
        policy.list_price_paise == DEMO_LIST_PRICE_PAISE
        and policy.floor_price_paise == DEMO_FLOOR_PRICE_PAISE
        and policy.max_discount_paise == DEMO_MAX_DISCOUNT_PAISE
        and policy.max_rounds == 4
        and policy.expiry_minutes == 20
        and policy.currency == "INR"
        and policy.policy_json == _policy_payload()
    )


async def ensure_demo_offer(session: AsyncSession) -> Offer:
    """Create or repair the single public recruiter template without touching its deals."""
    await session.execute(text("BEGIN IMMEDIATE"))
    try:
        offer = await session.scalar(select(Offer).where(Offer.public_slug == DEMO_OFFER_SLUG))
        if offer is None:
            offer = Offer(
                public_slug=DEMO_OFFER_SLUG,
                management_capability_hash=hash_management_capability(
                    generate_management_capability()
                ),
                merchant_name=DEMO_MERCHANT_NAME,
                product_name=DEMO_PRODUCT_NAME,
                description=DEMO_DESCRIPTION,
                image_url=None,
                list_price_paise=DEMO_LIST_PRICE_PAISE,
                currency="INR",
                status=OfferStatus.LIVE,
            )
            session.add(offer)
            await session.flush()
        elif offer.merchant_name != DEMO_MERCHANT_NAME or offer.product_name != DEMO_PRODUCT_NAME:
            raise RuntimeError("The reserved Counter demo slug is owned by a different offer")
        else:
            # This canonical template is intentionally reusable; deal terminal states never alter it.
            offer.status = OfferStatus.LIVE

        policies = list(
            await session.scalars(
                select(PolicyVersion)
                .where(PolicyVersion.offer_id == offer.id)
                .order_by(PolicyVersion.version.desc())
            )
        )
        current = policies[0] if policies else None
        if current is None or not _matches(current):
            session.add(
                PolicyVersion(
                    offer_id=offer.id,
                    version=(current.version + 1) if current else 1,
                    list_price_paise=DEMO_LIST_PRICE_PAISE,
                    floor_price_paise=DEMO_FLOOR_PRICE_PAISE,
                    max_discount_paise=DEMO_MAX_DISCOUNT_PAISE,
                    max_rounds=4,
                    expiry_minutes=20,
                    currency="INR",
                    raw_rules=(
                        "Never sell below ₹5,200. Counter may discount up to ₹800. "
                        "It may include a 30-minute review call. Maximum 4 negotiation rounds."
                    ),
                    policy_json=_policy_payload(),
                )
            )
        await session.commit()
        return offer
    except Exception:
        await session.rollback()
        raise
