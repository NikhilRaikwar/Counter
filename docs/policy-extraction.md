# Policy extraction

Phase 3 converts merchant plain-English rules into a reviewable, non-authoritative policy draft. It does not negotiate, publish, update an immutable policy version, or execute commerce.

## Trust boundary

```text
merchant rules (untrusted text)
  -> OpenRouter structured extraction (untrusted draft)
  -> strict Pydantic validation
  -> deterministic semantic validation
  -> merchant review
  -> separate Phase 2 publish request
  -> immutable PolicyVersion authority
```

The service authenticates the merchant capability and reloads the offer before invoking a model. Product name, description, list price, currency, status, offer ID, public slug, capability, and policy versions remain application-owned. Extraction returns no authority and performs no database write.

## Prompt and structured output

The model receives three distinct messages: a narrow system purpose, server-serialized trusted offer context, and merchant text inside a delimited human message. Instruction-like merchant content remains data. No tools are bound.

`langchain-openai` `ChatOpenAI` uses the OpenRouter OpenAI-compatible base URL and Pydantic `with_structured_output(ExtractionModelOutput, method="json_schema", strict=True)`, invoked asynchronously with `ainvoke`. The schema rejects unknown fields, floating-point money, negative money, out-of-range rounds/expiry, and actions outside Counter's fixed enum.

## Deterministic review checks

- floor and discount arithmetic is compared with the trusted list price;
- alternate product/list prices in rules conflict with database truth;
- USD, EUR, GBP, negative, NaN, and infinite monetary language fails safely;
- missing floor, discount, round, or expiry fields remain missing;
- bundle names require lexical provenance in the merchant rules;
- `k` and `lakh` shorthand is warning-bearing rather than silently authoritative;
- all money in the result is integer paise.

Conflicts yield `status: conflict`. Valid or incomplete drafts yield `status: review_required`; the merchant must review both warnings and missing fields. Neither status publishes.

## Bounded provider behavior

The adapter disables SDK retries and makes at most three calls: primary model, one primary retry, then one fallback-model attempt. Timeout, rate limit, transport failure, empty output, or schema failure consumes that bounded budget. Exhaustion returns the sanitized `policy_extraction_unavailable` `503` error and no guessed draft.

Safe latency, selected model, token counts when available, and whether fallback was used are captured inside the adapter result. Provider internals and metadata are not placed in the public API. LangSmith tracing remains disabled by default and correctness never depends on it.

## Evaluation

Normal tests inject a fake adapter and make no network calls. The 20-case corpus is in `backend/tests/fixtures/policy_extraction_cases.json`. A paid live smoke test exists but is skipped unless `COUNTER_RUN_LIVE_LLM_TESTS=1` and an OpenRouter key is configured.
