from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.model import PolicyExtractionFailure, PolicyExtractor
from app.domain.offers.repository import OfferRepository
from app.domain.offers.service import OfferService
from app.domain.policies.schemas import (
    DraftOfferResponse,
    PolicyDraftResponse,
    TrustedOfferContext,
)
from app.domain.policies.validation import validate_extraction
from app.errors import ApplicationError


class PolicyDraftService:
    def __init__(self, session: AsyncSession, extractor: PolicyExtractor) -> None:
        self.session = session
        self.extractor = extractor
        self.repository = OfferRepository(session)

    async def create_draft(
        self, offer_id: str, capability: str | None, rules_text: str
    ) -> PolicyDraftResponse:
        offer = await self.repository.get(offer_id)
        OfferService._authorize(offer, capability)
        assert offer is not None
        trusted = TrustedOfferContext(
            product_name=offer.product_name,
            description=offer.description,
            list_price_paise=offer.list_price_paise,
            currency=offer.currency,
            status=offer.status.value,
        )
        try:
            extraction = await self.extractor.extract(trusted, rules_text)
        except PolicyExtractionFailure as exc:
            raise ApplicationError(
                "policy_extraction_unavailable",
                "Policy extraction is temporarily unavailable; no draft was created",
                503,
            ) from exc
        result = validate_extraction(trusted, rules_text, extraction.draft)
        return PolicyDraftResponse(
            status="conflict" if result.conflicts else "review_required",
            offer=DraftOfferResponse(
                product_name=trusted.product_name,
                list_price_paise=trusted.list_price_paise,
                currency=trusted.currency,
            ),
            draft=extraction.draft,
            conflicts=result.conflicts,
            warnings=result.warnings,
            missing_fields=result.missing_fields,
        )
