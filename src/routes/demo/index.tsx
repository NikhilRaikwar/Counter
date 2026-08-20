import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Plus,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { DemoNavbar } from "@/components/demo/DemoNavbar";
import { DEFAULT_OFFERS } from "@/lib/mock-service";
import { counterApi } from "@/services/counter-api";
import { saveDealCapability } from "@/services/capability-store";

const title = "Interactive Product Demo — Counter";
const description =
  "See a negotiable link close a deal. Start as the buyer, then inspect what Counter enforced behind the scenes.";

export const Route = createFileRoute("/demo/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: "/counter-banner.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const exampleOffer = DEFAULT_OFFERS[1] || DEFAULT_OFFERS[0]; // Growth Sprint
  const router = useRouter();
  const [openingDemo, setOpeningDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const openBuyerDemo = async () => {
    setOpeningDemo(true);
    setDemoError(null);
    try {
      // Resolve the canonical live offer, then create a normal, isolated buyer deal.
      const offer = await counterApi.getPublicOffer("growth-sprint-demo");
      const started = await counterApi.startDeal(offer.slug);
      saveDealCapability(offer.slug, started.deal_capability);
      await router.navigate({ to: "/d/$slug", params: { slug: offer.slug } });
    } catch {
      setDemoError("The live demo is temporarily unavailable. Please try again.");
    } finally {
      setOpeningDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DemoNavbar />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3.5 py-1 text-xs font-semibold text-amber-foreground">
            <Sparkles className="size-3.5" />
            Recruiter & Product Demo
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            See a negotiable link close a deal.
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg leading-relaxed">
            Start as the buyer, then inspect what Counter enforced behind the scenes.
          </p>
        </div>

        {/* Two Choice Cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* OPTION A: TRY GROWTH SPRINT (RECOMMENDED) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-amber/70 bg-card p-6 shadow-sm sm:p-8">
            <div className="absolute -top-3 right-6 rounded-full bg-amber px-3 py-0.5 text-xs font-bold text-amber-foreground shadow-xs">
              Recommended
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Option A · Buyer Experience
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
                Try Growth Sprint
              </h2>

              {/* Compact summary */}
              <div className="mt-4 rounded-2xl border border-border/80 bg-cream/40 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div>
                    <h3 className="font-display font-bold text-sm text-ink">
                      {exampleOffer.productName}
                    </h3>
                    <p className="text-xs text-muted-foreground">Velocity Labs</p>
                  </div>
                  <span className="font-display font-bold text-base text-ink">
                    ₹{exampleOffer.listPrice.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Public Price</span>
                    <span className="font-semibold text-ink">
                      ₹{exampleOffer.listPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Private Floor (Hidden from buyer)</span>
                    <span className="font-semibold text-emerald-700">
                      ₹{exampleOffer.policy.floorPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Max Discount</span>
                    <span className="font-semibold text-ink">
                      ₹{exampleOffer.policy.maxDiscount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-muted-foreground">
                Experience the exact live page a buyer sees, negotiate an agreed discount, and
                inspect the merchant safety gate.
              </p>
            </div>

            <button
              type="button"
              onClick={openBuyerDemo}
              disabled={openingDemo}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-amber py-3.5 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>{openingDemo ? "Opening buyer demo…" : "Open buyer demo"}</span>
              <ArrowRight className="size-4" />
            </button>
            {demoError && <p className="mt-3 text-xs font-medium text-rose-700">{demoError}</p>}
          </div>

          {/* OPTION B: CREATE YOUR OWN DEAL */}
          <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Option B · Merchant Creation
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
                Create your own deal
              </h2>

              <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-card border border-border text-muted-foreground">
                  <Plus className="size-5" />
                </div>
                <p className="mt-2 text-sm font-bold text-ink">Set your own product & limits</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Consulting, digital goods, SaaS plans, or agency packages
                </p>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-muted-foreground">
                Type your offer and describe negotiation bounds in plain English. Counter parses
                them into immutable code guardrails.
              </p>
            </div>

            <Link
              to="/create"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 text-sm font-bold text-ink hover:bg-muted transition-colors"
            >
              <span>Create product</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* QUICK FLOW SHORTCUTS FOR RECRUITERS */}
        <div className="mt-10 rounded-2xl border border-border/80 bg-cream/30 p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="size-4 text-ink" />
            <h3 className="font-display text-sm font-bold text-ink">
              Direct Verification Shortcuts
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <Link
              to="/deals/$id"
              params={{ id: "offer-seo-audit-pro" }}
              className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-emerald-950 hover:bg-emerald-100 transition-colors"
            >
              <div>
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Inspect Safe Deal Approval
                </p>
                <p className="text-[0.7rem] text-emerald-800 mt-0.5">
                  View how ₹18,000 passes ₹17,500 floor check
                </p>
              </div>
              <ArrowRight className="size-4 text-emerald-700 shrink-0" />
            </Link>

            <Link
              to="/deals/$id"
              params={{ id: "demo-attack" }}
              className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-rose-950 hover:bg-rose-100 transition-colors"
            >
              <div>
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-rose-600" />
                  Inspect Prompt Injection Defense
                </p>
                <p className="text-[0.7rem] text-rose-800 mt-0.5">
                  View how role-override & ₹1 attack is blocked
                </p>
              </div>
              <ArrowRight className="size-4 text-rose-700 shrink-0" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Counter — The model suggests. Your rules decide.
      </footer>
    </div>
  );
}
