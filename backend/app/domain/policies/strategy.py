from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from app.agents.schemas import AgentAction, AgentDecision
from app.domain.policies.schemas import ConcessionMode, ConcessionStrategy

_MAX_PRICE_PAISE = 10_000_000_000

# Buyer-price language with explicit commercial negotiation phrasing.
_COMMERCIAL_AMOUNT = re.compile(
    r"""
    \b(?:
        can\s+you\s+do
        |could\s+you\s+do
        |can\s+we\s+do
        |how\s+about
        |what\s+about
        |my\s+budget\s+is
        |budget\s+is
        |my\s+offer\s+is
        |my\s+number\s+is
        |i\s+can\s+pay
        |can\s+pay
        |i\s+can\s+do
        |can\s+do
        |i\s+can\s+give
        |can\s+give
        |i\s+can\s+stretch\s+to
        |stretch\s+to
        |can\s+go(?:\s+up)?\s+to
        |i'm\s+around
        |im\s+around
        |would\s+you\s+take
        |will\s+you\s+take
    )
    \s*
    (?:₹|rs\.?|inr)?
    \s*
    (\d[\d,]*(?:\.\d+)?)
    \s*(k)?
    \b
    """,
    re.IGNORECASE | re.VERBOSE,
)

# A buyer may send an isolated amount only:
# "23000", "23k", "₹23k", "₹23,000?", "23000 INR", etc.
_AMOUNT_ONLY = re.compile(
    r"""
    ^\s*
    (?:₹|rs\.?|inr)?
    \s*
    (\d[\d,]*(?:\.\d+)?)
    \s*(k)?
    \s*(?:inr|rupees?)?
    \s*[?.!]*
    \s*$
    """,
    re.IGNORECASE | re.VERBOSE,
)


def _to_paise(raw: str, is_k: bool) -> int | None:
    try:
        normalized = raw.replace(",", "")
        value = Decimal(normalized)
    except InvalidOperation:
        return None

    if value <= 0:
        return None

    if is_k:
        value *= Decimal(1000)

    paise_decimal = (value * Decimal(100)).quantize(
        Decimal("1"),
        rounding=ROUND_HALF_UP,
    )

    try:
        paise = int(paise_decimal)
    except (ValueError, OverflowError):
        return None

    if paise <= 0 or paise > _MAX_PRICE_PAISE:
        return None

    return paise


def buyer_offer_from_text(text: str) -> int | None:
    """
    Deterministically extract an INR buyer offer.

    This intentionally prefers false negatives over false positives because
    buyer text is untrusted and parsed money can influence negotiation state.

    Accepted examples:
      ₹23,000
      ₹23,000?
      Rs 23000
      INR 23000
      23000 INR
      23k
      23.5k
      "My budget is 23k for the 2-week sprint."
      "Can you do ₹23,000 for the audit?"
      "I can stretch to 23.5k."
      "I'm around 21.5k"
      "can you do 23000"
      "How about ₹23k?"
      "I can pay 23k."

    Rejected examples:
      "What's 18% GST on ₹23,000?"
      "How much is ₹23,000 in USD?"
      "I bought my laptop for ₹23,000 last year."
      "Explain tax on INR 23000."
      "what happened in 1947?"
      "the sprint takes 2 weeks"
      "we have 500 users"
      "Newton published this in 1687"
      "write 100 lines of code"
    """
    value = text.strip()
    if not value:
        return None

    # 1. Direct isolated amount match
    match = _AMOUNT_ONLY.fullmatch(value)
    if match:
        return _to_paise(
            match.group(1),
            bool(match.group(2)),
        )

    # 2. Require explicit commercial negotiation phrasing
    match = _COMMERCIAL_AMOUNT.search(value)
    if match:
        return _to_paise(
            match.group(1),
            bool(match.group(2)),
        )

    return None


@dataclass(frozen=True, slots=True)
class CounterDirective:
    """
    Public-safe deterministic guidance for the planner.

    `recommended_counter_paise` is safe to reveal because, if chosen, it is
    itself an authorized public seller offer. It is NOT a private boundary.
    """

    active_counter_required: bool
    recommended_counter_paise: int | None
    reason: str


def build_counter_directive(
    strategy: ConcessionStrategy,
    *,
    buyer_offer_paise: int | None,
    best_buyer_offer_paise: int | None,
    last_buyer_offer_paise: int | None,
    current_public_offer_paise: int,
    list_price_paise: int,
    floor_price_paise: int,
    max_discount_paise: int,
    can_make_new_concession: bool,
    negotiate_price_allowed: bool = True,
) -> CounterDirective:
    """
    Decide deterministically whether this turn presents a real concession
    opportunity according to the deal's exact immutable ConcessionStrategy.

    A counter is eligible when:
      - negotiate_price is authorized,
      - merchant still allows a concession (rounds remain),
      - buyer made a price offer below current seller price,
      - it meets the merchant's configured concession mode:
          * IMMEDIATE: any valid buyer offer below current price
          * BUYER_MUST_IMPROVE + allow_first_offer_concession=True: first authorized offer
            or later improvement
          * BUYER_MUST_IMPROVE + allow_first_offer_concession=False: meaningful improvement only

    Repeat/worse offers never create concession eligibility.
    """
    if not negotiate_price_allowed:
        return CounterDirective(False, None, "negotiate_price_not_allowed")

    if not can_make_new_concession:
        return CounterDirective(False, None, "commercial_round_limit_reached")

    if strategy.mode is ConcessionMode.HOLD_FIRM:
        return CounterDirective(False, None, "merchant_holds_firm")

    if buyer_offer_paise is None:
        return CounterDirective(False, None, "no_buyer_price")

    current = current_public_offer_paise

    # Buyer already meets/exceeds current seller price: there is nothing to
    # counter downward. Acceptance logic may handle the turn separately.
    if buyer_offer_paise >= current:
        return CounterDirective(False, None, "buyer_meets_current_offer")

    if last_buyer_offer_paise is not None:
        if (
            strategy.hold_on_repeat_offer
            and buyer_offer_paise == last_buyer_offer_paise
        ):
            return CounterDirective(False, None, "buyer_repeated_offer")

        if (
            strategy.hold_on_worse_offer
            and buyer_offer_paise < last_buyer_offer_paise
        ):
            return CounterDirective(False, None, "buyer_offer_worsened")

    first_authorized_offer = (
        best_buyer_offer_paise is None
        and strategy.allow_first_offer_concession
        and buyer_offer_paise >= floor_price_paise
    )

    meaningful_improvement = (
        best_buyer_offer_paise is not None
        and buyer_offer_paise
        >= best_buyer_offer_paise + strategy.min_buyer_improvement_paise
    )

    if strategy.mode is ConcessionMode.IMMEDIATE:
        eligible = True
    elif strategy.mode is ConcessionMode.BUYER_MUST_IMPROVE:
        eligible = first_authorized_offer or meaningful_improvement
    else:
        eligible = False

    if not eligible:
        return CounterDirective(False, None, "buyer_improvement_required")

    # Hard lower bound from immutable merchant policy:
    effective_min_price = max(
        floor_price_paise,
        list_price_paise - max_discount_paise,
    )

    max_step = strategy.max_concession_per_round_paise
    if max_step <= 0:
        return CounterDirective(False, None, "no_concession_step_authorized")

    # Never counter BELOW what the buyer has already offered.
    minimum_safe_counter = max(
        effective_min_price,
        buyer_offer_paise,
        current - max_step,
    )

    if minimum_safe_counter >= current:
        return CounterDirective(False, None, "no_downward_room")

    # Commercially natural recommendation:
    # move approximately halfway toward buyer, but never beyond any
    # deterministic merchant constraint.
    gap = current - buyer_offer_paise
    midpoint_step = max(1, gap // 2)

    recommended = current - min(midpoint_step, max_step)
    recommended = max(recommended, minimum_safe_counter)

    if recommended >= current:
        return CounterDirective(False, None, "no_downward_room")

    return CounterDirective(
        True,
        recommended,
        "first_authorized_offer"
        if first_authorized_offer
        else "buyer_meaningfully_improved",
    )


def validate_strategy(
    strategy: ConcessionStrategy,
    decision: AgentDecision,
    *,
    buyer_offer_paise: int | None,
    best_buyer_offer_paise: int | None,
    last_buyer_offer_paise: int | None,
    last_counter_amount_paise: int | None,
    list_price_paise: int | None = None,
    floor_price_paise: int | None = None,
    max_discount_paise: int | None = None,
    can_make_new_concession: bool = True,
    negotiate_price_allowed: bool = True,
) -> str | None:
    """
    Validate negotiation strategy using canonical server state.

    This does NOT replace the independent financial Policy Gate.
    """
    current = last_counter_amount_paise or strategy.opening_counter_paise

    # Acceptance has separate semantics and must remain possible even when
    # no more concessions may be made.
    if decision.action == AgentAction.ACCEPT:
        if not strategy.accept_buyer_offer_if_authorized:
            return "accept_not_permitted_by_strategy"

        if (
            buyer_offer_paise is not None
            and decision.proposed_amount_paise != buyer_offer_paise
        ):
            return "accept_not_matching_buyer_offer"

        return None

    # Repeat/worse buyer movement never earns better seller economics.
    if (
        buyer_offer_paise is not None
        and last_buyer_offer_paise is not None
    ):
        if (
            strategy.hold_on_repeat_offer
            and buyer_offer_paise == last_buyer_offer_paise
        ):
            return "buyer_offer_not_improved"

        if (
            strategy.hold_on_worse_offer
            and buyer_offer_paise < last_buyer_offer_paise
        ):
            return "buyer_offer_not_improved"

    # If we have the policy bounds, enforce the calibrated "active counter"
    # opportunity at the deterministic strategy layer, not merely via prompt.
    if (
        current is not None
        and list_price_paise is not None
        and floor_price_paise is not None
        and max_discount_paise is not None
    ):
        directive = build_counter_directive(
            strategy,
            buyer_offer_paise=buyer_offer_paise,
            best_buyer_offer_paise=best_buyer_offer_paise,
            last_buyer_offer_paise=last_buyer_offer_paise,
            current_public_offer_paise=current,
            list_price_paise=list_price_paise,
            floor_price_paise=floor_price_paise,
            max_discount_paise=max_discount_paise,
            can_make_new_concession=can_make_new_concession,
            negotiate_price_allowed=negotiate_price_allowed,
        )

        if directive.active_counter_required:
            if decision.action != AgentAction.COUNTER:
                return "active_counter_required"

            amount = decision.proposed_amount_paise
            if amount is None or amount >= current:
                return "active_counter_required"

            if (
                buyer_offer_paise is not None
                and amount < buyer_offer_paise
            ):
                return "seller_counter_below_buyer_offer"

    if decision.action not in {
        AgentAction.COUNTER,
        AgentAction.OFFER_BUNDLE,
    }:
        return None

    if strategy.mode is ConcessionMode.IMMEDIATE:
        return None

    if (
        current is None
        or decision.proposed_amount_paise is None
        or decision.proposed_amount_paise >= current
    ):
        return None

    if strategy.mode == ConcessionMode.HOLD_FIRM:
        return "concession_not_permitted"

    # First buyer offer:
    # only permitted if allow_first_offer_concession is True and offer >= floor
    if best_buyer_offer_paise is None:
        if (
            strategy.allow_first_offer_concession
            and floor_price_paise is not None
            and buyer_offer_paise is not None
            and buyer_offer_paise >= floor_price_paise
        ):
            pass
        else:
            return "buyer_improvement_required"

    elif (
        buyer_offer_paise is None
        or buyer_offer_paise
        < best_buyer_offer_paise + strategy.min_buyer_improvement_paise
    ):
        return "buyer_improvement_required"

    if (
        current - decision.proposed_amount_paise
        > strategy.max_concession_per_round_paise
    ):
        return "concession_step_exceeded"

    if (
        buyer_offer_paise is not None
        and decision.proposed_amount_paise < buyer_offer_paise
    ):
        return "seller_counter_below_buyer_offer"

    return None
