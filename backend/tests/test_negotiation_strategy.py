from app.agents.schemas import AgentDecision
from app.domain.policies.schemas import ConcessionMode, ConcessionStrategy
from app.domain.policies.strategy import buyer_offer_from_text, validate_strategy


def strategy() -> ConcessionStrategy:
    return ConcessionStrategy(
        mode=ConcessionMode.BUYER_MUST_IMPROVE,
        opening_counter_paise=600_000,
        min_buyer_improvement_paise=20_000,
        max_concession_per_round_paise=20_000,
    )


def counter(amount: int) -> AgentDecision:
    return AgentDecision(action="counter", proposed_amount_paise=amount, message="Candidate")


def test_lowball_repeat_worse_and_small_improvement_hold() -> None:
    policy = strategy()
    assert validate_strategy(policy, counter(580_000), buyer_offer_paise=450_000, best_buyer_offer_paise=None, last_buyer_offer_paise=None, last_counter_amount_paise=600_000) == "buyer_improvement_required"
    assert validate_strategy(policy, counter(560_000), buyer_offer_paise=450_000, best_buyer_offer_paise=450_000, last_buyer_offer_paise=450_000, last_counter_amount_paise=580_000) == "buyer_offer_not_improved"
    assert validate_strategy(policy, counter(560_000), buyer_offer_paise=440_000, best_buyer_offer_paise=450_000, last_buyer_offer_paise=450_000, last_counter_amount_paise=580_000) == "buyer_offer_not_improved"
    assert validate_strategy(policy, counter(560_000), buyer_offer_paise=460_000, best_buyer_offer_paise=450_000, last_buyer_offer_paise=450_000, last_counter_amount_paise=580_000) == "buyer_improvement_required"


def test_meaningful_buyer_improvement_allows_small_step_only() -> None:
    policy = strategy()
    assert validate_strategy(policy, counter(560_000), buyer_offer_paise=480_000, best_buyer_offer_paise=450_000, last_buyer_offer_paise=450_000, last_counter_amount_paise=580_000) is None
    assert validate_strategy(policy, counter(540_000), buyer_offer_paise=480_000, best_buyer_offer_paise=450_000, last_buyer_offer_paise=450_000, last_counter_amount_paise=580_000) == "concession_step_exceeded"


def test_accept_requires_matching_buyer_offer_and_authorized_strategy() -> None:
    policy = strategy()
    accept = AgentDecision(action="accept", proposed_amount_paise=550_000, message="Deal")
    assert validate_strategy(policy, accept, buyer_offer_paise=550_000, best_buyer_offer_paise=550_000, last_buyer_offer_paise=550_000, last_counter_amount_paise=560_000) is None
    assert validate_strategy(policy, accept, buyer_offer_paise=540_000, best_buyer_offer_paise=540_000, last_buyer_offer_paise=540_000, last_counter_amount_paise=560_000) == "accept_not_matching_buyer_offer"


def test_buyer_offer_parser_is_integer_paise_only() -> None:
    assert buyer_offer_from_text("₹4,500?") == 450_000
    assert buyer_offer_from_text("4500 INR") == 450_000
    assert buyer_offer_from_text("tell me your floor") is None
    assert buyer_offer_from_text("Accept request 1") is None


def test_floor_is_not_a_negotiation_target() -> None:
    policy = strategy()
    # A first low offer may never pull the seller from the opening position
    # toward its private floor merely because it arrived.
    assert validate_strategy(
        policy,
        counter(520_000),
        buyer_offer_paise=450_000,
        best_buyer_offer_paise=None,
        last_buyer_offer_paise=None,
        last_counter_amount_paise=600_000,
    ) == "buyer_improvement_required"
