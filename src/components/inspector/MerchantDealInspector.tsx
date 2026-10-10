import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import {
  counterApi,
  type DealTelemetry,
  type MerchantDeal,
  type MerchantDealMessage,
  type OfferSummary,
  type StructuredPolicy,
} from "@/services/counter-api";
import { getMerchantCapability } from "@/services/capability-store";

export function MerchantDealInspector({ dealId: offerId }: { dealId: string }) {
  const [offer, setOffer] = useState<OfferSummary | null>(null);
  const [policy, setPolicy] = useState<StructuredPolicy | null>(null);
  const [deal, setDeal] = useState<MerchantDeal | null>(null);
  const [messages, setMessages] = useState<MerchantDealMessage[]>([]);
  const [telemetry, setTelemetry] = useState<DealTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const capability = getMerchantCapability(offerId);
    if (!capability) {
      setError("This browser no longer has the management key for this Counter link.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [merchant, listing] = await Promise.all([
        counterApi.getMerchantOffer(offerId, capability),
        counterApi.getMerchantDeals(offerId, capability),
      ]);
      setOffer(merchant.offer);
      setPolicy(merchant.current_policy);
      const latest = listing.deals[0] ?? null;
      setDeal(latest);
      if (latest) {
        const detail = await counterApi.getMerchantDeal(offerId, latest.id, capability);
        setDeal(detail.deal);
        setMessages(detail.messages);
        try {
          const tel = await counterApi.getDealTelemetry(latest.id);
          setTelemetry(tel);
        } catch {
          setTelemetry(null);
        }
      } else {
        setMessages([]);
        setTelemetry(null);
      }
      setError(null);
    } catch {
      setError("The private deal inspector could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center text-sm text-muted-foreground">
        Loading deal…
      </div>
    );
  if (error || !offer || !policy)
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-muted-foreground">
        {error ?? "Offer unavailable."}
      </div>
    );
  const failed = deal?.candidate_validation_status === "failed";
  const passed = deal?.candidate_validation_status === "passed";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Merchant Deal Inspector
          </p>
          <h1 className="font-display text-2xl font-extrabold text-ink">{offer.product_name}</h1>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
        >
          <RefreshCw className="size-3" /> Refresh
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600" />
            <h2 className="font-display text-sm font-bold">Merchant Policy</h2>
          </div>
          <dl className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between">
              <dt>Public price</dt>
              <dd className="font-bold">
                ₹{(offer.list_price_paise / 100).toLocaleString("en-IN")}
              </dd>
            </div>
            <div className="flex justify-between rounded-lg bg-emerald-50 p-2">
              <dt>Private floor</dt>
              <dd className="font-bold text-emerald-700">
                ₹{(policy.floor_price_paise / 100).toLocaleString("en-IN")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Max discount</dt>
              <dd className="font-bold">
                ₹{(policy.max_discount_paise / 100).toLocaleString("en-IN")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Rounds</dt>
              <dd className="font-bold">{policy.max_rounds}</dd>
            </div>
          </dl>

          {/* TOKEN ECONOMICS & PHOENIX OBSERVABILITY PANEL */}
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-ink">
                Token Economics
              </span>
              {telemetry?.available ? (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[0.62rem] font-bold text-emerald-800">
                  Phoenix Active ({telemetry.turns_count} turns)
                </span>
              ) : (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.62rem] font-semibold text-muted-foreground">
                  Telemetry Unavailable
                </span>
              )}
            </div>

            {telemetry?.available ? (
              <>
                <div className="mt-3 rounded-xl border border-border/80 bg-cream/40 p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session Cost:</span>
                    <span className="font-mono font-bold text-emerald-800">
                      ₹{telemetry.total_cost_inr?.toFixed(3) ?? "0.000"} (${telemetry.total_cost_usd?.toFixed(4) ?? "0.0000"})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tokens:</span>
                    <span className="font-mono font-semibold text-ink">
                      {telemetry.total_tokens?.toLocaleString() ?? 0} tokens
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-mono text-[0.7rem] text-ink truncate max-w-[120px]">
                      OpenRouter / Llama 3.3 70B
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Latency Breakdown
                  </span>
                  <div className="mt-1.5 space-y-1.5 text-xs">
                    <div>
                      <div className="flex justify-between text-[0.7rem] text-muted-foreground mb-0.5">
                        <span>Planner TTFT</span>
                        <span className="font-mono font-bold text-ink">{telemetry.planner_ttft_ms ?? 0} ms</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-amber rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(10, Math.round(((telemetry.planner_ttft_ms ?? 300) / (telemetry.avg_latency_ms || 700)) * 100)))}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[0.7rem] text-muted-foreground mb-0.5">
                        <span>Composer Stream</span>
                        <span className="font-mono font-bold text-ink">{telemetry.composer_latency_ms ?? 0} ms</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(10, Math.round(((telemetry.composer_latency_ms ?? 300) / (telemetry.avg_latency_ms || 700)) * 100)))}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-1.5">
                      <div className="flex justify-between text-[0.7rem] font-bold text-emerald-900">
                        <span>Deterministic Gate Check</span>
                        <span className="font-mono text-emerald-700">
                          {telemetry.gate_validation_ms ?? 0} ms (<span className="text-emerald-800">&lt; 2ms</span>)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-border/80 bg-cream/30 p-3 text-xs text-center">
                <p className="font-semibold text-ink">Telemetry unavailable</p>
                <p className="mt-1 text-[0.72rem] leading-relaxed text-muted-foreground">
                  No Phoenix trace recorded for this deal yet. Start Arize Phoenix (<code className="font-mono bg-muted/60 px-1 py-0.5 rounded text-[0.68rem]">docker-compose up -d</code>) and send a negotiation turn to stream live metrics.
                </p>
              </div>
            )}

            <a
              href="http://localhost:6006"
              target="_blank"
              rel="noreferrer"
              className="mt-3.5 block text-center rounded-xl bg-ink text-white py-2 text-[0.7rem] font-bold transition-transform hover:-translate-y-0.5"
            >
              Open Arize Phoenix Traces ↗
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card lg:col-span-6 overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">Deal Conversation Flow</h2>
            <span className="text-xs text-muted-foreground">Single Buyer Session</span>
          </div>
          <div className="min-h-[380px] max-h-[520px] space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <p className="py-16 text-center text-xs text-muted-foreground">
                No buyer conversation yet. Open the public link to start one.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.sender === "buyer" ? "items-end" : "items-start"}`}
                >
                  <span className="mb-1 text-[0.68rem] font-semibold text-muted-foreground">
                    {message.sender === "buyer" ? "👤 Buyer" : "🤖 Counter Agent"} · Turn #
                    {message.sequence}
                  </span>
                  <p
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${message.sender === "buyer" ? "bg-muted text-foreground" : "bg-amber-soft text-ink border border-amber-200/50"}`}
                  >
                    {message.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">
              Decision Engine
            </h2>
            {!deal && (
              <div className="py-10 text-center text-xs text-muted-foreground">
                <Clock className="mx-auto mb-2 size-5" />
                Awaiting a deal
              </div>
            )}
            {deal && (
              <div className="mt-4 space-y-3 text-xs">
                <div
                  className={`rounded-xl p-4 text-center ${failed ? "bg-rose-50 text-rose-800 border border-rose-200" : passed ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-muted"}`}
                >
                  {failed ? (
                    <XCircle className="mx-auto size-6" />
                  ) : (
                    <CheckCircle2 className="mx-auto size-6" />
                  )}
                  <p className="mt-1 font-bold uppercase">
                    Policy {deal.candidate_validation_status ?? "pending"}
                  </p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Candidate Action:</span>
                    <span className="font-bold">{deal.candidate_action ?? "—"}</span>
                  </p>
                  {deal.candidate_amount_paise !== null && (
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Proposed Amount:</span>
                      <span className="font-bold">
                        ₹{(deal.candidate_amount_paise / 100).toLocaleString("en-IN")}
                      </span>
                    </p>
                  )}
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Commercial Rounds:</span>
                    <span className="font-bold">
                      {deal.commercial_rounds_used} / {policy.max_rounds}
                    </span>
                  </p>
                </div>
                {deal.candidate_violation_codes.map((code) => (
                  <p
                    key={code}
                    className="rounded-lg bg-rose-50 px-2 py-1 font-mono text-[0.7rem] text-rose-800 border border-rose-200"
                  >
                    {code}
                  </p>
                ))}
                <div className="border-t border-border pt-2 space-y-1.5">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Agreement:</span>
                    <span className="font-bold">
                      {deal.agreement_locked_at
                        ? `Locked at ₹${((deal.accepted_amount_paise ?? 0) / 100).toLocaleString("en-IN")}`
                        : "In Progress"}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Checkout Status:</span>
                    <span className="font-bold uppercase text-[0.7rem]">
                      {deal.payment_status ? deal.payment_status : "Awaiting Lock"}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* MARGIN PRESERVED METRIC */}
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 shadow-2xs">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-emerald-950 mb-1">
              Margin Guarded
            </h3>
            <p className="font-display text-xl font-extrabold text-emerald-800">
              {deal?.accepted_amount_paise
                ? `₹${Math.max(0, (deal.accepted_amount_paise - policy.floor_price_paise) / 100).toLocaleString("en-IN")} saved above floor`
                : "100% Floor Preserved"}
            </p>
            <p className="text-[0.68rem] text-emerald-700 mt-1">
              Zero unauthorized concession breaches permitted.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider">
                Turn-by-Turn Audit Log
              </h3>
              <span className="text-[0.65rem] font-mono text-muted-foreground">{messages.length} turns</span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-[0.75rem] text-muted-foreground italic">No turns logged yet.</p>
              ) : (
                messages.map((message) => {
                  const events = (message.metadata?.events ?? []) as string[];
                  const isRejected = events.includes("policy_check_failed");
                  const isApproved = events.includes("policy_check_passed") || events.includes("safe_outcome_derived");
                  return (
                    <div
                      key={message.id}
                      className="rounded-lg border border-border/70 bg-cream/40 p-2 text-[0.72rem] space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-ink">Turn #{message.sequence} ({message.sender})</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[0.65rem] font-bold ${
                            isRejected
                              ? "bg-rose-100 text-rose-800"
                              : isApproved
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isRejected ? "❌ REJECTED" : isApproved ? "✅ ALLOWED" : "OBSERVED"}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[0.68rem] font-mono truncate">
                        {events.length > 0 ? events.join(" → ") : "observed"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
