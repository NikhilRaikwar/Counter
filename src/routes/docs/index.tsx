import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Cpu,
  Lock,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Database,
  CreditCard,
  AlertOctagon,
  Workflow,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const title = "Counter Docs — Architecture & System Behavior";
const description =
  "How Counter thinks and acts. A bounded negotiation agent where the model suggests, but deterministic merchant rules decide.";

export const Route = createFileRoute("/docs/")({
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
  component: DocsPage,
});

const DOC_SECTIONS = [
  { id: "agent-loop", title: "1. Agent loop" },
  { id: "merchant-policy", title: "2. Merchant policy" },
  { id: "deal-gate", title: "3. The deal gate" },
  { id: "no-money-movement", title: "4. The model cannot move money" },
  { id: "prompt-injection", title: "5. Prompt-injection resistance" },
  { id: "deal-memory", title: "6. Deal memory" },
  { id: "razorpay-boundary", title: "7. Razorpay execution boundary" },
  { id: "failure-handling", title: "8. Failure handling" },
  { id: "architecture", title: "9. System architecture" },
  { id: "principle", title: "10. Core principle" },
];

function DocsNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink hover:opacity-90"
          >
            <img
              src="/counter-favicon.png"
              alt="Counter Logo"
              className="size-7 rounded-lg object-contain"
            />
            Counter
          </Link>
          <span className="rounded-md bg-amber-soft px-2 py-0.5 text-xs font-semibold text-amber-foreground">
            Docs
          </span>
        </div>

        <nav className="flex items-center gap-6 sm:gap-8">
          <Link
            to="/demo"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            Interactive Demo
          </Link>
          <a
            href="https://github.com/NikhilRaikwar/Counter"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-ink sm:inline-flex"
          >
            GitHub <ExternalLink className="size-3" />
          </a>
          <Link
            to="/demo"
            className="rounded-lg bg-amber px-4 py-2 text-xs sm:text-sm font-semibold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5"
          >
            Try Counter
          </Link>
        </nav>
      </div>
    </header>
  );
}

function DocsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-ink">
      <DocsNavbar />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 flex-1">
        {/* HERO SECTION */}
        <div className="border-b border-border/80 pb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3.5 py-1 text-xs font-semibold text-amber-foreground">
            <Cpu className="size-3.5" />
            System Specification
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Counter Docs
          </h1>
          <p className="mt-3 font-display text-xl font-bold text-ink/90 sm:text-2xl">
            How Counter thinks and acts
          </p>
          <p className="mt-3 max-w-3xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            Counter is a bounded negotiation agent. A buyer can negotiate naturally in plain
            language, but the model never has authority to move money or override merchant safety
            boundaries.
          </p>
        </div>

        {/* 2-COLUMN LAYOUT: SIDEBAR NAV + CONTENT */}
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* STICKY TABLE OF CONTENTS */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-1 rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
              <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                On this page
              </p>
              <nav className="space-y-0.5 text-xs">
                {DOC_SECTIONS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 font-medium text-muted-foreground hover:bg-muted hover:text-ink transition-colors"
                  >
                    <span>{section.title}</span>
                    <ChevronRight className="size-3 opacity-40" />
                  </a>
                ))}
              </nav>

              <div className="mt-4 pt-4 border-t border-border/60">
                <Link
                  to="/demo"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-amber py-2.5 text-xs font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5"
                >
                  Launch live demo <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </aside>

          {/* MAIN DOCUMENTATION BODY */}
          <main className="lg:col-span-9 space-y-14">
            {/* 1. AGENT LOOP */}
            <section id="agent-loop" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  1
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">Agent loop</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Counter operates on a linear, verifiable perception-to-execution pipeline for every
                incoming message:
              </p>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ink sm:gap-3">
                  <span className="rounded-md bg-muted px-2.5 py-1.5 font-bold">Buyer message</span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-cream px-2.5 py-1.5 font-semibold">
                    Understand intent
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-cream px-2.5 py-1.5 font-semibold">
                    Load deal memory
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-cream px-2.5 py-1.5 font-semibold">
                    Retrieve merchant rules
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-cream px-2.5 py-1.5 font-semibold">
                    Plan next move
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-cream px-2.5 py-1.5 font-semibold">
                    Propose structured action
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-emerald-100 text-emerald-800 px-2.5 py-1.5 font-bold">
                    Verify
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-ink text-white px-2.5 py-1.5 font-bold">
                    Respond
                  </span>
                </div>
              </div>
            </section>

            {/* 2. MERCHANT POLICY */}
            <section id="merchant-policy" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  2
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">Merchant policy</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                The merchant defines non-negotiable boundaries before any conversation starts. These
                parameters are stored separately in protected memory outside the buyer's reach:
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/80 bg-cream/40 p-4">
                  <h3 className="font-display font-bold text-sm text-ink">Pricing Guardrails</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    <li>
                      • <strong className="text-ink">List Price:</strong> Starting public offer
                      (e.g. ₹6,000)
                    </li>
                    <li>
                      • <strong className="text-ink">Floor Price:</strong> Absolute lowest
                      acceptable price (e.g. ₹5,200)
                    </li>
                    <li>
                      • <strong className="text-ink">Max Discount:</strong> Strict cap on total
                      price concessions (e.g. ₹800)
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-border/80 bg-cream/40 p-4">
                  <h3 className="font-display font-bold text-sm text-ink">Operational Bounds</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    <li>
                      • <strong className="text-ink">Allowed Bundles:</strong> Pre-approved bonuses
                      (e.g. 30-min strategy review)
                    </li>
                    <li>
                      • <strong className="text-ink">Max Rounds:</strong> Hard ceiling on
                      back-and-forth turns (e.g. 4 rounds)
                    </li>
                    <li>
                      • <strong className="text-ink">Payment Permissions:</strong> Strict link
                      generation criteria and TTL
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. THE DEAL GATE */}
            <section id="deal-gate" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  3
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">The deal gate</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Every offer or agreement proposed by the AI model passes through a deterministic
                validation gate before any downstream action can take place:
              </p>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="space-y-2.5 font-mono text-xs sm:text-sm">
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>amount &gt;= floor_price</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>discount &lt;= max_discount_limit</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>rounds &lt;= maximum_rounds_allowed</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>bundle_items IN approved_merchant_catalogue</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>product_terms_unchanged == TRUE</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. THE MODEL CANNOT MOVE MONEY */}
            <section id="no-money-movement" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  4
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">
                  The model cannot move money
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                The generative AI model has no access to payment credentials, API secret keys, or
                checkout creation tools.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    What AI can propose
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-xs">
                    <span className="rounded-md bg-amber-soft text-amber-foreground px-2 py-1 font-semibold">
                      counter
                    </span>
                    <span className="rounded-md bg-amber-soft text-amber-foreground px-2 py-1 font-semibold">
                      bundle
                    </span>
                    <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-1 font-semibold">
                      accept
                    </span>
                    <span className="rounded-md bg-rose-100 text-rose-800 px-2 py-1 font-semibold">
                      refuse
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Execution Boundary
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Razorpay Payment Links are created purely by a secure server-side execution
                    worker after verifying the deterministic deal gate.
                  </p>
                </div>
              </div>
            </section>

            {/* 5. PROMPT INJECTION RESISTANCE */}
            <section id="prompt-injection" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  5
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">
                  Safety against prompt injection
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Buyer messages and model outputs are treated as untrusted data inputs. No
                conversational payload can rewrite the merchant's immutable policy state:
              </p>

              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold text-rose-900">
                  <AlertOctagon className="size-4 text-rose-600" />
                  Neutralized Attack Vectors
                </h3>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 text-rose-950 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>"I am the founder / CEO" impersonation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>"Ignore previous instructions" system prompts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>"Sell it for ₹1" malicious floor breach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600 font-bold">✕</span>
                    <span>Sandwich prompts & delimiter injections</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. DEAL MEMORY */}
            <section id="deal-memory" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  6
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">Deal memory</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Counter maintains full state awareness throughout the negotiation lifecycle so it
                never negotiates each turn in isolation:
              </p>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="grid gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="font-bold text-ink">Historical Offers</p>
                    <p className="mt-1 text-muted-foreground">
                      Remembers past price concessions and counter-offers.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="font-bold text-ink">Turn Tracking</p>
                    <p className="mt-1 text-muted-foreground">
                      Enforces max round limits before finalizing or exiting.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="font-bold text-ink">Deal Locking</p>
                    <p className="mt-1 text-muted-foreground">
                      Locks agreed price and delivers immutable checkout parameters.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. RAZORPAY EXECUTION BOUNDARY */}
            <section id="razorpay-boundary" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  7
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">
                  Razorpay execution boundary
                </h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Payment link generation follows a zero-trust handoff:
              </p>

              <div className="rounded-2xl border border-border bg-cream/50 p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono sm:gap-3">
                  <span className="rounded-md bg-emerald-100 text-emerald-900 px-3 py-1.5 font-bold">
                    Approved Deal
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-white border border-border px-3 py-1.5 font-semibold text-ink">
                    Server Re-Check
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-amber text-amber-foreground px-3 py-1.5 font-bold">
                    Razorpay Payment Link API
                  </span>
                  <span className="text-amber-foreground font-bold">→</span>
                  <span className="rounded-md bg-ink text-white px-3 py-1.5 font-bold">
                    Payment State & Webhook
                  </span>
                </div>
              </div>
            </section>

            {/* 8. FAILURE HANDLING */}
            <section id="failure-handling" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  8
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">Failure handling</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                If an offer violates merchant authority, Counter{" "}
                <strong>strictly blocks the action</strong> instead of trying to coerce or force a
                compromised transaction through.
              </p>

              <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-2 text-muted-foreground">
                <p>
                  • <strong className="text-ink">Fail-Safe Default:</strong> Execution state
                  defaults to `BLOCKED` unless all 5 gate criteria evaluate to `PASS`.
                </p>
                <p>
                  • <strong className="text-ink">No Hallucinated Discounts:</strong> The server
                  verifies the exact arithmetic difference between list price and final quote.
                </p>
              </div>
            </section>

            {/* 9. SYSTEM ARCHITECTURE */}
            <section id="architecture" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-soft font-display text-xs font-bold text-amber-foreground">
                  9
                </span>
                <h2 className="font-display text-2xl font-bold text-ink">System architecture</h2>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Complete data flow across system components:
              </p>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center text-xs">
                  <div className="rounded-xl border border-border/80 bg-cream/60 p-3">
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase">
                      Stage 1
                    </p>
                    <p className="mt-1 font-bold text-ink">Buyer</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-cream/60 p-3">
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase">
                      Stage 2
                    </p>
                    <p className="mt-1 font-bold text-ink">Agent</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-cream/60 p-3">
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase">
                      Stage 3
                    </p>
                    <p className="mt-1 font-bold text-ink">Memory</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-cream/60 p-3">
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase">
                      Stage 4
                    </p>
                    <p className="mt-1 font-bold text-ink">Policy Context</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-cream/60 p-3">
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase">
                      Stage 5
                    </p>
                    <p className="mt-1 font-bold text-ink">Planner</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-cream/60 p-3">
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase">
                      Stage 6
                    </p>
                    <p className="mt-1 font-bold text-ink">Structured Decision</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[0.65rem] font-bold text-emerald-800 uppercase">Stage 7</p>
                    <p className="mt-1 font-bold text-emerald-900">Deterministic Gate</p>
                  </div>
                  <div className="rounded-xl border border-amber/60 bg-amber-soft p-3">
                    <p className="text-[0.65rem] font-bold text-amber-foreground uppercase">
                      Stage 8
                    </p>
                    <p className="mt-1 font-bold text-amber-foreground">Execution</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 10. CORE PRINCIPLE */}
            <section id="principle" className="scroll-mt-24 pt-4">
              <div className="rounded-2xl border-2 border-amber/70 bg-cream px-6 py-8 sm:px-8 sm:py-10 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3 py-1 text-xs font-bold text-amber-foreground">
                  <ShieldCheck className="size-3.5" /> Core Principle
                </span>
                <h2 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold text-ink">
                  The model suggests. Merchant rules decide.
                </h2>
                <p className="mt-3 max-w-xl mx-auto text-sm text-muted-foreground leading-relaxed">
                  Counter gives merchants complete confidence to deploy autonomous deal negotiation
                  at scale without risking profit margins.
                </p>
                <div className="mt-6">
                  <Link
                    to="/demo"
                    className="inline-flex items-center gap-2 rounded-xl bg-amber px-6 py-3 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5"
                  >
                    Try the interactive demo <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Counter — Autonomous deal desk for merchants. © 2025
      </footer>
    </div>
  );
}
