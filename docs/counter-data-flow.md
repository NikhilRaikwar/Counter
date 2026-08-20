# Counter Data Flow

```text
Merchant creates offer
  -> plain-English rules
  -> constrained rule extraction (untrusted structured draft)
  -> merchant reviews/edits structured policy
  -> immutable policy version + separate merchant capability
  -> public readable+unguessable link
  -> buyer starts deal tied to policy_version_id
  -> LangGraph thread created with thread_id = deal.id
  -> buyer message stored as UNTRUSTED
  -> trusted offer/policy/deal loaded from DB
  -> model returns typed AgentDecision (UNTRUSTED proposal)
  -> strict Pydantic validation
  -> candidate persisted as untrusted proposal
  -> pure deterministic gate validates price/action/bundle/round/exact policy version
  -> candidate PASS/FAIL and stable violation codes persisted
  -> failed commercial action gets a deterministic safe buyer response
  -> passed commercial message is rendered from validated structured values
  -> passed acceptance atomically locks amount/currency/bundle under the deal's policy version
  -> buyer clicks Pay ₹X / Continue to checkout
  -> server reloads offer, immutable policy version, deal, and accepted terms
  -> deterministic policy revalidation passes
  -> payment execution row atomically claimed under a unique execution identity
  -> server-only Razorpay Test API creates Standard Payment Link
  -> external id/reference/short_url persisted
  -> buyer opens hosted Razorpay page and chooses test success/failure
  -> signed webhook received from raw bytes
  -> event deduplicated and terms correlated
  -> deal transitions monotonically to PAID
```

The model can emit only `counter`, `offer_bundle`, `accept`, `refuse`, or `clarify` with typed amount/bundle/message fields. It cannot mutate policy, authorize execution, call Razorpay, or mark payment complete. The buyer CTA triggers execution for an already locked, policy-approved agreement; it cannot choose an amount or bypass authoritative server revalidation. The merchant may remain offline after publishing.

Phase 6 routes now consume this flow directly. Browser storage remembers only merchant/deal capabilities and a transient review handoff; offer, policy, conversation, candidate, agreement, and audit truth is reloaded from the backend. Checkout remains disabled until Phase 7.

In Phase 5, an unsafe `accept` or `counter` remains an auditable failed candidate. The deal stays negotiating, authoritative accepted fields remain null, and no checkout/payment path exists. A safe `accept` alone may create an authoritative locked agreement after deterministic validation. The application database owns canonical ordered messages; LangGraph checkpoints own workflow state under `thread_id = deal.id`.
