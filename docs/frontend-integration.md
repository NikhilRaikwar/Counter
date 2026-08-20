# Phase 6 frontend integration

The existing Counter UI now uses the Phase 1–5 backend as business truth. Set `VITE_COUNTER_API_URL=http://localhost:8000` when the API is not at the default local URL. This is the only client-exposed backend setting; model, database, and payment secrets remain server-only.

## Capability storage

The no-login demo stores only an `offer_id -> raw merchant capability` index under `counter.merchantCapabilities.v1` in `localStorage`. Offer, policy, deal, message, agreement, and payment records are never treated as local canonical state. The current policy extraction response is held transiently in `sessionStorage` only while moving from Create to Review.

Buyer deal capabilities use a separate `counter.dealCapability.v1:{slug}` key in `sessionStorage`. Neither capability is placed in a URL, DOM, console, analytics payload, or query string. Headers are the only API transport. This is demo-grade access; production authentication must replace browser-held merchant capabilities.

## Routes

- `/create` creates a durable draft and requests real structured extraction.
- `/create/review` displays that reviewable draft and blocks publishing when conflicts/missing fields exist.
- `/deals/:id/published` reloads the private offer and displays its durable public slug.
- `/d/:slug` uses only the buyer-safe public DTO, starts a durable deal, and sends idempotent real turns.
- `/deals` fetches each locally manageable offer and its truthful deal counts.
- `/deals/:id` reads the current policy, canonical conversation, candidate PASS/FAIL, violations, and locked agreement through capability-protected read endpoints.

Run backend with migrations applied, then run `npm run dev`. Image selection remains a visual preview because Phase 6 adds no upload/storage system. The backend `image_url` contract is supported, but local object URLs are not sent.

Payment is intentionally disconnected. A locked agreement renders the existing agreed-deal card, but its checkout control is disabled and no paid state can be created. `/demo` remains an explicitly isolated scripted UI preview.
