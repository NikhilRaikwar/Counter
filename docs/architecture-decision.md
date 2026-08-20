# Architecture Decision Record

## Decisions

### Agent framework

Use a custom typed LangGraph `StateGraph`, not a general-purpose tool-loop agent. Current LangChain `create_agent` is appropriate for open-ended tool use and itself runs on LangGraph, but Counter has a fixed, auditable workflow. Nodes: load trusted state -> interpret/plan -> structured model decision -> deterministic policy gate -> persist/respond. Old `create_react_agent` tutorials are superseded by LangChain v1 `create_agent`; neither is needed here.

### Model and structured output

Use `langchain-openai` `ChatOpenAI` with OpenRouter's OpenAI-compatible base URL. Prefer provider-native JSON Schema through `with_structured_output` when the selected route genuinely supports it; otherwise use tool-structured output. In both cases validate again with strict Pydantic and treat output as untrusted.

Current candidate comparison (prices are OpenRouter list prices per 1M tokens on 2026-08-20 and must be rechecked before implementation):

| Model | Structured/tool reliability | Negotiation | Latency | Input/output cost | Recommendation |
|---|---|---|---|---|---|
| `openai/gpt-5.4-mini` | Excellent; OpenRouter reports about 0.2% structured-output errors on current routes | Strong | ~0.84s provider p50, ~74 tok/s | $0.75/$4.50 | **Primary** balance |
| `anthropic/claude-sonnet-4.6` | Strong tools; structured-route error varies by provider | Excellent | ~1.16s provider p50, ~43 tok/s | $3/$15 | Quality fallback, costly |
| `google/gemini-3.1-flash-lite` | Suitable for lightweight structured extraction; validate empirically | Moderate | ~0.59s, ~109 tok/s | $0.25/$1.50 | Cheap latency candidate, not initial fallback |

Fallback: `anthropic/claude-sonnet-4.6`. Keep IDs in environment variables, route only to providers supporting required parameters (`require_parameters: true`), set explicit timeouts/retry budgets, and record usage/cost metadata.

### Persistence and state ownership

SQLite plus SQLAlchemy/aiosqlite and `AsyncSqliteSaver` for development. Postgres plus `AsyncPostgresSaver` later. Map `deal.id` to LangGraph `thread_id`.

Application DB owns offers, immutable policies, deals, canonical messages, accepted terms, payment executions, and webhook events. The checkpointer owns transient graph execution state/history. Avoid two independent canonical message histories: persist application messages transactionally and store only identifiers/working context in graph state where possible.

### RAG and memory

**DO NOT USE RAG for MVP.** One offer, policy, approved bundles, and deal history fit in trusted context. Long-term cross-buyer memory is also excluded. Consider retrieval later only for large catalogues, long merchant terms, or knowledge bases.

### Payments and MCP

LangChain docs MCP and a future authenticated Razorpay MCP are development-time research tools. Runtime uses a narrow server-side Razorpay REST client. The model has no payment tools or secrets.

Webhook is authoritative for payment state; signed callback improves UX only. Merchant authority is frozen when the merchant reviews and publishes an immutable policy version. After the deterministic gate locks a safe agreement, the buyer's `Pay ₹X` / `Continue to checkout` CTA may trigger execution. That CTA is not financial authority: the server reloads the offer, immutable policy version, deal state, and accepted terms, revalidates them deterministically, and atomically claims the payment execution before calling Razorpay. A LangGraph `interrupt()` adds replay/idempotency complexity without value because payment execution remains outside the negotiation graph.

### Streaming

Start with ordinary async request/response for buyer turns and TanStack pending UI. Add SSE only if product testing shows the need for progressive `agent_started`, `offer_proposed`, `policy_checked`, and `response_ready` events. WebSocket is unnecessary. LangGraph `astream` can feed SSE later.

### API and validation

FastAPI cleanly supports async endpoints, dependencies/lifespan, CORS, Pydantic v2, `StreamingResponse`, and `await request.body()` for raw webhook verification. Use strict schemas (`ConfigDict(strict=True)` where appropriate), `Literal`/enums, integer paise constraints, cross-field validators, and reject unknown fields on financial commands.

### Policy authorization boundary

LangGraph ends at an untrusted `AgentDecision`. The deal domain service runs a pure deterministic gate outside the graph so the database transaction—not graph state or model behavior—owns commercial authority. All price-bearing actions are checked, failed candidates remain auditable but private, and passed acceptance is revalidated immediately before the authoritative agreement lock. Buyer-facing commercial prose is rendered from validated values.

## Minimal data model

- `offers`: public product fields, status, public slug, merchant management token hash.
- `policy_versions`: immutable structured policy plus original rules and version.
- `deals`: offer/policy snapshot FK, public session token, status, round/accepted terms.
- `deal_messages`: ordered buyer/counter/system messages and structured metadata.
- `payment_executions`: unique execution key/reference, amount/currency, external IDs/URL, status/error.
- `webhook_events`: unique Razorpay event ID, verified type, payload/audit timestamps, processing state.

No merchant table is required initially. With no login, use an unguessable, separately delivered merchant management capability stored only as a hash; it grants edit/inspection for that offer and must never appear in `/d/:slug`. This is demo-grade capability access, not production authentication.

Public links combine a readable slug with an unguessable suffix (for example `/d/seo-audit-pro-k8x2p9`). Buyers can read/start/negotiate/pay only. Each deal remains tied to `policy_version_id`; publishing a new version never mutates existing negotiations.

## Observability and evaluation

LangSmith tracing is useful during development if opt-in, private, sampled, and redacted; it is not a correctness dependency. The smallest credible eval harness is local pytest with deterministic policy tests plus a versioned adversarial conversation dataset and optional LangSmith experiments. Gate on zero unauthorized executions, then policy compliance, safe approval/false-block rate, schema failures, turns, latency, and cost.

## Explicit exclusions

No multi-agent swarm, browser automation, voice/WhatsApp/CRM, full authentication, vector DB, merchant-learning profiles, production payments, refunds, subscriptions, payouts, or complex analytics.
