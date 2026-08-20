# Razorpay Capabilities for Counter

Official sources: [MCP overview](https://razorpay.com/docs/mcp-server/), [remote setup](https://razorpay.com/docs/mcp-server/remote/), [tools reference](https://razorpay.com/docs/mcp-server/tools-reference/), [Payment Links APIs](https://razorpay.com/docs/api/payments/payment-links/), [create Standard Payment Link](https://razorpay.com/docs/api/payments/payment-links/create-standard/), and [test Payment Links](https://razorpay.com/docs/payments/payment-links/create/).

## MCP assessment

Razorpay's remote endpoint is `https://mcp.razorpay.com/mcp` (the older `/sse` endpoint was deprecated on 2025-08-13). It exposes 35+ tools. Authentication requires a Razorpay account and either OAuth or a merchant token derived from API credentials. The generic Codex MCP is configured and enabled, but `codex mcp list` reports `Not logged in`; the selected Razorpay plugin is installed but its read-only enablement check returned `Authentication failed`. No secret was written to config and no Razorpay object was created or changed.

The MCP is suitable as an authenticated development/research assistant. It should not be connected to Counter's runtime negotiation model.

## Relevant surfaces

| Capability | API / MCP tool | Needed for MVP? | Test Mode? | Notes |
|---|---|---:|---:|---|
| Create Standard Payment Link | `POST /v1/payment_links`; `create_payment_link` | Yes | Yes | Amount is in currency subunits; persist returned `id` and `short_url`. Test Mode limit is 30 links/business. |
| Fetch link | `GET /v1/payment_links/{id}`; `fetch_payment_link` | Yes | Yes | Recovery/reconciliation after ambiguous timeout. |
| Fetch links | `GET /v1/payment_links`; `fetch_all_payment_links` | Recovery only | Yes | Can search/reconcile, but the application DB remains primary. |
| Update link | `PATCH /v1/payment_links/{id}`; `update_payment_link` | No initially | Yes | Avoid mutating agreed financial terms. |
| Cancel link | `POST /v1/payment_links/{id}/cancel`; `cancel_payment_link` | Later | Yes | Useful for expiry/admin cancellation. |
| Payment status | Payments fetch tools/API | Reconciliation | Yes | Webhook/link status is primary for MVP. |
| Orders / Standard Checkout | Orders and integration helper tools | No | Yes | Payment Links already host checkout. |
| Refunds | Refund tools/API | No | Yes | Explicitly out of MVP. |
| Settlements/payouts/QR | MCP tools | No | Varies | No Counter requirement. |

## Creation contract

`POST /v1/payment_links` accepts `amount`, `currency`, `description`, unique `reference_id` (maximum 40 characters), optional `customer`, `expire_by`, `notify`, `notes`, `callback_url`, and `callback_method` (`get` when callback URL is used). A normal INR amount is expressed in paise. The response includes `id`, `reference_id`, `short_url`, timestamps, amount fields, and status (`created`, `partially_paid`, `expired`, `cancelled`, or `paid`). Customer email/contact supplied at creation are not guaranteed to be prefilled on hosted Checkout under Razorpay's current security policy.

Standard Payment Links can be created and paid in Test Mode; the hosted page lets the tester choose success or failure without real money. UPI-specific Payment Links are Live Mode only, although a Standard Payment Link may offer supported test payment methods.

## Duplicate protection

Razorpay rejects a reused `reference_id` with HTTP 400; uniqueness is protection, not a successful idempotent replay response. Counter should:

1. Create a `payment_executions` row with unique deterministic key `sha256(deal_id|policy_version_id|accepted_amount_paise|currency)` before the external call.
2. Lock or atomically claim that row and return its existing `short_url` when complete.
3. Use a compact deterministic Razorpay `reference_id` (for example `ctr_<26-char-base32-digest>`).
4. On timeout, mark the attempt `unknown`, reconcile by stored Razorpay ID if received or fetch/search by reference, and never blindly create another link.

This conserves the 30-link Test Mode allowance and prevents double-click duplication.
