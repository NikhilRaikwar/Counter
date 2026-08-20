from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Deal, DealMessage, MessageSender, Offer, OfferStatus, PolicyVersion


class DealRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def live_offer_and_policy(self, slug: str) -> tuple[Offer | None, PolicyVersion | None]:
        offer = await self.session.scalar(
            select(Offer).where(Offer.public_slug == slug, Offer.status == OfferStatus.LIVE)
        )
        if offer is None:
            return None, None
        policy = await self.session.scalar(
            select(PolicyVersion)
            .where(PolicyVersion.offer_id == offer.id)
            .order_by(PolicyVersion.version.desc())
            .limit(1)
        )
        return offer, policy

    async def by_capability_hash(self, token_hash: str) -> Deal | None:
        return await self.session.scalar(
            select(Deal).where(Deal.public_session_token_hash == token_hash)
        )

    async def live_offer_and_policy_for_deal(self, deal: Deal) -> tuple[Offer, PolicyVersion]:
        offer = await self.session.scalar(select(Offer).where(Offer.id == deal.offer_id))
        policy = await self.session.scalar(
            select(PolicyVersion).where(PolicyVersion.id == deal.policy_version_id)
        )
        if offer is None or policy is None:
            raise RuntimeError("Deal references missing trusted context")
        return offer, policy

    async def history(self, deal_id: str) -> list[DealMessage]:
        result = await self.session.scalars(
            select(DealMessage).where(DealMessage.deal_id == deal_id).order_by(DealMessage.sequence)
        )
        return list(result)

    async def buyer_turn(self, deal_id: str, client_message_id: str) -> DealMessage | None:
        return await self.session.scalar(
            select(DealMessage).where(
                DealMessage.deal_id == deal_id,
                DealMessage.sender == MessageSender.BUYER,
                DealMessage.client_message_id == client_message_id,
            )
        )

    async def message_at(self, deal_id: str, sequence: int) -> DealMessage | None:
        return await self.session.scalar(
            select(DealMessage).where(
                DealMessage.deal_id == deal_id, DealMessage.sequence == sequence
            )
        )

    async def next_sequence(self, deal_id: str) -> int:
        current = await self.session.scalar(
            select(func.max(DealMessage.sequence)).where(DealMessage.deal_id == deal_id)
        )
        return (current or 0) + 1

    async def for_offer(self, offer_id: str) -> list[Deal]:
        result = await self.session.scalars(
            select(Deal).where(Deal.offer_id == offer_id).order_by(Deal.created_at.desc())
        )
        return list(result)

    async def for_offer_by_id(self, offer_id: str, deal_id: str) -> Deal | None:
        return await self.session.scalar(
            select(Deal).where(Deal.offer_id == offer_id, Deal.id == deal_id)
        )
