from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from langgraph.graph import END, START, StateGraph
from langgraph.runtime import Runtime

from app.agents.model import NegotiationModel, NegotiationProposal
from app.agents.prompts import NegotiationContext
from app.agents.state import NegotiationState


@dataclass(frozen=True, slots=True)
class GraphRuntimeContext:
    model: NegotiationModel
    negotiation: NegotiationContext
    history_message_ids: list[str]


def build_negotiation_graph(checkpointer: Any) -> Any:
    async def buyer_turn(state: NegotiationState) -> dict[str, object]:
        return {"buyer_message_id": state["buyer_message_id"]}

    async def load_trusted_context(
        _state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        del runtime
        return {"trusted_context_loaded": True}

    async def load_deal_memory(
        _state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        return {"history_message_ids": runtime.context.history_message_ids}

    async def plan_negotiation(
        _state: NegotiationState, runtime: Runtime[GraphRuntimeContext]
    ) -> dict[str, object]:
        proposal: NegotiationProposal = await runtime.context.model.propose(runtime.context.negotiation)
        return {
            "decision": proposal.decision.model_dump(mode="json"),
            "response_text": proposal.decision.message,
            "model_metadata": {
                "model": proposal.metadata.model,
                "latency_ms": proposal.metadata.latency_ms,
                "prompt_tokens": proposal.metadata.prompt_tokens,
                "completion_tokens": proposal.metadata.completion_tokens,
                "total_tokens": proposal.metadata.total_tokens,
                "fallback_used": proposal.metadata.fallback_used,
            },
        }

    async def structured_agent_decision(state: NegotiationState) -> dict[str, object]:
        decision = state["decision"]
        return {
            "candidate_action": decision["action"],
            "current_candidate_amount_paise": decision.get("proposed_amount_paise"),
            "last_bundle_id": decision.get("bundle_id"),
            "candidate_validation_status": "pending",
        }

    async def persist_candidate(_state: NegotiationState) -> dict[str, object]:
        # Application DB persistence occurs transactionally after graph completion.
        return {"candidate_persistable": True}

    async def respond(state: NegotiationState) -> dict[str, object]:
        return {"response_text": state["response_text"]}

    graph = StateGraph(NegotiationState, context_schema=GraphRuntimeContext)
    graph.add_node("buyer_turn", buyer_turn)
    graph.add_node("load_trusted_context", load_trusted_context)
    graph.add_node("load_deal_memory", load_deal_memory)
    graph.add_node("plan_negotiation", plan_negotiation)
    graph.add_node("structured_agent_decision", structured_agent_decision)
    graph.add_node("persist_candidate", persist_candidate)
    graph.add_node("respond", respond)
    graph.add_edge(START, "buyer_turn")
    graph.add_edge("buyer_turn", "load_trusted_context")
    graph.add_edge("load_trusted_context", "load_deal_memory")
    graph.add_edge("load_deal_memory", "plan_negotiation")
    graph.add_edge("plan_negotiation", "structured_agent_decision")
    graph.add_edge("structured_agent_decision", "persist_candidate")
    graph.add_edge("persist_candidate", "respond")
    graph.add_edge("respond", END)
    return graph.compile(checkpointer=checkpointer)
