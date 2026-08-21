from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Any

from langgraph.graph import END, START, StateGraph
from langgraph.runtime import Runtime

from app.agents.model import NegotiationModel, NegotiationProposal
from app.agents.prompts import NegotiationContext
from app.agents.safety import ResponseSafetyValidator
from app.agents.schemas import (
    AgentAction,
    AgentDecision,
    BuyerIntent,
    NegotiationStrategy,
    ReplanFeedback,
    SafeOutcome,
)
from app.agents.state import NegotiationState
from app.domain.policies.gate import DealPolicyState, MerchantPolicySnapshot, validate_decision
from app.domain.policies.strategy import ConcessionStrategy, validate_strategy


@dataclass(frozen=True, slots=True)
class GraphRuntimeContext:
    model: NegotiationModel
    negotiation: NegotiationContext
    history_message_ids: list[str]
    policy_snapshot: MerchantPolicySnapshot
    deal_policy_state: DealPolicyState
    concession_strategy: ConcessionStrategy
    buyer_offer_paise: int | None
    max_replan_attempts: int = 2


def build_negotiation_graph(checkpointer: Any) -> Any:
    async def observe_deal(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        return {
            "buyer_message_id": state.get("buyer_message_id", ""),
            "history_message_ids": runtime.context.history_message_ids,
            "trusted_context_loaded": True,
            "attempts": [],
            "replan_count": 0,
            "replan_feedback": None,
            "events": ["buyer_message_received", "observe_deal"],
        }

    async def plan_and_propose(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        current_feedback = state.get("replan_feedback")
        context = runtime.context.negotiation
        if current_feedback:
            context = replace(context, replan_feedback=current_feedback)

        proposal: NegotiationProposal = await runtime.context.model.propose(context)
        decision = proposal.decision
        replan_count = state.get("replan_count", 0)
        events = list(state.get("events", []))
        if replan_count == 0:
            events.append("candidate_proposed")
        else:
            events.append("candidate_reproposed")

        return {
            "decision": decision.model_dump(mode="json"),
            "buyer_intent": decision.intent.value,
            "strategy": decision.strategy.value,
            "candidate_action": decision.action.value,
            "current_candidate_amount_paise": decision.proposed_amount_paise,
            "last_bundle_id": decision.bundle_id,
            "candidate_validation_status": "pending",
            "events": events,
            "model_metadata": {
                "model": proposal.metadata.model,
                "latency_ms": proposal.metadata.latency_ms,
                "prompt_tokens": proposal.metadata.prompt_tokens,
                "completion_tokens": proposal.metadata.completion_tokens,
                "total_tokens": proposal.metadata.total_tokens,
                "fallback_used": proposal.metadata.fallback_used,
            },
        }

    async def validate_candidate(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        decision_data = state["decision"]
        decision = AgentDecision.model_validate(decision_data)
        current_public_offer = state.get(
            "current_public_offer_paise", runtime.context.policy_snapshot.list_price_paise
        )

        # Default proposed amount to current offer on accept without explicit price
        if decision.action == AgentAction.ACCEPT and decision.proposed_amount_paise is None:
            decision = decision.model_copy(update={"proposed_amount_paise": current_public_offer})

        validation = validate_decision(
            runtime.context.policy_snapshot,
            runtime.context.deal_policy_state,
            decision,
        )
        strategy_violation = validate_strategy(
            runtime.context.concession_strategy,
            decision,
            buyer_offer_paise=runtime.context.buyer_offer_paise,
            best_buyer_offer_paise=state.get("best_buyer_offer_paise"),
            last_buyer_offer_paise=state.get("last_buyer_offer_paise"),
            last_counter_amount_paise=state.get("last_counter_amount_paise"),
            list_price_paise=runtime.context.policy_snapshot.list_price_paise,
            floor_price_paise=runtime.context.policy_snapshot.floor_price_paise,
            max_discount_paise=runtime.context.policy_snapshot.max_discount_paise,
            can_make_new_concession=state.get("can_make_new_concession", True),
            negotiate_price_allowed="negotiate_price" in runtime.context.policy_snapshot.allowed_actions,
        )
        violations = [v.value for v in validation.violations]
        if strategy_violation:
            violations.append(strategy_violation)

        is_valid = validation.allowed and strategy_violation is None
        attempts = list(state.get("attempts", []))
        attempts.append(
            {
                "candidate": decision.model_dump(mode="json"),
                "valid": is_valid,
                "violations": violations,
                "replan_count": state.get("replan_count", 0),
            }
        )

        events = list(state.get("events", []))
        events.append("policy_check_passed" if is_valid else "policy_check_failed")

        return {
            "decision": decision.model_dump(mode="json"),
            "candidate_validation_status": "passed" if is_valid else "failed",
            "attempts": attempts,
            "events": events,
            "is_valid": is_valid,
            "violations": violations,
        }

    def route_validation(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> str:
        if state.get("is_valid", False):
            return "approve_outcome"
        replan_count = state.get("replan_count", 0)
        if replan_count < runtime.context.max_replan_attempts:
            return "replan_feedback"
        return "fallback_safe_outcome"

    async def replan_feedback(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        replan_count = state.get("replan_count", 0) + 1
        current_public_offer = state.get(
            "current_public_offer_paise", runtime.context.policy_snapshot.list_price_paise
        )
        directive_required = runtime.context.negotiation.active_counter_required
        recommended_counter = runtime.context.negotiation.recommended_counter_paise

        if directive_required and recommended_counter is not None:
            feedback = ReplanFeedback(
                status="rejected",
                reason="active_counter_required",
                seller_position="COUNTER_REQUIRED",
                current_public_offer_paise=current_public_offer,
                eligible_tactics=["counter"],
            )
        else:
            can_concede = state.get("can_make_new_concession", True)
            tactics = (
                [
                    "counter",
                    "offer_bundle",
                    "hold",
                    "probe_budget",
                    "value_sell",
                    "clarify",
                ]
                if can_concede
                else [
                    "hold",
                    "probe_budget",
                    "value_sell",
                    "clarify",
                ]
            )
            feedback = ReplanFeedback(
                status="rejected",
                reason="candidate_not_authorized",
                seller_position="REPLAN_OR_HOLD",
                current_public_offer_paise=current_public_offer,
                eligible_tactics=tactics,
            )
        events = list(state.get("events", []))
        events.append("replan_attempt")
        return {
            "replan_count": replan_count,
            "replan_feedback": feedback.model_dump(mode="json"),
            "events": events,
        }

    async def approve_outcome(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        decision = AgentDecision.model_validate(state["decision"])
        bundle_name = None
        if decision.bundle_id:
            for b in runtime.context.negotiation.allowed_bundles or []:
                if b.get("id") == decision.bundle_id:
                    bundle_name = b.get("name")
                    break

        allowlist = [
            runtime.context.policy_snapshot.list_price_paise,
            state.get("current_public_offer_paise", runtime.context.policy_snapshot.list_price_paise),
        ]
        if decision.proposed_amount_paise:
            allowlist.append(decision.proposed_amount_paise)
        if runtime.context.buyer_offer_paise:
            allowlist.append(runtime.context.buyer_offer_paise)

        outcome = SafeOutcome(
            action=decision.action,
            status="approved" if decision.action != AgentAction.ACCEPT else "agreed",
            validated_amount_paise=decision.proposed_amount_paise,
            validated_bundle_id=decision.bundle_id,
            bundle_name=bundle_name,
            response_goal=decision.response_goal,
            buyer_intent=decision.intent,
            strategy=decision.strategy,
            replan_count=state.get("replan_count", 0),
            validation_passed=True,
            violations=[],
            public_allowlist_paise=allowlist,
        )
        events = list(state.get("events", []))
        events.append("safe_outcome_derived")
        if decision.action == AgentAction.ACCEPT:
            events.append("acceptance_authorized")

        return {
            "safe_outcome": outcome.model_dump(mode="json"),
            "events": events,
        }

    async def fallback_safe_outcome(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        current_public_offer = state.get(
            "current_public_offer_paise", runtime.context.policy_snapshot.list_price_paise
        )
        allowlist = [
            runtime.context.policy_snapshot.list_price_paise,
            current_public_offer,
        ]
        if runtime.context.buyer_offer_paise:
            allowlist.append(runtime.context.buyer_offer_paise)

        violations = list(state.get("violations", []))
        outcome = SafeOutcome(
            action=AgentAction.COUNTER,
            status="held",
            validated_amount_paise=current_public_offer,
            response_goal="hold current commercial position firmly while engaging buyer naturally",
            buyer_intent=BuyerIntent(state.get("buyer_intent", "other")),
            strategy=NegotiationStrategy.HOLD,
            replan_count=state.get("replan_count", 0),
            validation_passed=False,
            violations=violations,
            public_allowlist_paise=allowlist,
        )
        events = list(state.get("events", []))
        events.append("safe_outcome_derived")
        return {
            "safe_outcome": outcome.model_dump(mode="json"),
            "events": events,
        }

    async def compose_safe_response(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        safe_outcome = SafeOutcome.model_validate(state["safe_outcome"])
        try:
            raw_text = await runtime.context.model.compose(
                runtime.context.negotiation, safe_outcome
            )
        except Exception:
            raw_text = ResponseSafetyValidator.fallback_response(
                safe_outcome,
                current_public_offer_paise=state.get(
                    "current_public_offer_paise",
                    runtime.context.policy_snapshot.list_price_paise,
                ),
            )
        return {"raw_composed_text": raw_text}

    async def validate_response_safety(
        state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        safe_outcome = SafeOutcome.model_validate(state["safe_outcome"])
        raw_text = state.get("raw_composed_text", "")
        current_public_offer = state.get(
            "current_public_offer_paise", runtime.context.policy_snapshot.list_price_paise
        )
        sanitized = ResponseSafetyValidator.validate_and_sanitize(
            raw_text,
            safe_outcome,
            list_price_paise=runtime.context.policy_snapshot.list_price_paise,
            current_public_offer_paise=current_public_offer,
            buyer_offer_paise=runtime.context.buyer_offer_paise,
        )
        events = list(state.get("events", []))
        events.append("counter_response_generated")
        return {
            "response_text": sanitized,
            "events": events,
        }

    async def respond(state: NegotiationState) -> dict[str, object]:
        return {
            "candidate_persistable": True,
            "response_text": state["response_text"],
        }

    graph = StateGraph(NegotiationState, context_schema=GraphRuntimeContext)
    graph.add_node("observe_deal", observe_deal)
    graph.add_node("plan_and_propose", plan_and_propose)
    graph.add_node("validate_candidate", validate_candidate)
    graph.add_node("replan_feedback", replan_feedback)
    graph.add_node("approve_outcome", approve_outcome)
    graph.add_node("fallback_safe_outcome", fallback_safe_outcome)
    graph.add_node("compose_safe_response", compose_safe_response)
    graph.add_node("validate_response_safety", validate_response_safety)
    graph.add_node("respond", respond)

    graph.add_edge(START, "observe_deal")
    graph.add_edge("observe_deal", "plan_and_propose")
    graph.add_edge("plan_and_propose", "validate_candidate")
    graph.add_conditional_edges(
        "validate_candidate",
        route_validation,
        {
            "approve_outcome": "approve_outcome",
            "replan_feedback": "replan_feedback",
            "fallback_safe_outcome": "fallback_safe_outcome",
        },
    )
    graph.add_edge("replan_feedback", "plan_and_propose")
    graph.add_edge("approve_outcome", "compose_safe_response")
    graph.add_edge("fallback_safe_outcome", "compose_safe_response")
    graph.add_edge("compose_safe_response", "validate_response_safety")
    graph.add_edge("validate_response_safety", "respond")
    graph.add_edge("respond", END)

    return graph.compile(checkpointer=checkpointer)
