from __future__ import annotations

import re
from dataclasses import dataclass

from app.domain.policies.schemas import ExtractionModelOutput, PolicyConflict, TrustedOfferContext

_UNSUPPORTED_CURRENCY = re.compile(r"(?:\$|\b(?:USD|EUR|GBP)\b)", re.IGNORECASE)
_NEGATIVE_MONEY = re.compile(r"(?:-\s*[₹$]|[₹$]\s*-\s*)\d")
_NON_FINITE = re.compile(r"\b(?:nan|infinity|inf)\b", re.IGNORECASE)
_SHORTHAND = re.compile(r"(?:₹\s*)?\d+(?:\.\d+)?\s*(?:k|lakh)\b", re.IGNORECASE)
_LIST_PRICE_MENTION = re.compile(
    r"(?:list\s+price|product\s+(?:price|costs?)|actually[^.]{0,40}(?:price|costs?))"
    r"[^₹\d]{0,30}₹?\s*(\d[\d,]*)\b",
    re.IGNORECASE,
)
_NORMALIZE = re.compile(r"[^a-z0-9]+")


@dataclass(frozen=True, slots=True)
class ValidationResult:
    conflicts: list[PolicyConflict]
    warnings: list[str]
    missing_fields: list[str]


def validate_extraction(
    offer: TrustedOfferContext, rules_text: str, draft: ExtractionModelOutput
) -> ValidationResult:
    conflicts: list[PolicyConflict] = []
    warnings = list(dict.fromkeys(draft.warnings))
    missing = list(dict.fromkeys(draft.missing_fields))

    if _UNSUPPORTED_CURRENCY.search(rules_text):
        conflicts.append(
            PolicyConflict(
                code="unsupported_currency",
                message="The rules mention a currency other than the offer currency INR.",
            )
        )
    if _NEGATIVE_MONEY.search(rules_text):
        conflicts.append(
            PolicyConflict(code="negative_money", message="Negative monetary authority is not allowed.")
        )
    if _NON_FINITE.search(rules_text):
        conflicts.append(
            PolicyConflict(code="invalid_money", message="Non-finite monetary values are not allowed.")
        )
    if _SHORTHAND.search(rules_text):
        warnings.append("Numeric shorthand such as k or lakh requires explicit merchant review.")
    price_match = _LIST_PRICE_MENTION.search(rules_text)
    if price_match:
        mentioned_price_paise = int(price_match.group(1).replace(",", "")) * 100
        if mentioned_price_paise != offer.list_price_paise:
            conflicts.append(
                PolicyConflict(
                    code="trusted_offer_price_mismatch",
                    message="The rules mention a product price different from the trusted offer list price.",
                )
            )
    if draft.floor_price_paise is None and "floor_price_paise" not in missing:
        missing.append("floor_price_paise")
    if draft.max_discount_paise is None and "max_discount_paise" not in missing:
        missing.append("max_discount_paise")
    if draft.max_rounds is None and "max_rounds" not in missing:
        missing.append("max_rounds")
    if draft.expiry_minutes is None and "expiry_minutes" not in missing:
        missing.append("expiry_minutes")

    floor = draft.floor_price_paise
    discount = draft.max_discount_paise
    if floor is not None and floor > offer.list_price_paise:
        conflicts.append(
            PolicyConflict(code="floor_above_list_price", message="The floor exceeds the trusted offer list price.")
        )
    if discount is not None and discount > offer.list_price_paise:
        conflicts.append(
            PolicyConflict(code="discount_above_list_price", message="The discount exceeds the trusted offer list price.")
        )
    if floor is not None and discount is not None and offer.list_price_paise - discount != floor:
        conflicts.append(
            PolicyConflict(
                code="discount_floor_conflict",
                message=(
                    "The maximum discount and floor imply different lowest prices from the trusted list price; "
                    "the merchant must resolve the rules."
                ),
            )
        )

    source = _NORMALIZE.sub(" ", rules_text.lower()).strip()
    for bundle in draft.allowed_bundles:
        name = _NORMALIZE.sub(" ", bundle.name.lower()).strip()
        meaningful = [word for word in name.split() if len(word) >= 4]
        if not meaningful or not all(word in source for word in meaningful):
            conflicts.append(
                PolicyConflict(
                    code="bundle_not_in_source",
                    message="An extracted bundle is not supported by the merchant rule text.",
                )
            )
            break

    return ValidationResult(conflicts=conflicts, warnings=warnings, missing_fields=missing)
