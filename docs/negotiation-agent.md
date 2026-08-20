# Phase 4 negotiation agent

Phase 4 adds persistent, multi-turn buyer negotiation. Every `AgentDecision` is explicitly untrusted and non-authoritative. Phase 4 cannot approve a deal, lock accepted terms, expose checkout, or create a payment execution.

## Workflow

```text
START
  -> buyer_turn
  -> load_trusted_context
  -> load_deal_memory
  -> plan_negotiation
  -> structured_agent_decision
  -> persist_candidate
  -> respond
  -> END
```

This is a custom typed LangGraph `StateGraph`; there is no agent loop, ReAct executor, tool binding, MCP surface, or autonomous retry edge. One invocation contains one `plan_negotiation` node and therefore produces at most one `AgentDecision`.

## State and ownership

The application SQLite database is canonical for deals, ordered messages, current round, and candidate fields. Messages use explicit sequences (`buyer`, then `counter`) rather than timestamp ordering. The graph state contains identifiers, round/last-offer working values, and the current untrusted candidate. Full canonical history and trusted policy are supplied as ephemeral runtime context and are not maintained as a second graph-owned chat history.

`AsyncSqliteSaver` persists graph checkpoints in a separate development SQLite file. `thread_id` is the internal `deal.id`. The saver is opened and closed in the FastAPI lifespan; async graph calls use `ainvoke`. SQLite checkpointers are development-only and must become an async production-grade store before horizontal deployment.

## Buyer session

Starting a live public offer creates a deal bound to the current immutable `policy_version`. It generates 32 random bytes with `secrets.token_urlsafe(32)`. Only the SHA-256 verifier is stored, and comparison is constant-time. The raw capability is returned once and subsequently supplied in `X-Counter-Deal-Capability`; it is never a URL component and grants no merchant access.

## Candidate boundary

Strict `AgentDecision` actions are `counter`, `offer_bundle`, `accept`, `refuse`, and `clarify`. Money is strict integer paise. The model has no payment tools.

An unsafe output such as `accept` at 100 paise is now stored as:

```text
candidate_action = accept
candidate_amount_paise = 100
candidate_validation_status = failed
candidate_violation_codes = [price_below_floor, discount_exceeds_limit]
```

The deal remains `NEGOTIATING`; accepted fields remain null, and the unsafe amount is not returned as a valid buyer offer. Passing commercial actions are deterministically rendered. Only a passing `accept` is revalidated inside the transaction and locks an `AGREED` deal. No payment row or financial side effect exists in Phase 5.

## Idempotency, ordering, and concurrency

Each buyer request supplies `client_message_id`. The `(deal_id, client_message_id)` database index is unique. Exact retries return the existing Counter result; reuse with different text returns `409`. A SQLite `BEGIN IMMEDIATE` transaction serializes turns before canonical state is read, preventing two concurrent turns from sharing a stale round or message sequence. Model failure rolls the application transaction back, leaving no phantom message, round, or candidate.

## Privacy and failures

Private policy is server-only model context and never appears in public DTOs. A narrow output privacy filter replaces model text that explicitly claims to reveal the floor, maximum discount, private policy, system prompt, or merchant capability. Only buyer-safe message and pending candidate fields are returned.

The model adapter uses primary, one primary retry, then one fallback attempt with SDK retries disabled. Timeout, rate limit, transport, empty, or schema failures return a retryable sanitized `503`; no fallback prose is fabricated. Safe model/latency/token metadata is stored with the Counter message. Hidden reasoning is neither requested nor persisted.

## Phase 5 authority boundary

The graph still produces one untrusted proposal. The deal domain service—not the graph or model—loads the exact immutable snapshot and runs the pure gate. Stable PASS/FAIL events and violations are persisted. The action at `max_rounds` is permitted; the following round is blocked. See `policy-gate.md`.
