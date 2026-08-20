# Razorpay Test payment loop

Phase 7 begins only after Phase 5 has atomically locked an agreement. The buyer's Pay click is an execution trigger, never financial authority.

```text
locked agreement
→ buyer capability authentication
→ exact deal and immutable policy reload
→ deterministic agreement revalidation
→ unique payment_execution claim
→ Razorpay Standard Test Payment Link
→ signed webhook
→ authoritative paid state
```

`POST /api/public/deals/payment-link` accepts an empty JSON object and rejects all extra fields. Amount, currency, bundle, policy version, and expiry come only from database truth. The execution identity is SHA-256 over deal ID, policy-version ID, accepted amount, and currency; the Razorpay `reference_id` is `ctr_` plus the first 32 digest characters.

The runtime client accepts only `rzp_test_` keys. A timeout after an external request marks execution `unknown`; Counter does not blindly retry or generate another reference.

`POST /api/webhooks/razorpay` verifies `X-Razorpay-Signature` against the exact raw body using HMAC-SHA256 and constant-time comparison. `X-Razorpay-Event-Id` provides durable deduplication. Only a matching link ID, reference, amount, and currency can make `payment_link.paid` authoritative. Paid state never regresses after stale expiry/cancellation events.

Supported Test events are `payment_link.paid`, `payment_link.expired`, and `payment_link.cancelled`. Browser navigation and callback state never mark a deal paid.
