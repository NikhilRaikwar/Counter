import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Sparkles, ArrowRight, ShieldCheck, Share2 } from "lucide-react";
import type { Offer } from "@/types/product";

interface PublishSuccessCardProps {
  offer: Offer;
}

export function PublishSuccessCard({ offer }: PublishSuccessCardProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const shareableUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/d/${offer.slug}`
      : `counter.app/d/${offer.slug}`;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12 animate-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3.5 py-1 text-xs font-bold shadow-2xs">
          <Sparkles className="size-3.5" />
          Link Published Successfully
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Your negotiable link is live.
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Share it with a buyer. Counter handles the negotiation within your rules.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {/* BIG LINK CARD */}
        <div className="rounded-2xl border-2 border-amber/70 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Shareable Negotiable Link
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live & Accepting Deals
            </span>
          </div>

          {/* URL Box */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-border bg-cream/40 p-2 sm:pr-2">
            <div className="flex-1 px-3 py-2 text-xs sm:text-sm font-mono text-ink truncate select-all">
              {shareableUrl}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg bg-amber px-4 py-2 text-xs font-bold text-amber-foreground shadow-xs hover:bg-amber/90 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy link</span>
                  </>
                )}
              </button>
              <Link
                to="/d/$slug"
                params={{ slug: offer.slug }}
                className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-ink hover:bg-muted transition-colors"
              >
                <span>Open buyer view</span>
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>

          {/* OFFER PREVIEW */}
          <div className="mt-6 rounded-xl border border-border/80 bg-background p-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-ink">{offer.productName}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Counter is ready to negotiate with incoming buyers.
              </p>
            </div>
            <span className="font-display font-extrabold text-lg text-ink">
              ₹{offer.listPrice.toLocaleString("en-IN")}
            </span>
          </div>

          {/* 3-STEP EXPLANATION */}
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border/70 pt-6 text-center text-xs">
            <div>
              <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-amber-soft font-display font-bold text-amber-foreground text-[0.7rem]">
                1
              </span>
              <p className="mt-1.5 font-bold text-ink">Share the link</p>
              <p className="text-[0.7rem] text-muted-foreground">Send via DM or email</p>
            </div>
            <div>
              <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-amber-soft font-display font-bold text-amber-foreground text-[0.7rem]">
                2
              </span>
              <p className="mt-1.5 font-bold text-ink">Buyer negotiates</p>
              <p className="text-[0.7rem] text-muted-foreground">Counter stays in bounds</p>
            </div>
            <div>
              <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-emerald-100 font-display font-bold text-emerald-800 text-[0.7rem]">
                3
              </span>
              <p className="mt-1.5 font-bold text-ink">Safe deal reaches checkout</p>
              <p className="text-[0.7rem] text-muted-foreground">Payment verified</p>
            </div>
          </div>
        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            to="/deals"
            className="text-xs font-semibold text-muted-foreground hover:text-ink transition-colors"
          >
            ← Back to all deals
          </Link>
          <Link
            to="/deals/$id"
            params={{ id: offer.id }}
            className="flex items-center gap-1.5 text-xs font-bold text-ink hover:text-amber-foreground underline"
          >
            <span>Inspect merchant rules & live deal desk</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
