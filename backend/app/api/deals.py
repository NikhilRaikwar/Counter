from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.model import NegotiationModel
from app.api.dependencies import get_db_session
from app.domain.deals.schemas import BuyerMessageRequest, BuyerTurnResponse, DealCreateResponse
from app.domain.deals.service import DealService

router = APIRouter(prefix="/api/public", tags=["deals"])
Session = Annotated[AsyncSession, Depends(get_db_session)]
DealCapability = Annotated[
    str | None,
    Header(
        alias="X-Counter-Deal-Capability",
        description="High-entropy buyer capability returned once when the deal is created.",
    ),
]


def get_graph(request: Request) -> Any:
    return request.app.state.negotiation_graph


def get_model(request: Request) -> NegotiationModel:
    return request.app.state.negotiation_model


Graph = Annotated[Any, Depends(get_graph)]
Model = Annotated[NegotiationModel, Depends(get_model)]


@router.post(
    "/offers/{slug}/deals",
    response_model=DealCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_deal(slug: str, session: Session, graph: Graph, model: Model) -> DealCreateResponse:
    return await DealService(session, graph, model).start(slug)


@router.post("/deals/messages", response_model=BuyerTurnResponse)
async def post_buyer_message(
    payload: BuyerMessageRequest,
    session: Session,
    graph: Graph,
    model: Model,
    capability: DealCapability = None,
) -> BuyerTurnResponse:
    return await DealService(session, graph, model).process_turn(
        capability, payload.message, payload.client_message_id
    )
