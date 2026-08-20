from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.model import PolicyExtractor
from app.api.dependencies import get_db_session
from app.domain.policies.extraction import PolicyDraftService
from app.domain.policies.schemas import PolicyDraftRequest, PolicyDraftResponse

router = APIRouter(prefix="/api", tags=["policies"])
Session = Annotated[AsyncSession, Depends(get_db_session)]
Capability = Annotated[
    str | None,
    Header(
        alias="X-Counter-Management-Capability",
        description="High-entropy merchant capability returned once at draft creation.",
    ),
]


def get_policy_extractor(request: Request) -> PolicyExtractor:
    return request.app.state.policy_extractor


Extractor = Annotated[PolicyExtractor, Depends(get_policy_extractor)]


@router.post("/offers/{offer_id}/policy-draft", response_model=PolicyDraftResponse)
async def create_policy_draft(
    offer_id: str,
    payload: PolicyDraftRequest,
    session: Session,
    extractor: Extractor,
    capability: Capability = None,
) -> PolicyDraftResponse:
    return await PolicyDraftService(session, extractor).create_draft(
        offer_id, capability, payload.rules_text
    )
