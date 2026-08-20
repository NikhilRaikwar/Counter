from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session
from app.errors import ApplicationError
from app.payments.client import PaymentLinksClient
from app.payments.schemas import (
    EmptyPaymentLinkRequest,
    PaymentLinkResponse,
    PaymentStatusResponse,
    WebhookResponse,
)
from app.payments.service import PaymentService
from app.payments.webhooks import RazorpayWebhookService

router = APIRouter(tags=["payments"])
Session = Annotated[AsyncSession, Depends(get_db_session)]
DealCapability = Annotated[str | None, Header(alias="X-Counter-Deal-Capability")]


def payment_client(request: Request) -> PaymentLinksClient:
    return request.app.state.payment_links_client


@router.post("/api/public/deals/payment-link", response_model=PaymentLinkResponse)
async def create_payment_link(
    _payload: EmptyPaymentLinkRequest,
    session: Session,
    request: Request,
    capability: DealCapability = None,
) -> PaymentLinkResponse:
    return await PaymentService(session, payment_client(request)).create_link(capability)


@router.get("/api/public/deals/payment-status", response_model=PaymentStatusResponse)
async def payment_status(
    session: Session,
    request: Request,
    capability: DealCapability = None,
) -> PaymentStatusResponse:
    return await PaymentService(session, payment_client(request)).status(capability)


@router.post("/api/webhooks/razorpay", response_model=WebhookResponse)
async def razorpay_webhook(
    request: Request,
    session: Session,
    signature: Annotated[str | None, Header(alias="X-Razorpay-Signature")] = None,
    event_id: Annotated[str | None, Header(alias="X-Razorpay-Event-Id")] = None,
) -> WebhookResponse:
    secret = request.app.state.razorpay_webhook_secret
    if not secret:
        raise ApplicationError("webhook_not_configured", "Webhook is unavailable", 503)
    return await RazorpayWebhookService(session, secret).process(
        raw_body=await request.body(), signature=signature, event_id=event_id
    )
