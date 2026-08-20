import { ArrowRight, ShieldCheck } from "lucide-react";

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-10 pb-20 text-center sm:pt-16">
      <span
        className="rise inline-flex items-center gap-2 rounded-full bg-amber-soft px-4 py-1.5 text-sm font-medium text-amber-foreground"
        style={{ animationDelay: "40ms" }}
      >
        <ShieldCheck className="size-4" strokeWidth={2.2} />
        Autonomous deal check for merchants.
      </span>

      <h1
        className="rise mt-8 font-display text-[2.75rem] leading-[1.06] font-extrabold text-ink sm:text-6xl"
        style={{ animationDelay: "120ms" }}
      >
        Your AI can negotiate.
        <br />
        It can&rsquo;t break{" "}
        <span className="relative whitespace-nowrap">
          your margins.
          <svg
            aria-hidden="true"
            viewBox="0 0 300 14"
            preserveAspectRatio="none"
            className="absolute -bottom-2 left-0 h-3 w-full text-amber"
          >
            <path
              d="M3 10C60 4 130 2 208 4c34 1 62 3 89 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </h1>

      <p
        className="rise mx-auto mt-8 max-w-lg text-[1.0625rem] leading-8 text-muted-foreground"
        style={{ animationDelay: "200ms" }}
      >
        Set a floor price. Approve bounds.
        <br />
        Counter negotiates with buyers and creates a payment link only when the deal is safe.
      </p>

      <div
        className="rise mt-9 flex flex-wrap items-center justify-center gap-3"
        style={{ animationDelay: "280ms" }}
      >
        <a
          href="/demo"
          className="inline-flex items-center gap-2 rounded-xl bg-amber px-6 py-3.5 text-[0.95rem] font-semibold text-amber-foreground transition-transform hover:-translate-y-0.5"
        >
          Negotiate the deal <ArrowRight className="size-4" />
        </a>
        <a
          href="/demo"
          className="inline-flex items-center rounded-xl border border-border bg-card px-6 py-3.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-muted"
        >
          Try as a buyer
        </a>
      </div>

      <p
        className="rise mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground"
        style={{ animationDelay: "360ms" }}
      >
        <ShieldCheck className="size-4 text-ink" strokeWidth={2.2} />
        Built for agencies, coaches, consultants, events, and high-ticket sellers.
      </p>
    </section>
  );
}
