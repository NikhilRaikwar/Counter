from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Offer, PolicyVersion


class OfferRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, offer: Offer) -> None:
        self.session.add(offer)
        await self.session.flush()

    async def get(self, offer_id: str, *, with_policies: bool = False) -> Offer | None:
        statement = select(Offer).where(Offer.id == offer_id)
        if with_policies:
            statement = statement.options(selectinload(Offer.policy_versions))
        return await self.session.scalar(statement)

    async def get_live_by_slug(self, slug: str) -> Offer | None:
        from app.db.models import OfferStatus

        return await self.session.scalar(
            select(Offer).where(Offer.public_slug == slug, Offer.status == OfferStatus.LIVE)
        )

    async def slug_exists(self, slug: str) -> bool:
        return bool(await self.session.scalar(select(func.count()).select_from(Offer).where(Offer.public_slug == slug)))

    async def current_policy(self, offer_id: str) -> PolicyVersion | None:
        return await self.session.scalar(
            select(PolicyVersion)
            .where(PolicyVersion.offer_id == offer_id)
            .order_by(PolicyVersion.version.desc())
            .limit(1)
        )
