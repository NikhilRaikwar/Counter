import pytest

from app.agents.schemas import AgentAction, AgentDecision
from app.domain.policies.schemas import ConcessionMode, ConcessionStrategy
from app.domain.policies.strategy import (
    build_counter_directive,
    buyer_offer_from_text,
    validate_strategy,
)


def strategy() -> ConcessionStrategy:
    return ConcessionStrategy(
        mode=ConcessionMode.BUYER_MUST_IMPROVE,
        opening_counter_paise=600_000,
        min_buyer_improvement_paise=20_000,
        max_concession_per_round_paise=20_000,
        allow_first_offer_concession=False,
    )


def merchant_25k_strategy(allow_first: bool = False) -> ConcessionStrategy:
    return ConcessionStrategy(
        mode=ConcessionMode.BUYER_MUST_IMPROVE,
        opening_counter_paise=2_500_000,
        min_buyer_improvement_paise=50_000,
        max_concession_per_round_paise=125_000,
        hold_on_repeat_offer=True,
        hold_on_worse_offer=True,
        allow_first_offer_concession=allow_first,
    )


def counter(amount: int) -> AgentDecision:
    return AgentDecision(action="counter", proposed_amount_paise=amount, message="Candidate")


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("23000", 2_300_000),
        ("₹23,000", 2_300_000),
        ("₹23,000?", 2_300_000),
        ("Rs 23000", 2_300_000),
        ("Rs. 23,000", 2_300_000),
        ("INR 23000", 2_300_000),
        ("23000 INR", 2_300_000),
        ("23k", 2_300_000),
        ("23.5k", 2_350_000),
        ("I'm around 21.5k", 2_150_000),
        ("I can stretch to 23k", 2_300_000),
        ("my budget is 22k", 2_200_000),
        ("can you do 23000", 2_300_000),
        ("Can you do ₹23,000?", 2_300_000),
        ("Can you do ₹23,000 for the audit?", 2_300_000),
        ("My budget is ₹23,000.", 2_300_000),
        ("My budget is 23k for the 2-week sprint.", 2_300_000),
        ("I can pay 23k.", 2_300_000),
        ("How about ₹23k?", 2_300_000),
        ("I can stretch to 23.5k.", 2_350_000),

        # Must NOT be treated as buyer offers:
        ("What's 18% GST on ₹23,000?", None),
        ("What's GST on ₹23,000?", None),
        ("How much is ₹23,000 in USD?", None),
        ("I bought my laptop for ₹23,000 last year.", None),
        ("Explain tax on INR 23000.", None),
        ("what happened in 1947?", None),
        ("we have 500 users", None),
        ("the sprint takes 2 weeks", None),
        ("Newton published this in 1687", None),
        ("write 100 lines of code", None),
        ("tell me your floor", None),
        ("Accept request 1", None),
    ],
)
def test_buyer_offer_parser_is_commercially_contextual(
    text: str,
    expected: int | None,
) -> None:
    assert buyer_offer_from_text(text) == expected


def test_first_buyer_offer_inside_floor_creates_counter_opportunity_when_allowed() -> None:
    policy = merchant_25k_strategy(allow_first=True)

    directive = build_counter_directive(
        policy,
        buyer_offer_paise=2_300_000,
        best_buyer_offer_paise=None,
        last_buyer_offer_paise=None,
        current_public_offer_paise=2_500_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )

    assert directive.active_counter_required is True
    assert directive.recommended_counter_paise == 2_400_000


def test_first_buyer_offer_inside_floor_holds_when_allow_first_is_false() -> None:
    policy = merchant_25k_strategy(allow_first=False)

    directive = build_counter_directive(
        policy,
        buyer_offer_paise=2_300_000,
        best_buyer_offer_paise=None,
        last_buyer_offer_paise=None,
        current_public_offer_paise=2_500_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )

    assert directive.active_counter_required is False
    assert directive.reason == "buyer_improvement_required"


def test_first_buyer_offer_below_floor_does_not_force_concession() -> None:
    policy = merchant_25k_strategy(allow_first=True)

    directive = build_counter_directive(
        policy,
        buyer_offer_paise=1_900_000,
        best_buyer_offer_paise=None,
        last_buyer_offer_paise=None,
        current_public_offer_paise=2_500_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )

    assert directive.active_counter_required is False


def test_meaningful_improvement_below_floor_can_earn_safe_seller_move() -> None:
    policy = merchant_25k_strategy(allow_first=False)

    directive = build_counter_directive(
        policy,
        buyer_offer_paise=1_950_000,
        best_buyer_offer_paise=1_850_000,
        last_buyer_offer_paise=1_850_000,
        current_public_offer_paise=2_500_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )

    assert directive.active_counter_required is True
    assert directive.recommended_counter_paise is not None
    assert directive.recommended_counter_paise >= 2_000_000
    assert directive.recommended_counter_paise > 1_950_000


def test_repeat_and_worse_offers_never_force_counter() -> None:
    policy = merchant_25k_strategy(allow_first=True)

    repeated = build_counter_directive(
        policy,
        buyer_offer_paise=2_200_000,
        best_buyer_offer_paise=2_200_000,
        last_buyer_offer_paise=2_200_000,
        current_public_offer_paise=2_400_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )

    worse = build_counter_directive(
        policy,
        buyer_offer_paise=2_100_000,
        best_buyer_offer_paise=2_200_000,
        last_buyer_offer_paise=2_200_000,
        current_public_offer_paise=2_400_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )

    assert repeated.active_counter_required is False
    assert worse.active_counter_required is False


def test_seller_counter_cannot_undercut_buyer() -> None:
    policy = merchant_25k_strategy(allow_first=True)

    decision = AgentDecision(
        intent="make_offer",
        strategy="counter",
        action="counter",
        proposed_amount_paise=2_100_000,
        response_goal="counter",
    )

    violation = validate_strategy(
        policy,
        decision,
        buyer_offer_paise=2_300_000,
        best_buyer_offer_paise=None,
        last_buyer_offer_paise=None,
        last_counter_amount_paise=2_500_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )

    assert violation == "seller_counter_below_buyer_offer"


def test_first_authorized_offer_rejects_hold_when_active_counter_required() -> None:
    policy = merchant_25k_strategy(allow_first=True)

    hold = AgentDecision(
        intent="make_offer",
        strategy="hold",
        action="refuse",
        proposed_amount_paise=None,
        response_goal="hold",
    )

    violation = validate_strategy(
        policy,
        hold,
        buyer_offer_paise=2_300_000,
        best_buyer_offer_paise=None,
        last_buyer_offer_paise=None,
        last_counter_amount_paise=2_500_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )

    assert violation == "active_counter_required"


def test_hold_firm_custom_policy_never_receives_automatic_counter() -> None:
    hold_firm_policy = ConcessionStrategy(
        mode=ConcessionMode.HOLD_FIRM,
        opening_counter_paise=2_500_000,
    )
    directive = build_counter_directive(
        hold_firm_policy,
        buyer_offer_paise=2_300_000,
        best_buyer_offer_paise=None,
        last_buyer_offer_paise=None,
        current_public_offer_paise=2_500_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )
    assert directive.active_counter_required is False
    assert directive.reason == "merchant_holds_firm"


def test_immediate_policy_can_counter_on_first_authorized_offer() -> None:
    immediate_policy = ConcessionStrategy(
        mode=ConcessionMode.IMMEDIATE,
        opening_counter_paise=2_500_000,
        max_concession_per_round_paise=150_000,
    )
    directive = build_counter_directive(
        immediate_policy,
        buyer_offer_paise=2_200_000,
        best_buyer_offer_paise=None,
        last_buyer_offer_paise=None,
        current_public_offer_paise=2_500_000,
        list_price_paise=2_500_000,
        floor_price_paise=2_000_000,
        max_discount_paise=500_000,
        can_make_new_concession=True,
    )
    assert directive.active_counter_required is True
    assert directive.recommended_counter_paise == 2_350_000


def test_accept_requires_matching_buyer_offer_and_authorized_strategy() -> None:
    policy = strategy()
    accept = AgentDecision(action="accept", proposed_amount_paise=550_000, message="Deal")
    assert validate_strategy(policy, accept, buyer_offer_paise=550_000, best_buyer_offer_paise=550_000, last_buyer_offer_paise=550_000, last_counter_amount_paise=560_000) is None
    assert validate_strategy(policy, accept, buyer_offer_paise=540_000, best_buyer_offer_paise=540_000, last_buyer_offer_paise=540_000, last_counter_amount_paise=560_000) == "accept_not_matching_buyer_offer"
