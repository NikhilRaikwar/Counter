import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Receipt,
  Plus,
  ExternalLink,
} from "lucide-react";
import type { Offer } from "@/types/product";

interface BuyerPaymentSuccessCardProps {
  offer: Offer | null;
  paidAmount?: number | null;
}

export function BuyerPaymentSuccessCard({ offer, paidAmount }: BuyerPaymentSuccessCardProps) {
  const listPrice = offer ? offer.listPrice : 0;
  const finalPrice = paidAmount ?? listPrice;
  const savings = Math.max(0, listPrice - finalPrice);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 animate-in zoom-in-95 duration-400">
      <div className="rounded-3xl border-2 border-emerald-300 bg-card p-6 shadow-lg sm:p-8 text-center relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 size-48 rounded-full bg-emerald-100/60 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 rounded-full bg-amber-100/50 blur-3xl pointer-events-none" />

        {/* Success Icon */}
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs ring-8 ring-emerald-50 mb-4">
          <CheckCircle2 className="size-9 stroke-[2.5]" />
        </div>

        {/* Status Badges */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs mb-2">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          <span>Razorpay Verified · Signed Authority</span>
        </div>

        <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">Payment Confirmed</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          Your negotiated order with{" "}
          <strong className="text-ink font-semibold">
            {offer?.merchantName ?? "the merchant"}
          </strong>{" "}
          is officially closed and recorded.
        </p>

        {/* PRODUCT & RECEIPT CARD */}
        <div className="mt-6 rounded-2xl border border-border/80 bg-muted/30 p-5 text-left space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-3">
              {offer?.image ? (
                <img
                  src={offer.image}
                  alt={offer.productName}
                  className="size-11 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="flex size-11 items-center justify-center rounded-xl bg-amber text-amber-foreground font-display font-black text-base">
                  {(offer?.productName || "CO").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-display text-sm font-bold text-ink leading-snug">
                  {offer?.productName ?? "Negotiated Item"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Fulfilled by {offer?.merchantName ?? "Counter Merchant"}
                </p>
              </div>
            </div>
            <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[0.7rem] font-bold text-emerald-800 uppercase tracking-wide">
              Paid in Full
            </span>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2 text-xs">
            {listPrice > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Standard list price</span>
                <span className="line-through">₹{listPrice.toLocaleString("en-IN")}</span>
              </div>
            )}
            {savings > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Counter negotiated discount</span>
                <span>-₹{savings.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-border/60 text-ink">
              <span className="font-bold text-sm">Total Paid Amount</span>
              <span className="font-display font-black text-2xl text-emerald-700">
                ₹{finalPrice.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* SAVINGS HIGHLIGHT PILL */}
        {savings > 0 && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-center justify-center gap-2 text-xs font-bold text-emerald-900 shadow-2xs">
            <Sparkles className="size-4 text-emerald-600 shrink-0" />
            <span>
              You saved ₹{savings.toLocaleString("en-IN")} through Counter's autonomous negotiation!
            </span>
          </div>
        )}

        {/* NEXT STEPS / ACTION BUTTONS */}
        <div className="mt-6 space-y-2.5">
          <Link
            to="/create"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-3.5 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="size-4" />
            <span>Create your own negotiable deal link</span>
          </Link>

          <Link
            to="/demo"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-xs font-semibold text-ink hover:bg-muted/40 transition-colors"
          >
            <span>Explore more Counter demos & architecture</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </Link>
        </div>

        {/* Security watermark footer */}
        <p className="mt-5 text-[0.7rem] text-muted-foreground">
          Receipt dispatched to your email via Razorpay · Cryptographically verifiable state
        </p>
      </div>
    </div>
  );
}
