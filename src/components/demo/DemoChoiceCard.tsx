import { Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Plus, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { DEFAULT_EXAMPLE_PRODUCT } from "@/lib/demo-data";
import { saveStoredPolicy } from "@/lib/demo-store";

export function DemoChoiceCards() {
  const router = useRouter();

  const handleStartExample = () => {
    saveStoredPolicy(DEFAULT_EXAMPLE_PRODUCT);
    router.navigate({ to: "/demo/deal" });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-soft px-3.5 py-1 text-xs font-semibold text-amber-foreground">
          <Sparkles className="size-3.5" />
          Interactive product demo
        </span>

        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Negotiate one safe deal.
        </h1>

        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Try Counter with our example, or create your own negotiable product in under a minute.
        </p>

        {/* 3 Step Summary */}
        <div className="mt-8 grid grid-cols-3 gap-3 border-y border-border/80 py-4 text-left sm:gap-6 sm:py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cream font-display text-xs font-bold text-ink">
              1
            </span>
            <span className="text-xs font-medium text-ink sm:text-sm">Choose a product</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cream font-display text-xs font-bold text-ink">
              2
            </span>
            <span className="text-xs font-medium text-ink sm:text-sm">Negotiate</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cream font-display text-xs font-bold text-ink">
              3
            </span>
            <span className="text-xs font-medium text-ink sm:text-sm">
              See deal approved or blocked
            </span>
          </div>
        </div>
      </div>

      {/* Two Choice Cards */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {/* Card 1: Quick Demo (Recommended) */}
        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-amber/70 bg-card p-6 shadow-sm sm:p-8">
          <div className="absolute -top-3 right-6 rounded-full bg-amber px-3 py-0.5 text-xs font-bold text-amber-foreground shadow-xs">
            Recommended
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Demo
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Pre-configured policy
              </span>
            </div>

            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
              Try the example
            </h2>

            <div className="mt-4 rounded-xl border border-border/80 bg-cream/50 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber text-amber-foreground font-display font-bold text-sm">
                    GS
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink">Growth Sprint</h3>
                    <p className="text-xs text-muted-foreground">2-week consulting sprint</p>
                  </div>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-ink shadow-xs">
                  ₹6,000
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>List price</span>
                  <span className="font-semibold text-ink">₹6,000</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>Lowest price</span>
                  <span className="font-semibold text-emerald-700">₹5,200</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>Maximum discount</span>
                  <span className="font-semibold text-ink">₹800</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>Maximum rounds</span>
                  <span className="font-semibold text-ink">4</span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Link expiry</span>
                  <span className="font-semibold text-ink">20 min</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Start negotiating instantly with a prepared merchant policy. Test real safe buyer and
              unsafe injection attack scenarios.
            </p>
          </div>

          <button
            onClick={handleStartExample}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-3.5 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Start example <ArrowRight className="size-4" />
          </button>
        </div>

        {/* Card 2: Create your own deal */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Custom Setup
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Zap className="size-3.5" />
                Under 60 seconds
              </span>
            </div>

            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
              Create your own deal
            </h2>

            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-card border border-border text-muted-foreground">
                <Plus className="size-5" />
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">Set your own floor rules</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Consulting, digital goods, SaaS plans, or agency tickets
              </p>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Add your product, set the list and floor prices, and tell Counter what it is allowed
              to negotiate in plain English.
            </p>
          </div>

          <Link
            to="/demo/setup"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 text-sm font-bold text-ink transition-colors hover:bg-muted active:bg-border/60"
          >
            Create product <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
