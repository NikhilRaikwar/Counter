from __future__ import annotations

import re

from app.agents.schemas import AgentAction, AgentDecision
from app.domain.policies.schemas import ConcessionMode, ConcessionStrategy

_EXPLICIT_INR_AMOUNT = re.compile(
    r"(?:₹\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:INR|rupees?))", re.IGNORECASE
)
_STANDALONE_INR_AMOUNT = re.compile(r"^\s*(\d[\d,]*)\s*[?!.]?\s*$")


def buyer_offer_from_text(text: str) -> int | None:
    """Extract only whole-INR, deterministic buyer offers; ambiguous text is not economic input."""
    match = _EXPLICIT_INR_AMOUNT.search(text)
    amount = (match.group(1) or match.group(2)) if match else None
    if amount is None:
        standalone = _STANDALONE_INR_AMOUNT.match(text)
        amount = standalone.group(1) if standalone else None
    if amount is None:
        return None
    try:
        rupees = int(amount.replace(",", ""))
    except ValueError:
        return None
    return rupees * 100 if rupees > 0 else None


def validate_strategy(
    strategy: ConcessionStrategy,
    decision: AgentDecision,
    *,
    buyer_offer_paise: int | None,
    best_buyer_offer_paise: int | None,
    last_buyer_offer_paise: int | None,
    last_counter_amount_paise: int | None,
) -> str | None:
    """Return a stable strategy violation code, or None. All inputs are canonical server state."""
    current = last_counter_amount_paise or strategy.opening_counter_paise
    if decision.action == AgentAction.ACCEPT:
        if not strategy.accept_buyer_offer_if_authorized:
            return "accept_not_permitted_by_strategy"
        # A clearly expressed buyer amount must be the amount accepted.  If the
        # message contains no unambiguous offer, commercial policy still decides
        # whether the model's proposed acceptance can be locked.
        if buyer_offer_paise is not None and decision.proposed_amount_paise != buyer_offer_paise:
            return "accept_not_matching_buyer_offer"
        return None
    if decision.action not in {AgentAction.COUNTER, AgentAction.OFFER_BUNDLE}:
        return None

    # This is an explicit merchant-selected strategy, not a fallback.  It is
    # useful for merchants who want to delegate discretionary concessions while
    # the independent commercial policy gate still constrains every price.
    if strategy.mode is ConcessionMode.IMMEDIATE:
        return None
    if current is None or decision.proposed_amount_paise is None or decision.proposed_amount_paise >= current:
        return None
    if strategy.mode == ConcessionMode.HOLD_FIRM:
        return "concession_not_permitted"
    if buyer_offer_paise is None or best_buyer_offer_paise is None:
        return "buyer_improvement_required"
    if last_buyer_offer_paise is not None and buyer_offer_paise <= last_buyer_offer_paise:
        return "buyer_offer_not_improved"
    if buyer_offer_paise < best_buyer_offer_paise + strategy.min_buyer_improvement_paise:
        return "buyer_improvement_required"
    if current - decision.proposed_amount_paise > strategy.max_concession_per_round_paise:
        return "concession_step_exceeded"
    return None
