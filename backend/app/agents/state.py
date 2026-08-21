from __future__ import annotations

from typing import TypedDict


class NegotiationState(TypedDict, total=False):
    deal_id: str
    offer_id: str
    policy_version_id: str
    buyer_message_id: str
    history_message_ids: list[str]
    round: int
    commercial_rounds_used: int
    current_public_offer_paise: int
    can_make_new_concession: bool
    last_counter_amount_paise: int | None
    best_buyer_offer_paise: int | None
    last_buyer_offer_paise: int | None
    buyer_message: str
    buyer_offer_paise: int | None
    buyer_intent: str | None
    strategy: str | None
    decision: dict[str, object]
    current_candidate_amount_paise: int | None
    candidate_action: str | None
    last_bundle_id: str | None
    candidate_validation_status: str | None
    attempts: list[dict[str, object]]
    replan_count: int
    replan_feedback: dict[str, object] | None
    safe_outcome: dict[str, object]
    response_text: str
    events: list[str]
    is_valid: bool
    violations: list[str]
    raw_composed_text: str
    trusted_context_loaded: bool
    candidate_persistable: bool
