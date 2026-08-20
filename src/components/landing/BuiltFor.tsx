import { Briefcase, User, CalendarPlus, Gem } from "lucide-react";

const AUDIENCE = [
  {
    icon: Briefcase,
    title: "Agencies & Consultants",
    body: "Acquire projects and scope changes, keep margins firm.",
  },
  {
    icon: User,
    title: "Coaches & Creators",
    body: "Close high-value offers with buyers who negotiate everywhere.",
  },
  {
    icon: CalendarPlus,
    title: "Events & Workshops",
    body: "Handle group quotes and increases seamlessly.",
  },
  {
    icon: Gem,
    title: "High-Ticket Sellers",
    body: "Protect premium guarantee terms on every deal.",
  },
];

export function BuiltFor() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-center font-display text-3xl font-extrabold text-ink sm:text-[2rem]">
        Who Counter is built for
      </h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {AUDIENCE.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-card p-6 transition-transform hover:-translate-y-1"
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 size-7 shrink-0 text-ink" strokeWidth={1.6} />
              <h3 className="text-[1.02rem] leading-6 font-bold text-ink">{title}</h3>
            </div>
            <p className="mt-5 text-[0.85rem] leading-6 text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
