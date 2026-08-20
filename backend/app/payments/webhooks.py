from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Deal,
    DealStatus,
    PaymentExecution,
    PaymentExecutionStatus,
    WebhookEvent,
    WebhookProcessingStatus,
)
from app.errors import ApplicationError
from app.payments.schemas import WebhookResponse

SUPPORTED_EVENTS = {
    "payment_link.paid",
    "payment_link.expired",
    "payment_link.cancelled",
}


def verify_signature(secret: str, raw_body: bytes, supplied: str | None) -> None:
    if not supplied:
        raise ApplicationError("invalid_webhook_signature", "Webhook signature is invalid", 401)
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, supplied):
        raise ApplicationError("invalid_webhook_signature", "Webhook signature is invalid", 401)


class RazorpayWebhookService:
    def __init__(self, session: AsyncSession, secret: str) -> None:
        self.session = session
        self.secret = secret

    async def process(
        self, *, raw_body: bytes, signature: str | None, event_id: str | None
    ) -> WebhookResponse:
        verify_signature(self.secret, raw_body, signature)
        if not event_id:
            raise ApplicationError("missing_webhook_event_id", "Webhook event ID is required", 400)
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise ApplicationError("invalid_webhook_json", "Webhook body is invalid", 400) from exc
        event_type = payload.get("event")
        if not isinstance(event_type, str):
            raise ApplicationError("invalid_webhook_event", "Webhook event is invalid", 400)

        await self.session.execute(text("BEGIN IMMEDIATE"))
        duplicate = await self.session.scalar(
            select(WebhookEvent).where(WebhookEvent.provider_event_id == event_id)
        )
        if duplicate is not None:
            await self.session.commit()
            return WebhookResponse(duplicate=True)

        link = ((payload.get("payload") or {}).get("payment_link") or {}).get("entity") or {}
        safe_payload = {
            "event": event_type,
            "payment_link_id": link.get("id"),
            "reference_id": link.get("reference_id"),
        }
        event = WebhookEvent(
            provider_event_id=event_id,
            event_type=event_type,
            processing_status=WebhookProcessingStatus.RECEIVED,
            payload_json=safe_payload,
        )
        self.session.add(event)

        if event_type not in SUPPORTED_EVENTS:
            event.processing_status = WebhookProcessingStatus.IGNORED
            event.processed_at = datetime.now(timezone.utc)
            await self.session.commit()
            return WebhookResponse()

        execution = await self.session.scalar(
            select(PaymentExecution).where(
                PaymentExecution.provider_payment_link_id == link.get("id"),
                PaymentExecution.reference_id == link.get("reference_id"),
            )
        )
        if execution is None:
            event.processing_status = WebhookProcessingStatus.FAILED
            event.error_code = "payment_execution_not_found"
            event.processed_at = datetime.now(timezone.utc)
            await self.session.commit()
            return WebhookResponse()

        if event_type == "payment_link.paid":
            if link.get("amount") != execution.amount_paise or link.get("currency") != execution.currency:
                event.processing_status = WebhookProcessingStatus.FAILED
                event.error_code = "payment_terms_mismatch"
            else:
                payment = ((payload.get("payload") or {}).get("payment") or {}).get("entity") or {}
                execution.status = PaymentExecutionStatus.PAID
                execution.provider_payment_id = payment.get("id") or execution.provider_payment_id
                execution.paid_at = datetime.now(timezone.utc)
                execution.verified_webhook_event_id = event_id
                deal = await self.session.get(Deal, execution.deal_id)
                if deal is not None:
                    deal.status = DealStatus.PAID
                event.processing_status = WebhookProcessingStatus.PROCESSED
        elif execution.status != PaymentExecutionStatus.PAID:
            execution.status = (
                PaymentExecutionStatus.EXPIRED
                if event_type == "payment_link.expired"
                else PaymentExecutionStatus.CANCELLED
            )
            event.processing_status = WebhookProcessingStatus.PROCESSED
        else:
            event.processing_status = WebhookProcessingStatus.IGNORED

        event.processed_at = datetime.now(timezone.utc)
        await self.session.commit()
        return WebhookResponse()
