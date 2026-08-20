# Counter API Contract

## Phase 7 payment API

`POST /api/public/deals/payment-link` requires `X-Counter-Deal-Capability`. Its body must be `{}`; financial fields are rejected. It returns a hosted Razorpay Test URL only after locked-agreement revalidation. Repeated calls return the same URL.

`GET /api/public/deals/payment-status` requires the buyer capability and returns only status, locked amount, currency, and paid timestamp.

`POST /api/webhooks/razorpay` is authenticated by an HMAC signature over exact raw bytes and deduplicated by event ID. Only a verified, fully correlated `payment_link.paid` event can mark payment paid.

Base URL in local development: `http://localhost:8000`. JSON requests reject unknown fields. Money is always an integer number of currency subunits; `2_000_000` paise represents ₹20,000. Phase 2 supports `INR` only.

## Capability design

`POST /api/offers` generates 32 cryptographically random bytes with Python `secrets.token_urlsafe(32)`, returning the resulting high-entropy capability exactly once. The database stores only `SHA-256(token)` as a 64-character verifier. Since the token has 256 bits of entropy, an offline preimage attack is infeasible; validation hashes the supplied token and uses constant-time `hmac.compare_digest`.

Merchant routes receive the raw capability only in this header:

```text
X-Counter-Management-Capability: <capability returned at creation>
```

The capability is never placed in a URL, public DTO, ORM representation, log, documentation example, or database. Losing it currently means losing management access; account recovery belongs to a future authentication design.

## Create a draft

`POST /api/offers` -> `201`

```json
{
  "merchant_display_name": "Acme Studio",
  "product_name": "SEO Audit Pro",
  "description": "A complete technical SEO audit.",
  "image_url": null,
  "list_price_paise": 2000000,
  "currency": "INR"
}
```

The response contains `{ "offer": MerchantOfferSummary, "management_capability": "..." }`. The offer is `draft` and `public_slug` is `null`. No policy version exists yet.

## Fetch merchant offer

`GET /api/offers/{offer_id}` with the management header -> `200`.

Returns the private offer and `current_policy`. The policy includes floor, discount cap, round/expiry bounds, structured bundles/actions, original merchant-confirmed text, and the private concession strategy that controls when Counter may lower its own offer. Missing or incorrect capability returns a generic `403` without private data. Unknown internal ID returns `404`.

## Update draft

`PATCH /api/offers/{offer_id}` with the management header -> `200`.

Accepts any non-empty subset of the create fields. Only `draft` offers can be edited. Live offers return `409`; changing published authority must later create a new append-only policy version rather than mutate version 1.

## Publish

`POST /api/offers/{offer_id}/publish` with the management header -> `200`.

The body is a merchant-confirmed structured policy:

```json
{
  "currency": "INR",
  "floor_price_paise": 1750000,
  "max_discount_paise": 250000,
  "max_rounds": 4,
  "expiry_minutes": 30,
  "allowed_bundles": [
    {"id": "strategy-call", "name": "30-minute strategy call", "additional_cost_paise": 0}
  ],
  "allowed_actions": ["negotiate_price", "offer_bundle", "accept_deal", "create_checkout"],
  "forbidden_actions": ["price_below_floor", "invent_bundle", "change_product"],
  "concession_strategy": {
    "mode": "buyer_must_improve",
    "opening_counter_paise": 2000000,
    "min_buyer_improvement_paise": 20000,
    "max_concession_per_round_paise": 20000,
    "hold_on_repeat_offer": true,
    "hold_on_worse_offer": true,
    "accept_buyer_offer_if_authorized": true,
    "hold_at_floor": true
  },
  "original_rules_text": "Merchant-confirmed structured authority."
}
```

No LLM or text extraction runs. The transaction validates bounds/currency, allocates a readable slug plus a 10-character cryptographically random suffix, inserts immutable policy version 1 with a list-price snapshot, and marks the offer live. Any failure rolls back all changes. An identical repeated/concurrent publish is idempotent; a different policy against an already-live offer returns `409`.

## Extract a reviewable policy draft

`POST /api/offers/{offer_id}/policy-draft` with the management header -> `200`.

```json
{"rules_text":"Never sell below ₹17,500. Maximum discount ₹2,500. Maximum 4 rounds."}
```

The endpoint authenticates the capability, reloads trusted offer data, and returns a strictly validated but non-authoritative draft. `status` is `review_required` or `conflict`; the response includes trusted public offer context, the typed draft, conflicts, warnings, and missing fields.

Missing values remain `null`; the service never supplies financial defaults. A strategy is extracted only when stated clearly; otherwise publishing uses a merchant-visible conservative hold-firm default. Deterministic conflicts cover inconsistent floor/discount arithmetic, unsupported currency, negative/non-finite money, a product price that differs from database truth, and bundles absent from the source rules. The response does not create or update a `policy_version`. Only the separate merchant-confirmed publish endpoint creates authority.

Provider exhaustion or invalid structured output returns sanitized error code `policy_extraction_unavailable` with status `503`. Model selection is server configuration and is not accepted in this request.

## Public buyer fetch

`GET /api/public/offers/{slug}` -> `200` only for live offers.

```json
{
  "slug": "seo-audit-pro-k8x2p9abcd",
  "merchant_display_name": "Acme Studio",
  "product_name": "SEO Audit Pro",
  "description": "A complete technical SEO audit.",
  "image_url": null,
  "list_price_paise": 2000000,
  "currency": "INR",
  "status": "live"
}
```

This explicit DTO does not contain internal offer ID, policy version ID, floor, discount cap, rounds, rules, structured actions, capability, capability hash, or audit data. Draft/paused/missing slugs all return the same safe `404` contract.

## Start a buyer deal

`POST /api/public/offers/{slug}/deals` -> `201` for a live offer with an immutable policy.

```json
{"deal_capability":"returned-once-high-entropy-value","deal_status":"negotiating"}
```

The raw value above is illustrative, never a real token. Only its SHA-256 verifier is stored. The deal is bound to the current immutable policy version. The public slug can start a deal but cannot read or send messages to existing deals.

## Submit a buyer turn

`POST /api/public/deals/messages` with `X-Counter-Deal-Capability` -> `200`.

```json
{"message":"₹20,000 is too high. Can you do ₹15,000?","client_message_id":"browser-turn-1"}
```

```json
{
  "deal_status":"negotiating",
  "round":1,
  "message":{"role":"counter","content":"I can offer a measured concession."},
  "candidate":{"action":"counter","amount_paise":1850000,"bundle_id":null,"validation_status":"passed"}
}
```

The candidate begins as model output, not authority. Before financial validation, a deterministic strategy check uses the immutable policy and per-deal canonical buyer/counter movement state to decide whether Counter may make a concession at all. The server then deterministically gates every commercial action. A passing `accept` returns `deal_status: agreed` and atomically locks accepted database terms. A failed commercial or strategy candidate returns a safe refusal-shaped public candidate with no amount; its original value and violation codes remain private. A locked deal rejects a new turn with `409 agreement_locked`, while an exact idempotent retry returns the existing response.

`client_message_id` provides turn idempotency. An exact retry returns the existing response; using the same ID with different content returns `409 client_message_id_conflict`. Missing or wrong deal capability returns a generic `403`. Provider/schema failure returns `503 negotiation_unavailable` and records no canonical turn.

Public deal responses exclude offer/deal database IDs, policy version IDs, floor, discount limits, policy JSON, merchant rules/capability, prompts, hidden reasoning, private candidate values, and policy violation codes.

## Errors

## Merchant deal inspection

`GET /api/offers/{offer_id}/deals` and `GET /api/offers/{offer_id}/deals/{deal_id}` require `X-Counter-Management-Capability`. They are read-only Phase 6 support endpoints. The list returns deal status, current round, private candidate PASS/FAIL and violation codes, and locked agreement fields. Detail additionally returns canonical ordered messages and observable event/model metadata. Neither endpoint returns capability hashes, secrets, hidden reasoning, or payment credentials.

Using a buyer capability or public slug as merchant authority returns the same safe `403` contract.

Domain errors:

```json
{"error":{"code":"invalid_policy_bounds","message":"Policy financial bounds are contradictory"}}
```

Request validation uses the same envelope with code `validation_error` and sanitized field locations/messages. Database exception strings and request input values are not returned. Status usage: `400` contradictory domain policy, `403` invalid capability, `404` missing resource, `409` lifecycle/concurrency conflict, `422` malformed typed input, and `503` slug allocation exhaustion.

## OpenAPI

`GET /openapi.json` documents all typed schemas and the management header. It contains the header name/description only, never a real token or capability hash.
