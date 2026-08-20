import { X, ShieldCheck, Check, CreditCard, Lock } from "lucide-react";
import type { ProductPolicy } from "@/types/demo";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: ProductPolicy;
  negotiatedPrice: number;
}

export function CheckoutModal({ isOpen, onClose, policy, negotiatedPrice }: CheckoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-ink transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2">
          <img
            src="/counter-favicon.png"
            alt="Counter"
            className="size-7 rounded-lg object-contain border border-border/60 shadow-xs"
          />
          <span className="font-display font-bold text-sm text-ink">Counter Checkout</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700">
            Verified Deal
          </span>
        </div>

        {/* Product Details */}
        <div className="mt-5 rounded-xl border border-border/80 bg-cream/40 p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-display font-bold text-sm text-ink">{policy.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Negotiated deal price</p>
            </div>
            <div className="text-right">
              <span className="line-through text-xs text-muted-foreground block">
                ₹{policy.listPrice.toLocaleString("en-IN")}
              </span>
              <span className="font-display font-extrabold text-xl text-emerald-700">
                ₹{negotiatedPrice.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Verified Deal Badge */}
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold">Deal Terms Verified</p>
            <p className="text-[0.7rem] text-emerald-700">
              Approved within merchant guardrails. Razorpay checkout simulation.
            </p>
          </div>
        </div>

        {/* Mock Payment Form */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-ink">Email address</label>
            <input
              type="email"
              readOnly
              value="buyer@example.com"
              className="mt-1 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs text-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink">Payment method</label>
            <div className="mt-1 flex items-center justify-between rounded-xl border border-amber/70 bg-amber-soft/30 px-3.5 py-2.5 text-xs font-medium text-ink">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-amber-foreground" />
                <span>UPI / Cards / Net Banking</span>
              </div>
              <span className="text-[0.65rem] font-bold uppercase text-amber-foreground">
                Ready
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 space-y-2">
          <button
            onClick={() => {
              alert("Demo simulation complete! In production, this opens live Razorpay Checkout.");
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-3 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Lock className="size-3.5" />
            Simulate Pay ₹{negotiatedPrice.toLocaleString("en-IN")}
          </button>
          <button
            onClick={onClose}
            className="w-full text-center text-xs font-medium text-muted-foreground hover:text-ink py-1"
          >
            Back to negotiation
          </button>
        </div>
      </div>
    </div>
  );
}
