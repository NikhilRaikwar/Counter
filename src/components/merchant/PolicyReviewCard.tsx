import { useState, useEffect } from "react";
import { useRouter, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
} from "lucide-react";
import type { Offer, MerchantPolicy } from "@/types/product";
import { counterApi, CounterApiError } from "@/services/counter-api";
import {
  clearPendingPolicyReview,
  getMerchantCapability,
  getPendingPolicyReview,
} from "@/services/capability-store";

type DraftData = {
  productName: string;
  description: string;
  listPrice: number;
  image?: string;
  policy: MerchantPolicy;
  floorPricePaise: number;
  maxDiscountPaise: number;
};

export function PolicyReviewCard() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const review = getPendingPolicyReview();
    if (!review) return;
    const extracted = review.extraction.draft;
    setOfferId(review.offer.id);
    setIssues([
      ...review.extraction.conflicts.map((item) => item.message),
      ...review.extraction.warnings,
      ...review.extraction.missing_fields.map((item) => `Missing: ${item}`),
    ]);
    setDraft({
      productName: review.offer.product_name,
      description: review.offer.description,
      listPrice: review.offer.list_price_paise / 100,
      image: review.offer.image_url ?? undefined,
      policy: {
        floorPrice: (extracted.floor_price_paise ?? 0) / 100,
        maxDiscount: (extracted.max_discount_paise ?? 0) / 100,
        maxRounds: extracted.max_rounds ?? 0,
        expiryMinutes: extracted.expiry_minutes ?? 0,
        rawRules: review.rulesText,
        allowedBundles: extracted.allowed_bundles.map((item) => item.name),
        allowedActions: extracted.allowed_actions,
        blockedActions: extracted.forbidden_actions,
      },
      floorPricePaise: extracted.floor_price_paise ?? 0,
      maxDiscountPaise: extracted.max_discount_paise ?? 0,
    });
  }, []);

  const handlePublish = async () => {
    if (!draft || !offerId || issues.length > 0) return;
    const capability = getMerchantCapability(offerId);
    if (!capability) {
      setError("This browser no longer has the management key for this Counter link.");
      return;
    }
    setIsPublishing(true);
    setError(null);
    try {
      await counterApi.publishOffer(offerId, capability, {
        currency: "INR",
        floor_price_paise: draft.floorPricePaise,
        max_discount_paise: draft.maxDiscountPaise,
        max_rounds: draft.policy.maxRounds,
        expiry_minutes: draft.policy.expiryMinutes,
        allowed_bundles: draft.policy.allowedBundles.map((name, index) => ({
          id: `${
            name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "bundle"
          }-${index + 1}`,
          name,
          additional_cost_paise: 0,
        })),
        allowed_actions: draft.policy.allowedActions,
        forbidden_actions: draft.policy.blockedActions,
        original_rules_text: draft.policy.rawRules ?? "",
      });
      clearPendingPolicyReview();
      router.navigate({ to: "/deals/$id/published", params: { id: offerId } });
    } catch (cause) {
      setError(
        cause instanceof CounterApiError ? cause.message : "Publishing failed. Please retry.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  if (!draft)
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-muted-foreground">
        No reviewable draft is available. Return to Create to begin.
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3.5 py-1 text-xs font-semibold text-amber-foreground">
          <ShieldCheck className="size-3.5" />
          Step 2: Authority Confirmation
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Here's what Counter can do.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Confirm the boundaries before publishing your negotiable link.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        {/* OFFER SUMMARY CARD */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              {draft.image ? (
                <img
                  src={draft.image}
                  alt={draft.productName}
                  className="size-12 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-xl bg-amber text-amber-foreground font-display font-black text-base">
                  {draft.productName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="font-display text-xl font-bold text-ink">{draft.productName}</h2>
                <p className="text-xs text-muted-foreground line-clamp-1">{draft.description}</p>
              </div>
            </div>
            <Link
              to="/create"
              className="text-xs font-semibold text-muted-foreground hover:text-ink underline"
            >
              Edit details
            </Link>
          </div>

          {/* Pricing & Policy breakdown */}
          <div className="mt-6 rounded-xl border border-border/80 bg-cream/40 overflow-hidden">
            <div className="divide-y divide-border/60 text-xs sm:text-sm">
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground font-medium">Public price (Buyer sees)</span>
                <span className="font-bold text-ink text-base">
                  ₹{draft.listPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 bg-emerald-50/60">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-950 font-semibold">Lowest allowed price</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[0.65rem] font-bold">
                    <Lock className="size-2.5" /> 🔒 Private
                  </span>
                </div>
                <span className="font-bold text-emerald-700 text-base">
                  ₹{draft.policy.floorPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-medium">Maximum discount</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[0.65rem] font-bold">
                    🔒 Private
                  </span>
                </div>
                <span className="font-bold text-ink">
                  ₹{draft.policy.maxDiscount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Maximum rounds</span>
                <span className="font-bold text-ink">{draft.policy.maxRounds} rounds</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-muted-foreground">Offer expiry window</span>
                <span className="font-bold text-ink">{draft.policy.expiryMinutes} minutes</span>
              </div>
            </div>
          </div>

          {/* COUNTER MAY vs COUNTER MAY NEVER */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {/* COUNTER MAY (GREEN) */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Counter May
              </h3>
              <ul className="mt-3 space-y-2 text-xs font-medium text-ink/90">
                {draft.policy.allowedActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* COUNTER MAY NEVER (RED) */}
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-5">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-800">
                <XCircle className="size-4 text-rose-600" />
                Counter May Never
              </h3>
              <ul className="mt-3 space-y-2 text-xs font-medium text-ink/90">
                {draft.policy.blockedActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          {issues.length > 0 && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
              {issues.map((issue) => (
                <p key={issue}>• {issue}</p>
              ))}
            </div>
          )}
          {error && <p className="mt-4 text-xs font-medium text-rose-700">{error}</p>}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border/80">
            <Link
              to="/create"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-ink hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-4" />
              Edit rules
            </Link>

            <button
              type="button"
              onClick={handlePublish}
              disabled={issues.length > 0 || isPublishing}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber px-7 py-3.5 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {isPublishing ? "Publishing…" : "Publish negotiable link"}{" "}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
