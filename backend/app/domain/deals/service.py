from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import GraphRuntimeContext
from app.agents.model import NegotiationFailure, NegotiationModel
from app.agents.prompts import NegotiationContext
from app.agents.schemas import AgentAction, AgentDecision
from app.db.models import Deal, DealMessage, DealStatus, MessageSender
from app.domain.deals.repository import DealRepository
from app.domain.deals.schemas import (
    BuyerSafeCandidate,
    BuyerSafeMessage,
    BuyerTurnResponse,
    DealCreateResponse,
    MerchantDealDetailResponse,
    MerchantDealListResponse,
    MerchantDealMessage,
    MerchantDealSummary,
)
from app.domain.deals.security import generate_deal_capability, hash_deal_capability
from app.domain.policies.gate import (
    DealPolicyState,
    MerchantPolicySnapshot,
    PolicyValidationResult,
    validate_decision,
)
from app.domain.policies.schemas import ConcessionStrategy
from app.domain.policies.strategy import (
    build_counter_directive,
    buyer_offer_from_text,
    validate_strategy,
)
from app.errors import ApplicationError
from app.domain.offers.repository import OfferRepository
from app.domain.offers.service import OfferService

PRIVATE_RESPONSE_MARKERS = (
    "floor price",
    "absolute floor",
    "private policy",
    "maximum discount",
    "max discount",
    "system prompt",
    "merchant capability",
    "policy json",
)


class DealService:
    def __init__(self, session: AsyncSession, graph: Any, model: NegotiationModel) -> None:
        self.session = session
        self.repository = DealRepository(session)
        self.graph = graph
        self.model = model

    async def start(self, slug: str) -> DealCreateResponse:
        async with self.session.begin():
            offer, policy = await self.repository.live_offer_and_policy(slug)
            if offer is None or policy is None:
                raise ApplicationError("public_offer_not_found", "Public offer not found", 404)
            capability = generate_deal_capability()
            deal = Deal(
                offer_id=offer.id,
                policy_version_id=policy.id,
                public_session_token_hash=hash_deal_capability(capability),
                status=DealStatus.NEGOTIATING,
                current_round=0,
            )
            self.session.add(deal)
            await self.session.flush()
        return DealCreateResponse(deal_capability=capability)

    async def process_turn(
        self, capability: str | None, buyer_text: str, client_message_id: str
    ) -> BuyerTurnResponse:
        if not capability:
            raise ApplicationError("invalid_deal_capability", "Buyer deal capability is invalid", 403)
        try:
            await self.session.execute(text("BEGIN IMMEDIATE"))
            deal = await self.repository.by_capability_hash(hash_deal_capability(capability))
            if deal is None:
                raise ApplicationError("invalid_deal_capability", "Buyer deal capability is invalid", 403)
            existing = await self.repository.buyer_turn(deal.id, client_message_id)
            if existing is not None:
                if existing.text != buyer_text:
                    raise ApplicationError(
                        "client_message_id_conflict",
                        "client_message_id was already used for a different buyer message",
                        409,
                    )
                counter = await self.repository.message_at(deal.id, existing.sequence + 1)
                if counter is None:
                    raise ApplicationError("turn_incomplete", "Buyer turn is incomplete; retry later", 409)
                await self.session.commit()
                return self._response_from_messages(deal, counter)

            if deal.agreement_locked_at is not None or deal.status == DealStatus.AGREED:
                raise ApplicationError(
                    "agreement_locked",
                    "This deal already has a locked agreement",
                    409,
                )

            offer, policy = await self.repository.live_offer_and_policy_for_deal(deal)
            history = await self.repository.history(deal.id)
            policy_data = policy.policy_json
            next_turn = deal.current_round + 1
            buyer_message_id = f"{deal.id}:{client_message_id}"
            current_public_offer_paise = (
                deal.last_valid_counter_amount_paise
                or policy.list_price_paise
            )
            can_make_new_concession = deal.commercial_rounds_used < policy.max_rounds

            actions = set(policy_data.get("allowed_actions", []))
            actions.add("negotiate_price")
            actions.add("accept_deal")

            buyer_offer = buyer_offer_from_text(buyer_text)
            strategy = ConcessionStrategy.model_validate(
                policy_data.get("concession_strategy")
                or {"opening_counter_paise": policy.list_price_paise}
            )
            directive = build_counter_directive(
                strategy,
                buyer_offer_paise=buyer_offer,
                best_buyer_offer_paise=deal.best_buyer_offer_paise,
                last_buyer_offer_paise=deal.last_buyer_offer_paise,
                current_public_offer_paise=current_public_offer_paise,
                list_price_paise=policy.list_price_paise,
                floor_price_paise=policy.floor_price_paise,
                max_discount_paise=policy.max_discount_paise,
                can_make_new_concession=can_make_new_concession,
                negotiate_price_allowed="negotiate_price" in actions,
            )

            negotiation = NegotiationContext(
                product_name=offer.product_name,
                description=offer.description,
                list_price_paise=policy.list_price_paise,
                currency=policy.currency,
                floor_price_paise=policy.floor_price_paise,
                max_discount_paise=policy.max_discount_paise,
                max_rounds=policy.max_rounds,
                allowed_bundles=policy_data.get("allowed_bundles", []),
                concession_strategy=policy_data.get("concession_strategy", {}),
                buyer_offer_paise=buyer_offer,
                best_buyer_offer_paise=deal.best_buyer_offer_paise,
                last_buyer_offer_paise=deal.last_buyer_offer_paise,
                current_round=next_turn,
                commercial_rounds_used=deal.commercial_rounds_used,
                current_public_offer_paise=current_public_offer_paise,
                can_make_new_concession=can_make_new_concession,
                last_counter_amount_paise=deal.last_counter_amount_paise,
                active_counter_required=directive.active_counter_required,
                recommended_counter_paise=directive.recommended_counter_paise,
                concession_reason=directive.reason,
                history=[
                    {"sequence": item.sequence, "role": item.sender.value, "content": item.text}
                    for item in history
                ],
                buyer_message=buyer_text,
            )
            policy_snapshot = MerchantPolicySnapshot(
                id=policy.id,
                offer_id=policy.offer_id,
                currency=policy.currency,
                list_price_paise=policy.list_price_paise,
                floor_price_paise=policy.floor_price_paise,
                max_discount_paise=policy.max_discount_paise,
                max_rounds=policy.max_rounds,
                allowed_bundles=tuple(policy_data.get("allowed_bundles", [])),
                allowed_actions=frozenset(actions),
            )
            deal_state = DealPolicyState(
                offer_id=deal.offer_id,
                policy_version_id=deal.policy_version_id,
                currency=offer.currency,
                status=deal.status.value,
                round=deal.commercial_rounds_used + 1,
                commercial_rounds_used=deal.commercial_rounds_used,
                last_valid_counter_amount_paise=deal.last_valid_counter_amount_paise,
                agreement_locked=deal.agreement_locked_at is not None,
            )

            state = {
                "deal_id": deal.id,
                "offer_id": deal.offer_id,
                "policy_version_id": deal.policy_version_id,
                "buyer_message_id": buyer_message_id,
                "buyer_message": buyer_text,
                "buyer_offer_paise": buyer_offer,
                "round": next_turn,
                "commercial_rounds_used": deal.commercial_rounds_used,
                "last_counter_amount_paise": deal.last_counter_amount_paise,
                "best_buyer_offer_paise": deal.best_buyer_offer_paise,
                "last_buyer_offer_paise": deal.last_buyer_offer_paise,
                "current_public_offer_paise": current_public_offer_paise,
                "can_make_new_concession": can_make_new_concession,
            }
            runtime = GraphRuntimeContext(
                model=self.model,
                negotiation=negotiation,
                history_message_ids=[item.id for item in history],
                policy_snapshot=policy_snapshot,
                deal_policy_state=deal_state,
                concession_strategy=strategy,
                buyer_offer_paise=buyer_offer,
                max_replan_attempts=2,
            )
            try:
                result = await self.graph.ainvoke(
                    state,
                    config={"configurable": {"thread_id": deal.id}},
                    context=runtime,
                )
            except NegotiationFailure as exc:
                raise ApplicationError(
                    "negotiation_unavailable",
                    "Negotiation is temporarily unavailable; the turn was not recorded",
                    503,
                ) from exc

            decision_data = result["decision"]
            decision = AgentDecision.model_validate(decision_data)
            safe_outcome_data = result.get("safe_outcome", {})
            response_text = result.get("response_text", "")
            events = result.get("events", [])
            attempts = result.get("attempts", [])
            replan_count = result.get("replan_count", 0)
            validation_passed = safe_outcome_data.get("validation_passed", False)
            validated_amount_paise = safe_outcome_data.get("validated_amount_paise")

            final_candidate = attempts[-1]["candidate"] if attempts else decision.model_dump(mode="json")
            if not validation_passed:
                public_candidate = {
                    "action": "refuse",
                    "amount_paise": None,
                    "bundle_id": None,
                    "validation_status": "failed",
                    "violation_codes": safe_outcome_data.get("violations", []),
                }
            else:
                public_candidate = {
                    "action": decision.action.value,
                    "amount_paise": validated_amount_paise,
                    "bundle_id": decision.bundle_id,
                    "validation_status": "passed",
                    "violation_codes": [],
                }
            first_sequence = await self.repository.next_sequence(deal.id)
            buyer_message = DealMessage(
                deal_id=deal.id,
                sequence=first_sequence,
                sender=MessageSender.BUYER,
                text=buyer_text,
                client_message_id=client_message_id,
                metadata_json={"events": ["buyer_message_received", "trusted_context_loaded"]},
            )
            counter_message = DealMessage(
                deal_id=deal.id,
                sequence=first_sequence + 1,
                sender=MessageSender.COUNTER,
                text=response_text,
                metadata_json={
                    "events": events,
                    "candidate": {
                        "action": decision.action.value,
                        "amount_paise": decision.proposed_amount_paise,
                        "bundle_id": decision.bundle_id,
                        "validation_status": "passed" if validation_passed else "failed",
                        "violation_codes": safe_outcome_data.get("violations", []),
                    },
                    "public_candidate": public_candidate,
                    "attempts": attempts,
                    "replan_count": replan_count,
                    "buyer_intent": result.get("buyer_intent"),
                    "strategy": result.get("strategy"),
                    "safe_outcome": safe_outcome_data,
                    "model": result.get("model_metadata", {}),
                },
            )
            self.session.add_all([buyer_message, counter_message])
            deal.current_round = next_turn

            # Only increment commercial_rounds_used when a NEW valid seller concession occurred
            if validation_passed:
                if decision.action == AgentAction.COUNTER:
                    if (
                        validated_amount_paise is not None
                        and validated_amount_paise < current_public_offer_paise
                    ):
                        deal.commercial_rounds_used += 1
                elif decision.action == AgentAction.OFFER_BUNDLE:
                    deal.commercial_rounds_used += 1

            if buyer_offer is not None:
                deal.last_buyer_offer_paise = buyer_offer
                if deal.best_buyer_offer_paise is None:
                    deal.best_buyer_offer_paise = buyer_offer
                elif validation_passed and decision.action in {AgentAction.COUNTER, AgentAction.OFFER_BUNDLE, AgentAction.ACCEPT}:
                    deal.best_buyer_offer_paise = max(deal.best_buyer_offer_paise, buyer_offer)

            deal.candidate_action = final_candidate.get("action")
            deal.candidate_amount_paise = final_candidate.get("proposed_amount_paise")
            deal.candidate_bundle_id = final_candidate.get("bundle_id")
            deal.candidate_validation_status = "passed" if validation_passed else "failed"
            deal.candidate_violation_codes = safe_outcome_data.get("violations", [])
            if validation_passed and decision.action == AgentAction.COUNTER:
                deal.last_counter_amount_paise = validated_amount_paise
                deal.last_valid_counter_amount_paise = validated_amount_paise
            if validation_passed and decision.action == AgentAction.ACCEPT:
                # Re-run immediately before locking inside this transaction.
                lock_check = validate_decision(policy_snapshot, deal_state, decision)
                lock_check_strategy = validate_strategy(
                    strategy,
                    decision,
                    buyer_offer_paise=buyer_offer,
                    best_buyer_offer_paise=deal.best_buyer_offer_paise,
                    last_buyer_offer_paise=deal.last_buyer_offer_paise,
                    last_counter_amount_paise=deal.last_counter_amount_paise,
                    list_price_paise=policy.list_price_paise,
                    floor_price_paise=policy.floor_price_paise,
                    max_discount_paise=policy.max_discount_paise,
                    can_make_new_concession=can_make_new_concession,
                    negotiate_price_allowed="negotiate_price" in policy_snapshot.allowed_actions,
                )
                if not lock_check.allowed or lock_check_strategy is not None:
                    raise ApplicationError("agreement_conflict", "Agreement could not be locked", 409)
                deal.status = DealStatus.AGREED
                deal.accepted_amount_paise = lock_check.validated_amount_paise
                deal.accepted_currency = policy.currency
                deal.accepted_bundle_id = lock_check.validated_bundle_id
                deal.agreement_locked_at = datetime.now(timezone.utc)
            await self.session.flush()
            await self.session.commit()
            return self._response_from_messages(deal, counter_message)
        except ApplicationError:
            await self.session.rollback()
            raise
        except Exception:
            await self.session.rollback()
            raise

    @staticmethod
    def _buyer_safe_text(message: str) -> str:
        lowered = message.casefold()
        if any(marker in lowered for marker in PRIVATE_RESPONSE_MARKERS):
            return (
                "I can't share the seller's private pricing limits, but I can continue "
                "negotiating within the available terms."
            )
        return message

    @classmethod
    def _render_buyer_response(
        cls,
        decision: AgentDecision,
        validation: PolicyValidationResult,
        policy: MerchantPolicySnapshot,
        *,
        current_public_offer_paise: int,
        commercial_rounds_used: int,
        max_rounds: int,
    ) -> str:
        current_formatted = cls._format_inr(current_public_offer_paise)
        if not validation.allowed:
            from app.domain.policies.gate import PolicyViolationCode

            violations = set(validation.violations)

            # 1. Below floor or excessive discount acceptance attempt by model
            if (
                PolicyViolationCode.PRICE_BELOW_FLOOR in violations
                or PolicyViolationCode.DISCOUNT_EXCEEDS_LIMIT in violations
            ):
                if decision.action == AgentAction.ACCEPT:
                    return f"I can't agree to that price. My current offer remains {current_formatted}."
                return f"My current offer is still {current_formatted}."

            # 2. Max rounds exceeded (concession blocked because at max rounds)
            if PolicyViolationCode.MAX_ROUNDS_EXCEEDED in violations:
                return f"My current offer remains {current_formatted}. I can lock that in if it works for you."

            # 3. Buyer offer not improved / improvement required / hold firm
            if (
                PolicyViolationCode.BUYER_OFFER_NOT_IMPROVED in violations
                or PolicyViolationCode.BUYER_IMPROVEMENT_REQUIRED in violations
                or PolicyViolationCode.CONCESSION_NOT_PERMITTED in violations
                or PolicyViolationCode.CONCESSION_STEP_EXCEEDED in violations
            ):
                return f"My current offer is still {current_formatted}."

            # 4. Accept not permitted by strategy / not matching buyer offer
            if PolicyViolationCode.ACCEPT_NOT_MATCHING_BUYER_OFFER in violations:
                return f"My current offer is still {current_formatted}."
            if PolicyViolationCode.ACCEPT_NOT_PERMITTED_BY_STRATEGY in violations:
                return f"I can't agree to that price. My current offer remains {current_formatted}."

            # 5. Stale policy, deal inactive
            if PolicyViolationCode.DEAL_NOT_ACTIVE in violations:
                return "This deal is no longer active."

            # Default safe fallback
            return f"My current offer is still {current_formatted}."

        if decision.action == AgentAction.COUNTER:
            if validation.validated_amount_paise == current_public_offer_paise:
                return f"My current offer is {cls._format_inr(validation.validated_amount_paise)}."
            return f"I can do {cls._format_inr(validation.validated_amount_paise)}."
        if decision.action == AgentAction.ACCEPT:
            return f"Deal. {cls._format_inr(validation.validated_amount_paise)}."
        if decision.action == AgentAction.OFFER_BUNDLE:
            bundle = next(
                (item for item in policy.allowed_bundles if item.get("id") == validation.validated_bundle_id),
                None,
            )
            bundle_name = bundle["name"] if bundle else "an approved bundle"
            return (
                f"I can offer {cls._format_inr(validation.validated_amount_paise)} "
                f"with {bundle_name}."
            )
        return cls._buyer_safe_text(decision.message)

    @staticmethod
    def _format_inr(amount_paise: int | None) -> str:
        if amount_paise is None:
            raise ValueError("validated commercial amount is missing")
        amount = Decimal(amount_paise) / Decimal(100)
        return f"₹{amount:,.0f}" if amount == amount.to_integral() else f"₹{amount:,.2f}"

    @staticmethod
    def _public_candidate(
        decision: AgentDecision, validation: PolicyValidationResult
    ) -> dict[str, Any]:
        if not validation.allowed:
            return {
                "action": "refuse",
                "amount_paise": None,
                "bundle_id": None,
                "validation_status": "failed",
            }
        return {
            "action": decision.action.value,
            "amount_paise": validation.validated_amount_paise,
            "bundle_id": validation.validated_bundle_id,
            "validation_status": "passed",
        }

    @staticmethod
    def _response_from_messages(deal: Deal, counter: DealMessage) -> BuyerTurnResponse:
        candidate = (counter.metadata_json or {}).get("public_candidate", {})
        action = candidate.get("action", "clarify")
        public_status = "agreed" if deal.status == DealStatus.AGREED else (
            "refused_candidate" if action == "refuse" else "negotiating"
        )
        amount_paise = candidate.get("amount_paise") or deal.accepted_amount_paise
        return BuyerTurnResponse(
            deal_status=public_status,
            round=deal.current_round,
            message=BuyerSafeMessage(content=counter.text),
            candidate=BuyerSafeCandidate(
                action=action,
                amount_paise=amount_paise,
                bundle_id=candidate.get("bundle_id") or deal.accepted_bundle_id,
                validation_status=candidate.get("validation_status", "passed"),
            ),
        )


class MerchantDealReadService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = DealRepository(session)
        self.offers = OfferRepository(session)

    async def list(self, offer_id: str, capability: str | None) -> MerchantDealListResponse:
        offer = await self.offers.get(offer_id)
        OfferService._authorize(offer, capability)
        return MerchantDealListResponse(
            deals=[self._summary(deal) for deal in await self.repository.for_offer(offer_id)]
        )

    async def detail(
        self, offer_id: str, deal_id: str, capability: str | None
    ) -> MerchantDealDetailResponse:
        offer = await self.offers.get(offer_id)
        OfferService._authorize(offer, capability)
        deal = await self.repository.for_offer_by_id(offer_id, deal_id)
        if deal is None:
            raise ApplicationError("deal_not_found", "Deal not found", 404)
        messages = await self.repository.history(deal.id)
        return MerchantDealDetailResponse(
            deal=self._summary(deal),
            messages=[
                MerchantDealMessage(
                    id=message.id,
                    sequence=message.sequence,
                    sender=message.sender.value,
                    text=message.text,
                    metadata=message.metadata_json or {},
                    created_at=message.created_at,
                )
                for message in messages
            ],
        )

    @staticmethod
    def _summary(deal: Deal) -> MerchantDealSummary:
        payment = max(deal.payment_executions, key=lambda item: item.created_at, default=None)
        return MerchantDealSummary(
            id=deal.id,
            status=deal.status.value,
            current_round=deal.current_round,
            candidate_action=deal.candidate_action,
            candidate_amount_paise=deal.candidate_amount_paise,
            candidate_bundle_id=deal.candidate_bundle_id,
            candidate_validation_status=deal.candidate_validation_status,
            candidate_violation_codes=deal.candidate_violation_codes or [],
            accepted_amount_paise=deal.accepted_amount_paise,
            accepted_currency=deal.accepted_currency,
            accepted_bundle_id=deal.accepted_bundle_id,
            agreement_locked_at=deal.agreement_locked_at,
            payment_status=payment.status.value if payment else None,
            payment_amount_paise=payment.amount_paise if payment else None,
            payment_created_at=payment.created_at if payment else None,
            payment_paid_at=payment.paid_at if payment else None,
            created_at=deal.created_at,
            updated_at=deal.updated_at,
        )
