import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import type { Offer } from "@/types/product";

interface BuyerDealAgreedCardProps {
  offer: Offer;
  agreedPrice: number;
  onOpenCheckout?: () => void;
  paymentState?: "idle" | "preparing" | "awaiting" | "paid" | "failed";
}

export function BuyerDealAgreedCard({
  offer,
  agreedPrice,
  onOpenCheckout,
  paymentState = "idle",
}: BuyerDealAgreedCardProps) {
  const buyerSavings = Math.max(0, offer.listPrice - agreedPrice);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 animate-in zoom-in-95 duration-300">
      <div className="rounded-3xl border-2 border-emerald-300 bg-card p-6 shadow-md sm:p-8 text-center">
        {/* Verified Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>✓ Verified deal</span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          {paymentState === "paid" ? "Payment confirmed." : "Deal agreed."}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Approved within the seller's verified terms.
        </p>

        {/* Large Agreed Price Banner */}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
            Final Negotiated Price
          </span>
          <div className="mt-1 font-display text-4xl font-black text-ink sm:text-5xl">
            ₹{agreedPrice.toLocaleString("en-IN")}
          </div>
          <span className="mt-1.5 inline-block text-xs font-bold text-emerald-700">
            You save ₹{buyerSavings.toLocaleString("en-IN")} on this offer
          </span>
        </div>

        {/* Summary Table */}
        <div className="mt-6 rounded-xl border border-border/80 bg-cream/40 p-4 text-xs space-y-2.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Original price</span>
            <span className="line-through text-ink font-medium">
              ₹{offer.listPrice.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-ink font-bold">
            <span>Your agreed deal</span>
            <span className="text-emerald-700 font-extrabold">
              ₹{agreedPrice.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-emerald-800 font-semibold pt-1 border-t border-border/60">
            <span>Total savings</span>
            <span>₹{buyerSavings.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Expiry Note */}
        <p className="mt-4 text-xs text-muted-foreground">
          Offer locked & valid for <strong>{offer.policy.expiryMinutes || 30} minutes</strong>
        </p>

        {/* Primary Payment CTA */}
        <button
          type="button"
          onClick={onOpenCheckout}
          disabled={!onOpenCheckout || paymentState === "preparing" || paymentState === "paid"}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-4 text-base font-bold text-amber-foreground shadow-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>
            {paymentState === "preparing"
              ? "Preparing secure checkout…"
              : paymentState === "awaiting"
                ? "Open checkout again"
                : paymentState === "paid"
                  ? "Payment confirmed"
                  : `Pay ₹${agreedPrice.toLocaleString("en-IN")}`}
          </span>
          <ArrowRight className="size-4" />
        </button>
        {paymentState === "awaiting" && (
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            Checkout opened. Awaiting verified payment confirmation…
          </p>
        )}
        {paymentState === "failed" && (
          <p className="mt-3 text-xs font-medium text-rose-700">
            Secure checkout could not be prepared. Please retry.
          </p>
        )}

        {/* Discreet Recruiter / Merchant Inspector Bridge */}
        {offer.id !== offer.slug && (
          <div className="mt-6 pt-4 border-t border-border/60">
            <Link
              to="/deals/$id"
              params={{ id: offer.id }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-ink font-medium underline"
            >
              <span>Inspect what Counter verified behind the scenes</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
