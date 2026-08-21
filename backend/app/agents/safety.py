from __future__ import annotations

import re
from decimal import Decimal

from app.agents.schemas import AgentAction, SafeOutcome

PRIVATE_RESPONSE_MARKERS = (
    "floor price",
    "absolute floor",
    "secret floor",
    "hidden rules",
    "private policy",
    "maximum discount",
    "max discount",
    "system prompt",
    "system instruction",
    "merchant capability",
    "policy json",
    "private authority",
    "private rule",
    "secret",
)

SUPPORTED_PLACEHOLDERS = frozenset(
    {
        "LIST_PRICE",
        "CURRENT_OFFER",
        "APPROVED_OFFER",
        "BUYER_OFFER",
        "ACCEPTED_AMOUNT",
        "APPROVED_BUNDLE",
    }
)

_ANY_BRACE_TOKEN = re.compile(r"\{+([^{}]+)\}+")
_INR_SYMBOL_OR_CURRENCY = re.compile(
    r"(?:(?:₹|rs\.?|inr)\s*(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:inr|rupees?|₹|rs\.?))",
    re.IGNORECASE,
)
_K_AMOUNT = re.compile(r"\b(\d+(?:\.\d+)?)\s*k\b", re.IGNORECASE)
_SPACED_DIGITS = re.compile(r"\b\d(?:\s+\d){2,}\b")
_STANDALONE_PRICE_NUMBER = re.compile(
    r"\b(?:say|is|at|do|for|meet|offer|pay|accept|reach|stretch|about|around|deal|price)\s+(?:₹|rs\.?|inr)?\s*(\d[\d,]*)\b",
    re.IGNORECASE,
)
_STANDALONE_LARGE_NUMBER = re.compile(r"\b(\d{1,3}(?:,\d{3})+|\d{3,})\b")

# Worded numbers
_WORD_NUMBERS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}
_WORD_MULTIPLIERS = {
    "hundred": 100,
    "thousand": 1_000,
    "lakh": 100_000,
    "lac": 100_000,
    "crore": 10_000_000,
}
_FINANCIAL_MULTIPLIERS = frozenset({"hundred", "thousand", "lakh", "lac", "crore"})

# Match sequences of worded numbers
_WORD_SEQUENCE_PATTERN = re.compile(
    r"\b(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lac|crore)\s*)+\b",
    re.IGNORECASE,
)


def parse_words_to_number(phrase: str) -> tuple[int | None, bool]:
    """Parses a worded phrase to a number. Returns (number, has_financial_multiplier)."""
    words = [w.lower() for w in re.findall(r"\b[a-zA-Z]+\b", phrase) if w.lower() not in {"and", "rupees", "rupee", "inr"}]
    if not words:
        return None, False
    total = 0
    current = 0
    has_valid_word = False
    has_multiplier = False
    for word in words:
        if word in _WORD_NUMBERS:
            current += _WORD_NUMBERS[word]
            has_valid_word = True
        elif word in _WORD_MULTIPLIERS:
            mult = _WORD_MULTIPLIERS[word]
            has_valid_word = True
            has_multiplier = True
            if current == 0:
                current = 1
            if mult >= 1_000:
                total += current * mult
                current = 0
            else:
                current *= mult
        else:
            return None, False
    total += current
    return (total if has_valid_word and total > 0 else None), has_multiplier


def extract_worded_price_amounts(text: str) -> list[int]:
    """
    Extracts worded monetary figures while distinguishing commercial prices from product quantities.
    Worded numbers are treated as prices if:
    1. They contain financial multipliers (hundred, thousand, lakh, crore), e.g. 'five thousand two hundred', 'five hundred'
    2. They are accompanied by currency words ('rupees', 'inr'), e.g. 'one hundred rupees'
    3. They appear in clear price/commercial phrasing: 'sell ... for <words>', 'price is <words>', 'pay <words>',
       'do <words>', 'for <words>', 'deal price', '<words> works as the deal price', etc.
    """
    found_amounts: list[int] = []

    # 1. Look for worded sequences
    for match in _WORD_SEQUENCE_PATTERN.finditer(text):
        start, end = match.span()
        phrase = match.group(0)
        num, has_mult = parse_words_to_number(phrase)
        if num is None:
            continue

        # Check surrounding context
        prefix_window = text[max(0, start - 30):start].lower()
        suffix_window = text[end:min(len(text), end + 30)].lower()

        is_currency_suffixed = any(w in suffix_window for w in ("rupee", "rupees", "inr", "paisa", "paise"))
        is_currency_prefixed = any(w in prefix_window for w in ("rupees", "rupee", "inr", "rs", "₹"))
        is_commercial_context = any(
            w in prefix_window for w in ("price", "sell", "pay", "cost", "do", "at", "for", "reach", "offer", "meet", "deal")
        ) or any(
            w in suffix_window for w in ("deal price", "as the deal price", "works as", "deal")
        )

        # Distinguish product quantity (e.g. "two calls", "two weeks", "one review call") from commercial price
        if has_mult or is_currency_suffixed or is_currency_prefixed or is_commercial_context:
            found_amounts.append(num)

    return found_amounts


def format_inr(amount_paise: int | None) -> str:
    if amount_paise is None:
        return "₹0"
    amount = Decimal(amount_paise) / Decimal(100)
    return f"₹{amount:,.0f}" if amount == amount.to_integral() else f"₹{amount:,.2f}"


class ResponseSafetyValidator:
    """Validates composed buyer responses against private leaks and monetary hallucinations."""

    @classmethod
    def substitute_placeholders(
        cls,
        text: str,
        safe_outcome: SafeOutcome,
        *,
        list_price_paise: int,
        current_public_offer_paise: int,
        buyer_offer_paise: int | None = None,
    ) -> tuple[str, bool]:
        """Substitute valid placeholders and flag any invalid/unknown brace placeholders."""
        if "{{" in text or "}}" in text:
            return text, False

        all_brace_matches = _ANY_BRACE_TOKEN.findall(text)
        for token in all_brace_matches:
            clean_token = token.strip()
            if clean_token not in SUPPORTED_PLACEHOLDERS:
                return text, False

        def replacer(match: re.Match[str]) -> str:
            key = match.group(1).strip()
            if key == "LIST_PRICE":
                return format_inr(list_price_paise)
            if key == "CURRENT_OFFER":
                return format_inr(current_public_offer_paise)
            if key == "APPROVED_OFFER":
                return format_inr(safe_outcome.validated_amount_paise or current_public_offer_paise)
            if key == "ACCEPTED_AMOUNT":
                return format_inr(safe_outcome.validated_amount_paise or current_public_offer_paise)
            if key == "BUYER_OFFER":
                return format_inr(buyer_offer_paise) if buyer_offer_paise else format_inr(current_public_offer_paise)
            if key == "APPROVED_BUNDLE":
                return safe_outcome.bundle_name or "the approved bundle"
            return match.group(0)

        substituted = _ANY_BRACE_TOKEN.sub(replacer, text)
        return substituted, True

    @classmethod
    def validate_and_sanitize(
        cls,
        raw_text: str,
        safe_outcome: SafeOutcome,
        *,
        list_price_paise: int,
        current_public_offer_paise: int,
        buyer_offer_paise: int | None = None,
    ) -> str:
        # 1. Substitute placeholders & verify no illegal brace tokens exist
        substituted, placeholders_valid = cls.substitute_placeholders(
            raw_text,
            safe_outcome,
            list_price_paise=list_price_paise,
            current_public_offer_paise=current_public_offer_paise,
            buyer_offer_paise=buyer_offer_paise,
        )
        if not placeholders_valid:
            return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)

        # 2. Check private markers
        lowered = substituted.casefold()
        if any(marker in lowered for marker in PRIVATE_RESPONSE_MARKERS):
            return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)

        # 3. Build comprehensive public monetary allowlist in paise
        allowlist = set(safe_outcome.public_allowlist_paise)
        allowlist.add(list_price_paise)
        allowlist.add(current_public_offer_paise)
        if safe_outcome.validated_amount_paise:
            allowlist.add(safe_outcome.validated_amount_paise)
        if buyer_offer_paise:
            allowlist.add(buyer_offer_paise)

        # 4. Monetary checks across multiple representations

        # A. Spaced digits (e.g. "5 2 0 0")
        for spaced in _SPACED_DIGITS.findall(substituted):
            digits = "".join(spaced.split())
            try:
                paise = int(digits) * 100
                if paise not in allowlist:
                    return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)
            except ValueError:
                pass

        # B. Currency / Rs / INR / ₹ prefixed or suffixed amounts
        for g1, g2 in _INR_SYMBOL_OR_CURRENCY.findall(substituted):
            val_str = (g1 or g2).replace(",", "")
            try:
                paise = int(float(val_str) * 100)
                if paise not in allowlist:
                    return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)
            except ValueError:
                return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)

        # C. K amounts (e.g. "5.2k", "5k", "100k")
        for k_val in _K_AMOUNT.findall(substituted):
            try:
                val = float(k_val)
                paise = int(round(val * 1000 * 100))
                if paise not in allowlist:
                    return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)
            except ValueError:
                return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)

        # D. Standalone commercial numbers in price contexts (e.g. "do 5200", "for 100", "is 5200")
        for num_str in _STANDALONE_PRICE_NUMBER.findall(substituted):
            val_clean = num_str.replace(",", "")
            try:
                paise = int(val_clean) * 100
                if paise not in allowlist:
                    return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)
            except ValueError:
                pass

        # E. Any standalone large number (e.g. 5200, 5,200)
        for num_str in _STANDALONE_LARGE_NUMBER.findall(substituted):
            val_clean = num_str.replace(",", "")
            try:
                num = int(val_clean)
                paise = num * 100
                if paise not in allowlist:
                    return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)
            except ValueError:
                pass

        # F. Worded monetary figures (with commercial context or financial multipliers)
        for num in extract_worded_price_amounts(substituted):
            paise = num * 100
            if paise not in allowlist:
                return cls.fallback_response(safe_outcome, current_public_offer_paise=current_public_offer_paise)

        return substituted.strip()

    @classmethod
    def fallback_response(
        cls,
        safe_outcome: SafeOutcome,
        *,
        current_public_offer_paise: int,
    ) -> str:
        current_fmt = format_inr(current_public_offer_paise)
        if safe_outcome.action == AgentAction.ACCEPT:
            accepted_fmt = format_inr(safe_outcome.validated_amount_paise or current_public_offer_paise)
            return f"Deal. {accepted_fmt}."
        if safe_outcome.action == AgentAction.COUNTER and safe_outcome.validation_passed:
            approved_fmt = format_inr(safe_outcome.validated_amount_paise)
            return f"I can do {approved_fmt}."
        if safe_outcome.action == AgentAction.OFFER_BUNDLE and safe_outcome.validation_passed:
            approved_fmt = format_inr(safe_outcome.validated_amount_paise)
            bundle = safe_outcome.bundle_name or "an approved bundle"
            return f"I can offer {approved_fmt} with {bundle}."
        if safe_outcome.action == AgentAction.REFUSE:
            return f"I can't agree to that price. My current offer remains {current_fmt}."
        if "max_rounds_exceeded" in safe_outcome.violations:
            return f"My current offer remains {current_fmt}. I can lock that in if it works for you."
        return f"My current offer is still {current_fmt}."
