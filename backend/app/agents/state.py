from __future__ import annotations

from typing import TypedDict


class NegotiationState(TypedDict, total=False):
    deal_id: str
    offer_id: str
    policy_version_id: str
    buyer_message_id: str
    history_message_ids: list[str]
    round: int
    last_counter_amount_paise: int | None
    current_candidate_amount_paise: int | None
    candidate_action: str | None
    last_bundle_id: str | None
    candidate_validation_status: str | None
    decision: dict[str, object]
    model_metadata: dict[str, object]
    response_text: str
    trusted_context_loaded: bool
    candidate_persistable: bool
