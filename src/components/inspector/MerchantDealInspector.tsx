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
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-sm font-bold">Conversation View</h2>
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
                  <span className="mb-1 text-[0.68rem] text-muted-foreground">
                    {message.sender === "buyer" ? "Buyer" : "Counter"} · #{message.sequence}
                  </span>
                  <p
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${message.sender === "buyer" ? "bg-muted" : "bg-amber-soft"}`}
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
                  className={`rounded-xl p-4 text-center ${failed ? "bg-rose-50 text-rose-800" : passed ? "bg-emerald-50 text-emerald-800" : "bg-muted"}`}
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
                <p>
                  <strong>Candidate:</strong> {deal.candidate_action ?? "—"}{" "}
                  {deal.candidate_amount_paise !== null
                    ? `₹${(deal.candidate_amount_paise / 100).toLocaleString("en-IN")}`
                    : ""}
                </p>
                {deal.candidate_violation_codes.map((code) => (
                  <p key={code} className="rounded-lg bg-rose-50 px-2 py-1 font-mono text-rose-800">
                    {code}
                  </p>
                ))}
                <p>
                  <strong>Agreement:</strong>{" "}
                  {deal.agreement_locked_at
                    ? `Locked at ₹${((deal.accepted_amount_paise ?? 0) / 100).toLocaleString("en-IN")}`
                    : "Not created"}
                </p>
                <p>
                  <strong>Payment Link:</strong>{" "}
                  {deal.payment_status ? deal.payment_status.toUpperCase() : "NOT CREATED"}
                </p>
                <p>
                  <strong>Payment:</strong>{" "}
                  {deal.payment_status === "paid" ? "CONFIRMED" : "AWAITING CONFIRMATION"}
                </p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-display text-xs font-bold uppercase">Audit trail</h3>
            {messages.flatMap((message) => {
              const events = (message.metadata.events ?? []) as string[];
              return events.map((event) => (
                <p key={`${message.id}-${event}`} className="mt-2 text-xs text-muted-foreground">
                  ✓ {event}
                </p>
              ));
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
