import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  CreditCard,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { Offer } from "@/types/product";
import { counterApi } from "@/services/counter-api";
import { getMerchantCapabilities } from "@/services/capability-store";
import { toFrontendOffer } from "@/services/frontend-models";

export function DealsList() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const capabilities = getMerchantCapabilities();
    Promise.all(
      Object.entries(capabilities).map(async ([offerId, capability]) => {
        const [merchant, deals] = await Promise.all([
          counterApi.getMerchantOffer(offerId, capability),
          counterApi.getMerchantDeals(offerId, capability),
        ]);
        return toFrontendOffer(merchant.offer, merchant.current_policy, {
          conversations: deals.deals.length,
          agreed: deals.deals.filter((deal) => deal.status === "agreed").length,
        });
      }),
    )
      .then(setOffers)
      .finally(() => setIsLoading(false));
  }, []);

  const handleCopyLink = (slug: string, id: string) => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/d/${slug}`
        : `counter.app/d/${slug}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Your Counter links.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Active negotiable offers and autonomous deal desk status.
          </p>
        </div>

        <Link
          to="/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber px-5 py-3 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5"
        >
          <Plus className="size-4" />
          <span>+ Create deal</span>
        </Link>
      </div>

      {/* Deals List */}
      <div className="mt-8 space-y-4">
        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading deals…</p>
        ) : offers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-soft text-amber-foreground">
              <Plus className="size-6" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-ink">
              Create your first negotiable link.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Set your limits once and let Counter handle buyer negotiations safely.
            </p>
            <Link
              to="/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber px-6 py-3 text-sm font-bold text-amber-foreground shadow-xs hover:bg-amber/90"
            >
              <Plus className="size-4" />
              <span>Create deal</span>
            </Link>
          </div>
        ) : (
          offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-border/90 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Product info */}
                <div className="flex items-start gap-3.5">
                  {offer.image ? (
                    <img
                      src={offer.image}
                      alt={offer.productName}
                      className="size-12 rounded-xl object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber text-amber-foreground font-display font-black text-base">
                      {offer.productName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-base text-ink">
                        {offer.productName}
                      </h3>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-800 uppercase">
                        {offer.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                      {offer.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="font-bold text-ink">
                        ₹{offer.listPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        Floor: ₹{offer.policy.floorPrice.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Stats */}
                <div className="flex items-center gap-4 sm:gap-6 border-y md:border-y-0 md:border-x border-border/60 py-3 md:py-0 md:px-6 text-center text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[0.7rem]">Chats</span>
                    <span className="font-display font-bold text-base text-ink">
                      {offer.conversationsCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-medium block text-[0.7rem]">
                      Deals Agreed
                    </span>
                    <span className="font-display font-bold text-base text-emerald-700">
                      {offer.dealsAgreedCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.7rem]">Paid</span>
                    <span className="font-display font-bold text-base text-ink">
                      {offer.paidCount}
                    </span>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(offer.slug, offer.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-ink hover:bg-muted transition-colors cursor-pointer"
                  >
                    {copiedId === offer.id ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy link</span>
                      </>
                    )}
                  </button>

                  <Link
                    to="/deals/$id"
                    params={{ id: offer.id }}
                    className="flex items-center gap-1 rounded-xl bg-ink text-white px-3.5 py-2 text-xs font-bold shadow-xs hover:bg-ink/90 transition-colors"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
