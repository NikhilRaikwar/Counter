from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, StrictInt

from app.agents.schemas import AgentAction, AgentDecision


class PolicyViolationCode(StrEnum):
    PRICE_BELOW_FLOOR = "price_below_floor"
    PRICE_ABOVE_LIST = "price_above_list"
    DISCOUNT_EXCEEDS_LIMIT = "discount_exceeds_limit"
    MAX_ROUNDS_EXCEEDED = "max_rounds_exceeded"
    BUNDLE_NOT_FOUND = "bundle_not_found"
    BUNDLE_NOT_ALLOWED = "bundle_not_allowed"
    ACTION_NOT_ALLOWED = "action_not_allowed"
    CURRENCY_MISMATCH = "currency_mismatch"
    STALE_POLICY = "stale_policy"
    DEAL_NOT_ACTIVE = "deal_not_active"
    MALFORMED_DECISION = "malformed_decision"


class MerchantPolicySnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: str
    offer_id: str
    currency: str
    list_price_paise: StrictInt
    floor_price_paise: StrictInt
    max_discount_paise: StrictInt
    max_rounds: StrictInt
    allowed_bundles: tuple[dict[str, Any], ...] = ()
    allowed_actions: frozenset[str] = frozenset()


class DealPolicyState(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    offer_id: str
    policy_version_id: str
    currency: str
    status: str
    round: StrictInt
    agreement_locked: bool = False


class PolicyValidationResult(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    allowed: bool
    violations: tuple[PolicyViolationCode, ...]
    validated_amount_paise: StrictInt | None = None
    validated_bundle_id: str | None = None


ACTION_AUTHORITY = {
    AgentAction.COUNTER: "negotiate_price",
    AgentAction.OFFER_BUNDLE: "offer_bundle",
    AgentAction.ACCEPT: "accept_deal",
}
PRICE_ACTIONS = frozenset(ACTION_AUTHORITY)


def validate_decision(
    policy: MerchantPolicySnapshot,
    deal: DealPolicyState,
    decision: AgentDecision,
) -> PolicyValidationResult:
    """Validate an untrusted proposal using only immutable inputs and arithmetic."""

    violations: list[PolicyViolationCode] = []

    def add(code: PolicyViolationCode) -> None:
        if code not in violations:
            violations.append(code)

    if deal.policy_version_id != policy.id or deal.offer_id != policy.offer_id:
        add(PolicyViolationCode.STALE_POLICY)
    if deal.currency != policy.currency:
        add(PolicyViolationCode.CURRENCY_MISMATCH)
    if deal.status != "negotiating" or deal.agreement_locked:
        add(PolicyViolationCode.DEAL_NOT_ACTIVE)
    # The action at exactly max_rounds is allowed; max_rounds + 1 is blocked.
    if deal.round > policy.max_rounds:
        add(PolicyViolationCode.MAX_ROUNDS_EXCEEDED)

    required_authority = ACTION_AUTHORITY.get(decision.action)
    if required_authority is not None and required_authority not in policy.allowed_actions:
        add(PolicyViolationCode.ACTION_NOT_ALLOWED)

    amount = decision.proposed_amount_paise
    if decision.action in PRICE_ACTIONS:
        if amount is None or isinstance(amount, bool) or not isinstance(amount, int) or amount <= 0:
            add(PolicyViolationCode.MALFORMED_DECISION)
        else:
            if amount < policy.floor_price_paise:
                add(PolicyViolationCode.PRICE_BELOW_FLOOR)
            if amount > policy.list_price_paise:
                add(PolicyViolationCode.PRICE_ABOVE_LIST)
            if policy.list_price_paise - amount > policy.max_discount_paise:
                add(PolicyViolationCode.DISCOUNT_EXCEEDS_LIMIT)

    bundle_id = decision.bundle_id
    if decision.action == AgentAction.OFFER_BUNDLE or bundle_id is not None:
        if bundle_id is None:
            add(PolicyViolationCode.MALFORMED_DECISION)
        else:
            bundle_ids = {item.get("id") for item in policy.allowed_bundles}
            if bundle_id not in bundle_ids:
                add(PolicyViolationCode.BUNDLE_NOT_FOUND)
                add(PolicyViolationCode.BUNDLE_NOT_ALLOWED)

    allowed = not violations
    return PolicyValidationResult(
        allowed=allowed,
        violations=tuple(violations),
        validated_amount_paise=amount if allowed and decision.action in PRICE_ACTIONS else None,
        validated_bundle_id=bundle_id if allowed else None,
    )
