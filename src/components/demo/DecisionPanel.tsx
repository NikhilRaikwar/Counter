import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Lock,
  Sparkles,
} from "lucide-react";
import type { DecisionState, ActivityItem, ProductPolicy } from "@/types/demo";

interface DecisionPanelProps {
  decisionState: DecisionState;
  policy: ProductPolicy;
  negotiatedPrice: number;
  attemptedPrice: number;
  activity: ActivityItem[];
  onCreatePaymentLink: () => void;
  onOpenCheckoutModal: () => void;
}

export function DecisionPanel({
  decisionState,
  policy,
  negotiatedPrice,
  attemptedPrice,
  activity,
  onCreatePaymentLink,
  onOpenCheckoutModal,
}: DecisionPanelProps) {
  const buyerSaved = Math.max(0, policy.listPrice - negotiatedPrice);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. MAIN DECISION CARD */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all duration-300">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            Decision
          </h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${
              decisionState === "approved" || decisionState === "payment_ready"
                ? "bg-emerald-100 text-emerald-800"
                : decisionState === "blocked"
                  ? "bg-rose-100 text-rose-800"
                  : decisionState === "negotiating"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {decisionState === "approved"
              ? "Approved"
              : decisionState === "payment_ready"
                ? "Payment Ready"
                : decisionState === "blocked"
                  ? "Blocked"
                  : decisionState === "negotiating"
                    ? "Negotiating"
                    : "Idle"}
          </span>
        </div>

        {/* STATE: IDLE */}
        {decisionState === "idle" && (
          <div className="mt-4 py-8 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Clock className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-sm font-bold text-ink">Awaiting Proposal</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Waiting for a deal proposal from the buyer.
            </p>
          </div>
        )}

        {/* STATE: NEGOTIATING */}
        {decisionState === "negotiating" && (
          <div className="mt-4 py-6 text-center animate-in fade-in duration-300">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-amber-soft text-amber-foreground">
              <span className="size-5 border-2 border-amber-foreground border-t-transparent rounded-full animate-spin"></span>
            </div>
            <h3 className="mt-3 font-display text-sm font-bold text-amber-foreground">
              Evaluating Deal
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Checking proposal against merchant floor limits & policy...
            </p>
          </div>
        )}

        {/* STATE: APPROVED */}
        {decisionState === "approved" && (
          <div className="mt-4 animate-in zoom-in-95 duration-300 space-y-4">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                <CheckCircle2 className="size-6" />
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                Approved Deal
              </p>
              <h3 className="mt-1 font-display text-3xl font-extrabold text-ink">
                ₹{negotiatedPrice.toLocaleString("en-IN")}
              </h3>
              <p className="mt-0.5 text-xs text-emerald-700 font-medium">
                Buyer saved ₹{buyerSaved.toLocaleString("en-IN")} within margin safety
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-1.5 rounded-xl border border-border/80 bg-cream/30 p-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Above floor price (₹{policy.lowestPrice.toLocaleString("en-IN")})</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Within discount limit (₹{policy.maxDiscount.toLocaleString("en-IN")})</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Product deliverables unchanged</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Payment link creation authorized</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCreatePaymentLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-3 text-xs font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Create test payment link <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {/* STATE: PAYMENT READY */}
        {decisionState === "payment_ready" && (
          <div className="mt-4 animate-in zoom-in-95 duration-300 space-y-4">
            <div className="rounded-xl border border-emerald-400 bg-emerald-500 text-white p-4 text-center shadow-xs">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/80 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-100">
                <Sparkles className="size-3" /> Link Generated
              </div>
              <h3 className="mt-2 font-display text-2xl font-black">Deal Ready.</h3>
              <p className="text-xs text-emerald-100">Verified Razorpay payment link ready</p>
            </div>

            {/* Price breakdown */}
            <div className="rounded-xl border border-border/80 bg-cream/40 p-3 text-xs space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Original price</span>
                <span className="line-through text-ink">
                  ₹{policy.listPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between font-bold text-ink">
                <span>Negotiated price</span>
                <span className="text-emerald-700">₹{negotiatedPrice.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Buyer saved</span>
                <span className="font-semibold">₹{buyerSaved.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/60 text-muted-foreground">
                <span>Merchant floor</span>
                <span className="font-medium text-ink">
                  ₹{policy.lowestPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCheckoutModal}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink text-white py-3 text-xs font-bold shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              Open test checkout <ExternalLink className="size-3.5" />
            </button>

            <div className="flex items-center justify-between px-1 text-[0.7rem] font-semibold">
              <span className="text-emerald-700">Policy: PASS</span>
              <span className="text-emerald-700">Execution: ALLOWED</span>
            </div>
          </div>
        )}

        {/* STATE: BLOCKED */}
        {decisionState === "blocked" && (
          <div className="mt-4 animate-in zoom-in-95 duration-300 space-y-4">
            <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-4 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
                <XCircle className="size-6" />
              </div>
              <h3 className="mt-2 font-display text-xl font-extrabold text-rose-900">
                Execution blocked.
              </h3>
              <p className="mt-1 text-xs text-rose-700 font-medium">
                Counter protected the merchant's pricing rules.
              </p>
            </div>

            {/* Attempted price */}
            <div className="rounded-xl border border-rose-200 bg-white p-3 text-center">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                Attempted Price
              </span>
              <p className="font-display text-2xl font-black text-rose-700">
                ₹{attemptedPrice || 1}
              </p>
            </div>

            {/* Violations */}
            <div className="space-y-1.5 rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs">
              <div className="flex items-center gap-2 text-rose-800 font-medium">
                <span className="text-rose-600 font-bold">✕</span>
                <span>Below floor price (₹{policy.lowestPrice.toLocaleString("en-IN")})</span>
              </div>
              <div className="flex items-center gap-2 text-rose-800 font-medium">
                <span className="text-rose-600 font-bold">✕</span>
                <span>Unauthorized discount</span>
              </div>
              <div className="flex items-center gap-2 text-rose-800 font-medium">
                <span className="text-rose-600 font-bold">✕</span>
                <span>Merchant rules cannot be changed by buyer</span>
              </div>
            </div>

            <div className="rounded-xl bg-rose-100/70 py-2.5 text-center text-xs font-bold text-rose-900">
              No payment action allowed
            </div>
          </div>
        )}
      </div>

      {/* 2. ACTIVITY TRAIL CARD */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
          <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider">
            Activity Trail
          </h3>
          <span className="text-[0.65rem] text-muted-foreground font-medium">Audit Log</span>
        </div>

        <div className="mt-3 space-y-2.5">
          {activity.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold ${
                  item.status === "done"
                    ? "bg-emerald-100 text-emerald-700"
                    : item.status === "failed"
                      ? "bg-rose-100 text-rose-700"
                      : item.status === "active"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {item.status === "done"
                  ? "✓"
                  : item.status === "failed"
                    ? "✕"
                    : item.status === "active"
                      ? "●"
                      : "•"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-ink font-medium leading-snug">{item.label}</p>
                <p className="text-[0.65rem] text-muted-foreground">{item.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
