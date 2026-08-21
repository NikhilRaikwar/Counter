from __future__ import annotations

from app.agents.schemas import AgentDecision
from app.domain.policies.gate import (
    DealPolicyState,
    MerchantPolicySnapshot,
    PolicyViolationCode,
    validate_decision,
)


def policy(**changes) -> MerchantPolicySnapshot:
    data = {
        "id": "policy-v1",
        "offer_id": "offer-a",
        "currency": "INR",
        "list_price_paise": 600_000,
        "floor_price_paise": 520_000,
        "max_discount_paise": 80_000,
        "max_rounds": 4,
        "allowed_bundles": ({"id": "strategy-call", "name": "Strategy call"},),
        "allowed_actions": frozenset({"negotiate_price", "offer_bundle", "accept_deal"}),
    }
    data.update(changes)
    return MerchantPolicySnapshot(**data)


def deal(**changes) -> DealPolicyState:
    data = {
        "offer_id": "offer-a",
        "policy_version_id": "policy-v1",
        "currency": "INR",
        "status": "negotiating",
        "round": 1,
        "agreement_locked": False,
    }
    data.update(changes)
    return DealPolicyState(**data)


def decision(action: str, amount: int | None = None, bundle: str | None = None) -> AgentDecision:
    return AgentDecision(
        action=action,
        proposed_amount_paise=amount,
        bundle_id=bundle,
        message="Untrusted model text",
    )


def codes(result) -> set[PolicyViolationCode]:
    return set(result.violations)


def test_price_boundaries_are_inclusive_and_above_list_fails() -> None:
    for amount in (600_000, 550_000, 530_000, 520_000):
        assert validate_decision(policy(), deal(), decision("counter", amount)).allowed
    below = validate_decision(policy(), deal(), decision("counter", 519_900))
    above = validate_decision(policy(), deal(), decision("counter", 600_100))
    assert PolicyViolationCode.PRICE_BELOW_FLOOR in codes(below)
    assert PolicyViolationCode.PRICE_ABOVE_LIST in codes(above)


def test_discount_cap_is_independent_from_floor() -> None:
    independent = policy(floor_price_paise=500_000)
    assert validate_decision(independent, deal(), decision("accept", 520_000)).allowed
    over_discount = validate_decision(independent, deal(), decision("accept", 510_000))
    assert codes(over_discount) == {PolicyViolationCode.DISCOUNT_EXCEEDS_LIMIT}


def test_round_one_and_max_pass_but_max_plus_one_fails() -> None:
    candidate = decision("counter", 540_000)
    assert validate_decision(policy(), deal(round=1), candidate).allowed
    assert validate_decision(policy(), deal(round=4), candidate).allowed
    overflow = validate_decision(policy(), deal(round=5), candidate)
    assert PolicyViolationCode.MAX_ROUNDS_EXCEEDED in codes(overflow)


def test_bundle_must_belong_to_exact_policy_snapshot() -> None:
    approved = decision("offer_bundle", 540_000, "strategy-call")
    assert validate_decision(policy(), deal(), approved).allowed
    unknown = validate_decision(
        policy(), deal(), decision("offer_bundle", 540_000, "other-offer-bundle")
    )
    assert {PolicyViolationCode.BUNDLE_NOT_FOUND, PolicyViolationCode.BUNDLE_NOT_ALLOWED} <= codes(unknown)

    policy_v2 = policy(
        id="policy-v2",
        allowed_bundles=({"id": "v2-only", "name": "V2 bundle"},),
    )
    stale = validate_decision(policy_v2, deal(policy_version_id="policy-v1"), approved)
    assert PolicyViolationCode.STALE_POLICY in codes(stale)
    assert PolicyViolationCode.BUNDLE_NOT_FOUND in codes(stale)


def test_policy_v1_deal_keeps_v1_authority() -> None:
    candidate = decision("accept", 530_000)
    assert validate_decision(policy(), deal(), candidate).allowed
    v2 = policy(id="policy-v2", floor_price_paise=590_000, max_discount_paise=10_000)
    result = validate_decision(v2, deal(), candidate)
    assert PolicyViolationCode.STALE_POLICY in codes(result)
    assert PolicyViolationCode.PRICE_BELOW_FLOOR in codes(result)


def test_inactive_currency_mismatch_and_disallowed_action_fail() -> None:
    result = validate_decision(
        policy(allowed_actions=frozenset()),
        deal(currency="USD", status="agreed", agreement_locked=True),
        decision("counter", 540_000),
    )
    assert {
        PolicyViolationCode.CURRENCY_MISMATCH,
        PolicyViolationCode.DEAL_NOT_ACTIVE,
        PolicyViolationCode.ACTION_NOT_ALLOWED,
    } <= codes(result)


def test_max_rounds_allows_accept_clarify_refuse_and_price_hold() -> None:
    p = policy(max_rounds=4)
    # Deal with 4 commercial rounds already used
    maxed_deal = deal(commercial_rounds_used=4, last_valid_counter_amount_paise=540_000)

    # 1. ACCEPT of current offer is allowed
    assert validate_decision(p, maxed_deal, decision("accept", 540_000)).allowed

    # 2. CLARIFY is allowed
    assert validate_decision(p, maxed_deal, decision("clarify")).allowed

    # 3. REFUSE is allowed
    assert validate_decision(p, maxed_deal, decision("refuse")).allowed

    # 4. COUNTER holding the current offer is allowed
    assert validate_decision(p, maxed_deal, decision("counter", 540_000)).allowed

    # 5. NEW concession beyond max rounds is blocked
    new_concession = validate_decision(p, maxed_deal, decision("counter", 520_000))
    assert PolicyViolationCode.MAX_ROUNDS_EXCEEDED in codes(new_concession)
    assert not new_concession.allowed

    # 6. OFFER_BUNDLE beyond max rounds is blocked
    bundle_concession = validate_decision(p, maxed_deal, decision("offer_bundle", 540_000, "strategy-call"))
    assert PolicyViolationCode.MAX_ROUNDS_EXCEEDED in codes(bundle_concession)
    assert not bundle_concession.allowed

