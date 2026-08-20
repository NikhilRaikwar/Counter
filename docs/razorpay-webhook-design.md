# Razorpay Payment Link Webhook Design

Official sources: [Payment Link webhook events](https://razorpay.com/docs/webhooks/payment-links/), [validate and test webhooks](https://razorpay.com/docs/webhooks/validate-test/), and [Payment Link callback/signature](https://razorpay.com/docs/payments/payment-links/apis/).

## Events and correlation

Subscribe at minimum to `payment_link.paid`; also handle lifecycle events Razorpay makes available for partial payment, cancellation, and expiry. The event envelope contains `event`, entity payloads, and timestamps. The Payment Link entity supplies its `id`, `reference_id`, `status`, amount fields and payments; payment entities supply their payment IDs and status.

Correlation chain:

`reference_id -> payment_execution -> deal -> offer + policy_version`

Also persist `payment_link.id` and each `payment.id`. Notes may carry non-secret internal IDs, but processing must not depend solely on mutable/free-form notes.

## Endpoint algorithm

1. Read the exact raw request bytes before JSON parsing.
2. Compute/verify Razorpay's HMAC signature using the server-only webhook secret and compare safely against `X-Razorpay-Signature`.
3. Read `x-razorpay-event-id`; insert a `webhook_events` row under a unique constraint. Duplicate IDs return 2xx without reapplying effects.
4. Parse and strictly validate the JSON only after signature success.
5. Correlate by stored Payment Link ID/reference ID and apply a monotonic state transition. Never assume event ordering.
6. Return 2xx quickly; queue retryable internal processing if needed. Keep failed verified events for replay.

Razorpay explicitly documents duplicate delivery and potentially out-of-order events. Test and Live payload shapes match, and Test Mode transactions trigger test webhooks. When a webhook secret is rotated, older retried deliveries may require the old secret during the overlap window.

## Callback

Successful redirect callbacks include `razorpay_payment_id`, `razorpay_payment_link_id`, `razorpay_payment_link_reference_id`, `razorpay_payment_link_status`, and `razorpay_signature`. Verify the callback signature server-side using the documented concatenation inputs before displaying status.

Recommendation: **webhook is authoritative; callback is UX convenience**. A callback may arrive before, after, or without a browser completing the redirect. After verification, the callback page may show “confirming payment” and fetch server state; it must not independently mark a deal paid. A fetch/reconciliation job is the final recovery path.

## State safety

Only `payment_link.paid`/verified reconciliation may advance `payment_ready -> paid`. Repeated or older events cannot regress `paid`. Amount, currency, link ID, reference ID, and the execution's accepted terms must match before transition. Any mismatch is quarantined for review.
