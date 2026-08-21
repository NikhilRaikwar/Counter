import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import {
  counterApi,
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
      } else setMessages([]);
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
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider mb-2">
              Audit trail
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {Array.from(
                new Set(
                  messages.flatMap((message) => {
                    const events = (message.metadata.events ?? []) as string[];
                    return events;
                  }),
                ),
              ).map((event) => (
                <p
                  key={event}
                  className="text-[0.75rem] text-muted-foreground flex items-center gap-1.5"
                >
                  <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                  <span className="font-mono">{event}</span>
                </p>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
