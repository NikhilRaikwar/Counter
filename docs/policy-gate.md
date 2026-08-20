# Deterministic policy gate

Phase 5 establishes Counter's financial authority boundary:

```text
buyer text -> LangGraph/model -> untrusted AgentDecision
           -> pure deterministic policy gate -> PASS or FAIL
           -> authoritative agreement only after PASS
```

The gate is ordinary server-side Python. It has no model, tool, MCP, network, Razorpay, retrieval, or fuzzy-judgment dependency. It receives an immutable `MerchantPolicySnapshot`, server-owned `DealPolicyState`, and strict `AgentDecision`, and returns `PolicyValidationResult` with stable `PolicyViolationCode` values.

## Validation

`counter`, `offer_bundle`, and `accept` independently require an integer-paise amount at or above the inclusive floor, at or below list price, and within the maximum-discount cap. Currency, exact deal policy version, active deal status, allowed action, and round limit are checked separately. An action at exactly `max_rounds` is allowed; `max_rounds + 1` fails.

Bundles use exact IDs from the deal's immutable policy snapshot. There is no fuzzy matching. A bundle from another offer or later policy version fails.

Examples for list ₹6,000, floor ₹5,200, and maximum discount ₹800:

- `counter ₹5,400` passes and is deterministically rendered as `I can do ₹5,400.`
- `accept ₹5,300` passes and transactionally locks the agreement.
- `counter ₹1` fails; the buyer never receives ₹1 as a valid offer.
- `accept ₹1` fails with private audit codes including `price_below_floor` and `discount_exceeds_limit`; no agreement is created.

## Persistence and privacy

Every proposal remains auditable in `candidate_*`. Its validation status is `passed` or `failed`, and machine-readable violations are stored in `candidate_violation_codes` plus canonical message metadata. Failed candidate values and codes are private and never serialized by the buyer API.

Commercial buyer messages are rendered from validated structured values, not arbitrary model text. Failed decisions receive a fixed safe continuation. Natural `clarify` and `refuse` text passes through the narrow existing private-policy marker filter; no LLM judge is used.

## Agreement transaction

The deal service uses `BEGIN IMMEDIATE`, reloads the exact deal-bound policy, validates the candidate, and revalidates immediately before writing accepted amount, currency, optional bundle, agreement timestamp, and `AGREED`. A locked agreement rejects later non-idempotent turns with `409 agreement_locked`; an exact retry returns the existing result. Concurrent accepts serialize, so only one can lock terms.

Phase 5 stops at agreement. It creates no `payment_execution`, checkout, Payment Link, or Razorpay activity. A later payment phase must reload and deterministically revalidate database truth again.
