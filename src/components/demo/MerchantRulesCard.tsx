import { ShieldCheck, Lock, Package, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ProductPolicy } from "@/types/demo";

interface MerchantRulesCardProps {
  policy: ProductPolicy;
  currentRound: number;
}

export function MerchantRulesCard({ policy, currentRound }: MerchantRulesCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-amber-soft text-amber-foreground">
            <Lock className="size-3.5" />
          </span>
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            Merchant Rules
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
          Fixed
        </span>
      </div>

      {/* Product Summary */}
      <div className="mt-4 flex items-start gap-3">
        {policy.imageUrl ? (
          <img
            src={policy.imageUrl}
            alt={policy.name}
            className="size-12 rounded-xl object-cover border border-border shrink-0"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber text-amber-foreground font-display font-black text-base shadow-xs">
            {policy.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-sm text-ink truncate">{policy.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {policy.description}
          </p>
        </div>
      </div>

      {/* Numerical Guardrails Table */}
      <div className="mt-4 rounded-xl border border-border/80 bg-cream/40 p-3">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-0.5 border-b border-border/40 text-muted-foreground">
            <span>List price</span>
            <span className="font-semibold text-ink">
              ₹{policy.listPrice.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-border/40 text-muted-foreground">
            <span className="font-medium text-emerald-800">Lowest price</span>
            <span className="font-bold text-emerald-700">
              ₹{policy.lowestPrice.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-border/40 text-muted-foreground">
            <span>Max discount</span>
            <span className="font-semibold text-ink">
              ₹{policy.maxDiscount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-border/40 text-muted-foreground">
            <span>Rounds</span>
            <span className="font-semibold text-ink">
              {currentRound} / {policy.maxRounds}
            </span>
          </div>
          <div className="flex justify-between py-0.5 text-muted-foreground">
            <span>Link expiry</span>
            <span className="font-semibold text-ink">{policy.linkExpiry}</span>
          </div>
        </div>
      </div>

      {/* Allowed Actions */}
      <div className="mt-4 pt-3 border-t border-border/60">
        <h4 className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-emerald-700">
          <span className="flex size-3.5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[0.6rem] font-black">
            ✓
          </span>
          Allowed
        </h4>
        <ul className="mt-2 space-y-1.5 text-xs text-ink/90">
          {policy.allowedActions.map((action, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold text-xs">✓</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Blocked Actions */}
      <div className="mt-4 pt-3 border-t border-border/60">
        <h4 className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-rose-700">
          <span className="flex size-3.5 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[0.6rem] font-black">
            ✕
          </span>
          Blocked
        </h4>
        <ul className="mt-2 space-y-1.5 text-xs text-ink/90">
          {policy.blockedActions.map((action, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-rose-600 font-bold text-xs">✕</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Switch Product Link */}
      <div className="mt-auto pt-5">
        <Link
          to="/demo/setup"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-ink hover:bg-muted/50"
        >
          <Package className="size-3.5" />
          Configure other product
        </Link>
      </div>
    </div>
  );
}
