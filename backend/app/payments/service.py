from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.schemas import AgentAction, AgentDecision
from app.db.models import Deal, DealStatus, Offer, PaymentExecution, PaymentExecutionStatus, PolicyVersion
from app.domain.deals.security import hash_deal_capability
from app.domain.policies.gate import DealPolicyState, MerchantPolicySnapshot, validate_decision
from app.errors import ApplicationError
from app.payments.client import PaymentLinksClient, RazorpayFailure
from app.payments.schemas import PaymentLinkResponse, PaymentStatusResponse


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def execution_identity(deal: Deal) -> str:
    canonical = "|".join(
        [deal.id, deal.policy_version_id, str(deal.accepted_amount_paise), str(deal.accepted_currency)]
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def reference_id(identity: str) -> str:
    return f"ctr_{identity[:32]}"


class PaymentService:
    def __init__(self, session: AsyncSession, client: PaymentLinksClient) -> None:
        self.session = session
        self.client = client

    async def _trusted_deal(self, capability: str | None) -> tuple[Deal, Offer, PolicyVersion]:
        if not capability:
            raise ApplicationError("invalid_deal_capability", "Buyer deal capability is invalid", 403)
        deal = await self.session.scalar(
            select(Deal).where(Deal.public_session_token_hash == hash_deal_capability(capability))
        )
        if deal is None:
            raise ApplicationError("invalid_deal_capability", "Buyer deal capability is invalid", 403)
        offer = await self.session.get(Offer, deal.offer_id)
        policy = await self.session.get(PolicyVersion, deal.policy_version_id)
        if offer is None or policy is None:
            raise ApplicationError("payment_not_available", "Checkout is unavailable", 409)
        return deal, offer, policy

    @staticmethod
    def _revalidate(deal: Deal, offer: Offer, policy: PolicyVersion) -> datetime:
        if (
            deal.status not in {DealStatus.AGREED, DealStatus.PAYMENT_PENDING}
            or deal.agreement_locked_at is None
            or deal.accepted_amount_paise is None
            or deal.accepted_currency != "INR"
        ):
            raise ApplicationError("agreement_required", "A verified agreement is required", 409)
        data = policy.policy_json
        decision = AgentDecision(
            action=AgentAction.ACCEPT,
            proposed_amount_paise=deal.accepted_amount_paise,
            bundle_id=deal.accepted_bundle_id,
            message="Locked agreement revalidation",
        )
        snapshot = MerchantPolicySnapshot(
            id=policy.id,
            offer_id=policy.offer_id,
            currency=policy.currency,
            list_price_paise=policy.list_price_paise,
            floor_price_paise=policy.floor_price_paise,
            max_discount_paise=policy.max_discount_paise,
            max_rounds=policy.max_rounds,
            allowed_bundles=tuple(data.get("allowed_bundles", [])),
            allowed_actions=frozenset(data.get("allowed_actions", [])),
        )
        state = DealPolicyState(
            offer_id=deal.offer_id,
            policy_version_id=deal.policy_version_id,
            currency=offer.currency,
            status="negotiating",
            round=deal.current_round,
            agreement_locked=False,
        )
        result = validate_decision(snapshot, state, decision)
        if not result.allowed:
            raise ApplicationError("agreement_revalidation_failed", "Checkout is unavailable", 409)
        expires_at = _utc(deal.agreement_locked_at).timestamp() + policy.expiry_minutes * 60
        now = datetime.now(timezone.utc).timestamp()
        if expires_at <= now + 60:
            raise ApplicationError("agreement_expired", "This agreement has expired", 409)
        return datetime.fromtimestamp(expires_at, timezone.utc)

    async def create_link(self, capability: str | None) -> PaymentLinkResponse:
        await self.session.execute(text("BEGIN IMMEDIATE"))
        deal, offer, policy = await self._trusted_deal(capability)
        expires_at = self._revalidate(deal, offer, policy)
        identity = execution_identity(deal)
        existing = await self.session.scalar(
            select(PaymentExecution).where(PaymentExecution.execution_identity == identity)
        )
        if existing is not None:
            if existing.status == PaymentExecutionStatus.READY and existing.short_url:
                await self.session.commit()
                return PaymentLinkResponse(
                    payment_url=existing.short_url,
                    amount_paise=existing.amount_paise,
                    currency="INR",
                )
            await self.session.commit()
            raise ApplicationError(
                "payment_execution_in_progress",
                "Checkout is being prepared; retry shortly",
                409,
            )
        execution = PaymentExecution(
            deal_id=deal.id,
            execution_identity=identity,
            reference_id=reference_id(identity),
            amount_paise=deal.accepted_amount_paise,
            currency=deal.accepted_currency,
            status=PaymentExecutionStatus.CREATING,
        )
        self.session.add(execution)
        deal.status = DealStatus.PAYMENT_PENDING
        await self.session.commit()

        try:
            link = await self.client.create_standard_payment_link(
                amount=execution.amount_paise,
                currency=execution.currency,
                reference_id=execution.reference_id,
                expire_by=int(expires_at.timestamp()),
            )
        except RazorpayFailure as exc:
            await self.session.execute(text("BEGIN IMMEDIATE"))
            stored = await self.session.get(PaymentExecution, execution.id)
            if stored is not None:
                stored.status = (
                    PaymentExecutionStatus.UNKNOWN if exc.ambiguous else PaymentExecutionStatus.FAILED
                )
                stored.error_code = exc.code
            await self.session.commit()
            raise ApplicationError(
                "payment_provider_unavailable",
                "Secure checkout could not be prepared",
                503,
            ) from exc

        if (
            link.reference_id != execution.reference_id
            or link.amount != execution.amount_paise
            or link.currency != execution.currency
        ):
            await self.session.execute(text("BEGIN IMMEDIATE"))
            stored = await self.session.get(PaymentExecution, execution.id)
            if stored is not None:
                stored.status = PaymentExecutionStatus.UNKNOWN
                stored.error_code = "razorpay_response_mismatch"
            await self.session.commit()
            raise ApplicationError("payment_provider_mismatch", "Secure checkout is unavailable", 503)

        await self.session.execute(text("BEGIN IMMEDIATE"))
        stored = await self.session.get(PaymentExecution, execution.id)
        if stored is None:
            raise ApplicationError("payment_execution_missing", "Secure checkout is unavailable", 503)
        stored.provider_payment_link_id = link.id
        stored.short_url = link.short_url
        stored.status = PaymentExecutionStatus.READY
        stored.error_code = None
        await self.session.commit()
        return PaymentLinkResponse(
            payment_url=link.short_url,
            amount_paise=stored.amount_paise,
            currency="INR",
        )

    async def status(self, capability: str | None) -> PaymentStatusResponse:
        deal, _offer, _policy = await self._trusted_deal(capability)
        execution = await self.session.scalar(
            select(PaymentExecution)
            .where(PaymentExecution.deal_id == deal.id)
            .order_by(PaymentExecution.created_at.desc())
            .limit(1)
        )
        if execution is None or execution.status in {
            PaymentExecutionStatus.CLAIMED,
            PaymentExecutionStatus.CREATING,
            PaymentExecutionStatus.FAILED,
            PaymentExecutionStatus.UNKNOWN,
        }:
            raise ApplicationError("payment_not_ready", "Payment status is not available", 404)
        public_status = {
            PaymentExecutionStatus.READY: "created",
            PaymentExecutionStatus.PAID: "paid",
            PaymentExecutionStatus.EXPIRED: "expired",
            PaymentExecutionStatus.CANCELLED: "cancelled",
        }[execution.status]
        return PaymentStatusResponse(
            status=public_status,
            amount_paise=execution.amount_paise,
            currency="INR",
            paid_at=execution.paid_at,
        )
