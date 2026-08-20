# Phase 0 Research Report

Date: 2026-08-20. Phase 0 created documentation only; no product/backend code or dependencies were added.

## Repository understood

Counter is a completed React 19/TanStack Start/Vite/Tailwind frontend. Merchant creation, review/publish, public negotiation, deal inspector, demo, and docs routes exist. Persistence, negotiation, policy, checkout, and payment completion are currently local/scripted mocks. See `current-ui-architecture.md`.

## Development MCP status

- **Connected and enabled:** `langchain-docs` -> `https://docs.langchain.com/mcp`, streamable HTTP, no credential needed. `codex mcp get langchain-docs` verifies the config. The new MCP tool catalogue may require a Codex session reload; official pages were independently cross-checked in this phase.
- **Enabled but not authenticated:** the selected Razorpay plugin exposes read-only account tools, but a read-only enablement check returned `Authentication failed`. `codex mcp list` also shows the generic `razorpay` server enabled at `https://mcp.razorpay.com/mcp` with status `Not logged in`. No payment object was created or changed. Official Razorpay docs remain the development reference until the user completes authentication.

## Official documentation read

### LangChain/LangGraph

- [Documentation index](https://docs.langchain.com/llms.txt)
- [Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [Structured output](https://docs.langchain.com/oss/python/langchain/structured-output)
- [Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [Streaming](https://docs.langchain.com/oss/python/langgraph/streaming)
- [LangChain v1 migration](https://docs.langchain.com/oss/python/migrate/langchain-v1)
- [MCP adapters](https://docs.langchain.com/oss/python/langchain/mcp)
- [Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Context engineering](https://docs.langchain.com/oss/python/langchain/context-engineering)

Current APIs favor `create_agent` for general agents and `StateGraph` for explicit workflows. `ProviderStrategy` uses native structured output; `ToolStrategy` is the fallback. Checkpoints are grouped by `thread_id`; interrupts require persistence and resume through `Command`. Counter chooses a custom StateGraph and no payment interrupt.

### Razorpay

- [MCP overview](https://razorpay.com/docs/mcp-server/), [remote setup](https://razorpay.com/docs/mcp-server/remote/), [tools](https://razorpay.com/docs/mcp-server/tools-reference/)
- [Payment Links API](https://razorpay.com/docs/api/payments/payment-links/), [create Standard link](https://razorpay.com/docs/api/payments/payment-links/create-standard/), [callback/signature](https://razorpay.com/docs/payments/payment-links/apis/)
- [Test Payment Links](https://razorpay.com/docs/payments/payment-links/create/), [UPI-specific link](https://razorpay.com/docs/api/payments/payment-links/create-upi/)
- [Payment Link events](https://razorpay.com/docs/webhooks/payment-links/), [webhook validation/testing](https://razorpay.com/docs/webhooks/validate-test/)

Confirmed: Standard links support Test Mode and hosted success/failure simulation; Test Mode is limited to 30 links per business; UPI-specific Payment Links are not supported in Test Mode. `reference_id` is unique and reuse returns HTTP 400. Webhook verification uses raw body; duplicates use `x-razorpay-event-id`; delivery order is not guaranteed.

### OpenRouter, FastAPI, and Pydantic

- [OpenRouter structured outputs](https://openrouter.ai/docs/features/structured-outputs), [tool calling](https://openrouter.ai/docs/features/tool-calling), [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [models API](https://openrouter.ai/docs/guides/overview/models)
- Current model pages: [GPT-5.4 mini](https://openrouter.ai/openai/gpt-5.4-mini), [Claude Sonnet 4.6](https://openrouter.ai/anthropic/claude-sonnet-4.6), [Gemini 3.1 Flash Lite](https://openrouter.ai/google/gemini-3.1-flash-lite)
- [FastAPI async](https://fastapi.tiangolo.com/async/), [lifespan](https://fastapi.tiangolo.com/advanced/events/), [request body](https://fastapi.tiangolo.com/advanced/using-request-directly/), [CORS](https://fastapi.tiangolo.com/tutorial/cors/), [streaming responses](https://fastapi.tiangolo.com/advanced/custom-response/)
- [Pydantic strict mode](https://docs.pydantic.dev/latest/concepts/strict_mode/), [validators](https://docs.pydantic.dev/latest/concepts/validators/)

## Architecture choices

- Custom typed LangGraph StateGraph; LangChain model wrapper only where useful.
- OpenRouter through `langchain-openai` with primary `openai/gpt-5.4-mini` and fallback `anthropic/claude-sonnet-4.6`, both configurable and subject to an implementation-time eval.
- Strict Pydantic structured decisions -> deterministic policy gate -> explicit server execution.
- SQLite/AsyncSqliteSaver now; Postgres/AsyncPostgresSaver later.
- **No RAG and no long-term cross-buyer memory for MVP.**
- Application DB owns business truth; LangGraph checkpointer owns execution state.
- Server-side Razorpay REST API, not runtime MCP; model never holds credentials.
- Webhook authoritative, callback UX-only; deterministic execution identity prevents duplicates.
- Normal request/response first; add SSE only if UX validation requires event progress.
- Merchant authority is frozen in the immutable policy version at publish time. For a locked policy-approved agreement, the buyer checkout CTA triggers database reload, deterministic revalidation, and atomic payment execution; the CTA is not financial authority. No LangGraph interrupt is needed.

## Evaluation and observability

Use pure unit tests for the policy gate plus a versioned adversarial pytest corpus and model integration eval. Release gate: zero unauthorized payment executions. Track compliance, safe approval, false blocks, schema failures, turns, latency, and cost. LangSmith is optional private/redacted build telemetry, not required runtime infrastructure.

## Unknowns and risks

- Razorpay account-level capabilities, enabled Test payment methods, and webhook dashboard configuration cannot be verified until the installed plugin/MCP is authenticated.
- OpenRouter model availability, price, latency, and provider-level structured-output reliability change; re-query at Phase 4 and run Counter-specific evals before locking defaults.
- Razorpay's 30-link Test limit makes cleanup/reuse discipline important; cancelled/expired links should not be assumed to restore quota.
- No-login merchant capability access is suitable only for the hiring demo, not production.
- SQLite permits a strong local demo but production concurrency and multi-process behavior require Postgres.

## Implementation order

Backend/DB -> durable offers/policy versions/public links -> reviewed extraction -> LangGraph negotiation -> deterministic gate -> frontend integration -> idempotent Razorpay Test links -> verified webhooks -> adversarial eval -> deployment/demo hardening. Full phase definitions are in `implementation-plan.md`.

## Stop gate

Phase 0 is complete. Do not write backend/product code until the user explicitly says **Start Phase 1**.
