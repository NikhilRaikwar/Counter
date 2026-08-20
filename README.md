# Counter

> **Turn an offer into a negotiable link. The model suggests; merchant rules decide.**

Counter lets a merchant create an offer, define private negotiation boundaries, review the extracted policy, and publish a durable public link. A buyer opens that link and negotiates with an AI, but only deterministic server code can approve commercial terms and lock an agreement.

## Product flow

```text
Merchant: create offer → define boundaries → review policy → publish link
Buyer:    open link → negotiate with AI → deterministic policy check → safe agreement
```

Counter is complete through **Phase 6**: architecture, backend foundation, durable offers and immutable policies, AI policy extraction, stateful negotiation, deterministic authorization, and real frontend/backend integration.

## Trust architecture

```text
React + TanStack Start
        ↓
FastAPI + SQLAlchemy + SQLite/Alembic
        ↓
OpenRouter + typed LangGraph workflow
        ↓
strict, UNTRUSTED AgentDecision
        ↓
deterministic policy gate
        ↓
locked agreement
```

Merchant rules follow a separate confirmation boundary:

```text
plain-English rules → OpenRouter → untrusted PolicyDraft
→ merchant review/confirmation → immutable PolicyVersion
```

The model never authorizes itself. If a compromised model proposes `accept ₹1` or `counter ₹1`, deterministic checks fail. No agreement is created, and an unsafe counter amount is never presented to the buyer as valid.

## Current scope

Implemented:

- React 19, TanStack Start/Router, and Tailwind CSS frontend
- FastAPI async backend with typed configuration and structured errors
- SQLAlchemy async, SQLite, Alembic, durable offers/deals/messages
- Immutable policies and readable, unguessable public links
- Capability-based merchant and buyer access for the no-login demo
- Strict OpenRouter policy extraction and negotiation output
- Persistent isolated LangGraph threads and idempotent buyer turns
- Pure deterministic policy gate and atomic agreement locking
- Real create, review, publish, negotiation, deals, and inspector UI flows

Not yet implemented:

- Razorpay Payment Link execution
- Payment webhooks or paid-state reconciliation
- Production authentication

Payments are intentionally **not simulated in production routes**. **Phase 7** is next and will add Razorpay Test Payment Link execution for already locked agreements.

## Run locally

Requirements: Node.js and Python 3.12+. Configure local environment values from the checked-in examples. Never put OpenRouter or Razorpay secrets in Vite variables.

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[dev]"
.venv/Scripts/python -m alembic upgrade head
.venv/Scripts/python -m uvicorn app.main:app --reload
```

In another terminal:

```bash
npm install
npm run dev
```

The only public frontend setting is:

```env
VITE_COUNTER_API_URL=http://localhost:8000
```

Verification:

```bash
cd backend && .venv/Scripts/python -m pytest
npm run lint
npm run build
```

## Architecture documentation

- [Phase 0 research](docs/PHASE_0_RESEARCH.md)
- [Architecture decisions](docs/architecture-decision.md)
- [End-to-end data flow](docs/counter-data-flow.md)
- [Threat model](docs/threat-model.md)
- [API contract](docs/api-contract.md)
- [Policy extraction](docs/policy-extraction.md)
- [Negotiation agent](docs/negotiation-agent.md)
- [Deterministic policy gate](docs/policy-gate.md)
- [Frontend integration](docs/frontend-integration.md)
- [Mock-to-real integration map](docs/frontend-integration-map.md)
- [Implementation phases](docs/implementation-plan.md)

## Status

```text
CURRENT: Phase 0–6 complete
NEXT:    Phase 7 — Razorpay Test Payment Link execution
```
