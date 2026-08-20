# Implementation Plan (Requires Explicit Phase 1 Approval)

## Phase 1 - Backend skeleton, health, and database

- Files: `backend/pyproject.toml`, `backend/app/main.py`, `config.py`, `db/*`, migrations, tests.
- Endpoints: `GET /health`.
- Tests: startup/lifespan, config failure, async DB/migration smoke.
- DoD: locked environment, health succeeds, SQLite schema migrates from empty.

## Phase 2 - Offers, policies, and public links

- Files: domain/models/repos and offer/public API routers; typed frontend API client.
- Endpoints: create draft, extract/review policy, publish, get merchant offer, get public offer.
- Tests: slug/capability isolation, immutable versions, validation, no private floor in public response.
- DoD: a shareable offer survives restart and a buyer cannot inspect/edit policy.

## Phase 3 - Plain-English policy extraction

- Files: extraction schema/service/prompt and fixtures.
- Endpoint: extract a policy draft only; merchant confirmation publishes.
- Tests: currency/paise, contradictions, missing values, schema failures, prompt injection in rules.
- DoD: extraction never silently becomes execution authority.

## Phase 4 - LangGraph negotiation engine

- Files: typed state/nodes/graph/model adapter/checkpointer.
- Endpoint: create deal and post buyer message.
- Tests: thread isolation, persistence/resume, timeout/fallback, structured-output recovery.
- DoD: simultaneous deals have isolated memory and reproducible state transitions.

## Phase 5 - Deterministic policy gate

- Files: pure policy engine and adversarial unit corpus.
- Tests: floor, discount, rounds, bundles, scope, stale version, malformed model output.
- Implemented: all commercial actions are gated, PASS/FAIL and stable violations persist, passed acceptance atomically locks an immutable agreement, and buyer text is deterministically rendered from validated values.
- DoD: exhaustive boundary tests; zero model path can bypass the gate. Phase 5 creates no payment execution and performs no Razorpay activity.

## Phase 6 - Connect the existing frontend

- Files: `src/services/counter-api.ts` and minimal route/component wiring; preserve UI.
- Endpoints: consume Phases 2-5 APIs.
- Tests: frontend build/lint, create/publish/public/deal flow, error/loading states.
- Implemented: typed transport, separated capability stores, real creation/extraction/publication, real public negotiation and agreement rendering, truthful deals list, and capability-protected inspector reads. Production checkout is disabled; `/demo` remains an isolated scripted preview.
- DoD: production flows no longer depend on localStorage/scripted negotiation as business truth; `/demo` remains explicitly separate.

## Phase 7 - Razorpay Test Payment Links

- Files: payment domain/service/client/router and execution migration.
- Endpoint: buyer-triggered checkout for the authenticated public deal capability, for example `POST /deals/{id}/checkout`; it accepts no caller-selected amount.
- Tests: locked-agreement eligibility, authoritative database reload/revalidation, amount/currency, tampering, double-click concurrency, timeout recovery with mocked Razorpay.
- DoD: exactly one Standard Test Payment Link per execution identity; real `short_url` opens.

## Phase 8 - Webhooks and payment state

- Files: raw webhook router, signature verifier, event processor/reconciliation.
- Endpoints: webhook, signed callback/status read.
- Tests: valid/invalid raw signatures, duplicates, out-of-order events, mismatches, test paid flow.
- DoD: only a verified event/reconciliation marks paid; callback alone cannot.

## Phase 9 - Adversarial tests

- Files: versioned attack dataset and pytest integration suite.
- Tests: normal/hard bargaining, bundle seekers, impersonation, sandwich/obfuscation/tool injection, replay.
- DoD: 0 unauthorized executions and reported compliance/false-block/schema metrics.

## Phase 10 - Evaluation, docs, and deployment

- Files: eval runner/report, deployment config, runbook, privacy/redaction config.
- Tests: staging end-to-end Test Mode success/failure, restart recovery, dependency/security checks.
- DoD: reproducible recruiter demo, documented risks, private/redacted observability, no Live keys.

## Proposed monorepo layout

```text
src/                         existing frontend, unchanged in structure
backend/
  pyproject.toml
  app/
    api/                     FastAPI routers and schemas
    agents/                  LangGraph state/nodes/model adapter
    domain/                  offers, policies, deals
    policies/                deterministic gate
    payments/                Razorpay client/execution/webhooks
    db/                      SQLAlchemy models/repos/migrations
  tests/
docs/
```

Do not start any phase until the user says **Start Phase 1**.
