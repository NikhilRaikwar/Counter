import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { Offer } from "@/types/product";

interface BuyerOfferCardProps {
  offer: Offer;
  onStartNegotiation: () => void;
  onPayFullPrice?: () => void;
}

export function BuyerOfferCard({ offer, onStartNegotiation, onPayFullPrice }: BuyerOfferCardProps) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-12 animate-in fade-in duration-300">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10 text-center">
        {/* Product Image / Icon */}
        <div className="mx-auto mb-5">
          {offer.image ? (
            <img
              src={offer.image}
              alt={offer.productName}
              className="size-20 mx-auto rounded-2xl object-cover border border-border shadow-xs"
            />
          ) : (
            <div className="flex size-16 mx-auto items-center justify-center rounded-2xl bg-amber text-amber-foreground font-display font-black text-2xl shadow-xs">
              {offer.productName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Merchant & Product Title */}
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {offer.merchantName}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          {offer.productName}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          {offer.description}
        </p>

        {/* Large Public Listed Price */}
        <div className="mt-6 rounded-2xl border border-border/80 bg-cream/40 p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Listed Price
          </span>
          <div className="mt-1 font-display text-4xl font-extrabold text-ink sm:text-5xl">
            ₹{offer.listPrice.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Divider & Negotiation Proposition */}
        <div className="mt-8 pt-8 border-t border-border/80 text-center">
          <h2 className="font-display text-xl font-bold text-ink">Want a better deal?</h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Negotiate directly with Counter. It can make offers within the seller's approved terms.
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={onStartNegotiation}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-4 text-base font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Sparkles className="size-4" />
              <span>Negotiate with Counter</span>
              <ArrowRight className="size-4" />
            </button>

            {onPayFullPrice && (
              <button
                type="button"
                onClick={onPayFullPrice}
                className="w-full py-2.5 text-xs font-semibold text-muted-foreground hover:text-ink transition-colors"
              >
                Or pay full price (₹{offer.listPrice.toLocaleString("en-IN")})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
