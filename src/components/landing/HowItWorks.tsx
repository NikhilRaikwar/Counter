import { BadgeCheck, MessagesSquare, Lock } from "lucide-react";

const STEPS = [
  {
    n: "1",
    title: "Set authority",
    icon: BadgeCheck,
    body: "You set floor, bounds, and discount limits.",
  },
  {
    n: "2",
    title: "Counter negotiates",
    icon: MessagesSquare,
    body: "The agent summarizes the conversation and makes the next move.",
  },
  {
    n: "3",
    title: "Pay only if safe",
    icon: Lock,
    body: "A payment link is generated only after the deal clears your rules.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-center font-display text-3xl font-extrabold text-ink sm:text-[2rem]">
        One buyer. One agent. One safe deal.
      </h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {STEPS.map(({ n, title, icon: Icon, body }) => (
          <div
            key={n}
            className="rounded-xl border border-border bg-card p-6 transition-transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-amber-soft font-display text-base font-bold text-amber-foreground">
                {n}
              </span>
              <h3 className="text-[1.05rem] font-bold text-ink">{title}</h3>
            </div>
            <div className="mt-6 flex items-start gap-4">
              <Icon className="mt-0.5 size-7 shrink-0 text-ink" strokeWidth={1.6} />
              <p className="text-[0.95rem] leading-7 text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
