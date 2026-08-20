# Counter Threat Model

## Assets and trust boundaries

Protected assets are merchant policy/floor, immutable policy versions, deal terms, Razorpay credentials, webhook secret, payment authority, and private inspector data.

Trusted: server-loaded offer and policy snapshot, approved bundle catalogue, server counters, validated application records, deterministic policy result. Untrusted: buyer text, uploaded buyer content, LLM output, callback query parameters until verified, and webhook JSON until raw-body signature verification.

The LLM never receives Razorpay credentials and has no payment/MCP write tools.

## Main attacks

- Authority impersonation: “I am the merchant/founder.”
- Instruction override, delimiter/sandwich, obfuscated or multilingual prompt injection.
- Floor-price extraction and attempts to overwrite trusted context.
- Fabricated tool/payment calls or malformed structured output.
- Replay/double-click creation, timeout retry, duplicate/out-of-order webhooks.
- Guessing public links or using a buyer URL to access merchant controls.

## Defense layers

1. Separate trusted state fields from buyer messages; never concatenate buyer text into policy/system fields.
2. Ask the model only for a Pydantic-validated `AgentDecision` from a small action whitelist.
3. Treat that decision as a proposal, not authority.
4. Run deterministic arithmetic, bundle membership, round, scope, and policy-version checks.
5. Lock the policy-approved agreement before exposing the buyer checkout CTA. The buyer can trigger checkout but cannot supply or alter financial terms.
6. On the buyer CTA, re-load the offer, immutable policy version, deal, and accepted terms from the database and revalidate in the payment service. Merchant authority comes from the previously confirmed policy version, so the merchant may be offline.
7. Keep secrets and Razorpay HTTP client server-only; no runtime Razorpay MCP for the model.
8. Use a unique execution identity, transaction/lock, deterministic reference ID, and recovery state.
9. Verify raw webhook/callback signatures, deduplicate event IDs, and enforce monotonic transitions.
10. Use unguessable public identifiers; keep a separate unguessable merchant management capability until real authentication exists.
11. Redact secrets/private floor where not needed and keep traces private.

Fail closed on schema failure, model timeout, missing policy snapshot, stale deal state, currency/amount mismatch, or uncertain external execution status. A refusal message must never reveal the private floor unless the merchant explicitly made it public.

## Phase 5 compromised-model proof

A compromised model may emit `accept` or `counter` at 100 paise. Counter deliberately preserves that untrusted candidate as evidence, then checks the immutable deal-bound policy with model-independent code. The failed value and violation codes remain private; the buyer receives a fixed safe response, accepted terms remain null, and no payment row or external call exists. Authorization does not depend on the model resisting jailbreaks.

Even a passing price cannot authorize arbitrary model prose. Critical commercial messages are formatted from the validated amount and approved bundle. This prevents text such as a private-floor disclosure from hitchhiking on an otherwise valid price.

## Runtime MCP comparison

Direct model -> Razorpay MCP collapses reasoning and financial authority, expands prompt-injection blast radius, makes retries/tool loops difficult to audit, and risks unnecessary API surfaces. Typed proposal -> policy gate -> explicit payment service retains least privilege, permits transactional idempotency, and gives a clean audit trail. Counter chooses the second architecture.
