import { ArrowRight, ShieldCheck } from "lucide-react";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div
        id="cta"
        className="relative overflow-hidden rounded-2xl bg-cream px-6 py-14 text-center"
      >
        <div className="dotted-grid pointer-events-none absolute top-8 left-8 size-24 opacity-50" />
        <h2 className="relative font-display text-3xl font-extrabold text-ink sm:text-[2rem]">
          Let your AI negotiate the deal.
        </h2>
        <p className="relative mt-3 text-[0.95rem] text-muted-foreground">
          Start with one product, one buyer, and one safe payment link.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/demo"
            className="rounded-xl bg-amber px-6 py-3 text-[0.95rem] font-semibold text-amber-foreground transition-transform hover:-translate-y-0.5"
          >
            Start a demo
          </a>
          <a
            href="#docs"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-muted"
          >
            Read the docs <ArrowRight className="size-4" />
          </a>
        </div>
        <p className="relative mt-8 inline-flex items-center gap-2 text-[0.85rem] text-muted-foreground">
          <ShieldCheck className="size-4 text-ink" strokeWidth={2.2} />
          No risky actions. No unauthorized discounts. You stay in control.
        </p>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-[0.82rem] text-muted-foreground sm:flex-row">
        <p>Counter — Autonomous deal check for merchants. © 2025</p>
        <div className="flex gap-8">
          <a href="#docs" className="transition-colors hover:text-ink">
            Docs
          </a>
          <a href="#cta" className="transition-colors hover:text-ink">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
