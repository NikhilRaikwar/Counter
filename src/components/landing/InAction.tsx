import { Search, ListChecks, ShieldCheck, Link2, TrendingUp } from "lucide-react";

const FLOW = [
  { icon: Search, label: "LIVE DEMAND", body: "Buyer sends a message" },
  { icon: ListChecks, label: "PLAN", body: "Counter plans the response" },
  { icon: ShieldCheck, label: "VERIFY", body: "Policy guardrails run checks" },
  { icon: Link2, label: "CREATE LINK", body: "Payment link generated if safe & allowed" },
  { icon: TrendingUp, label: "CLOSE DEAL", body: "Buyer pays. Deal is closed." },
];

function Arrow() {
  return (
    <div className="hidden shrink-0 items-center justify-center px-1 md:flex">
      <svg
        aria-hidden="true"
        viewBox="0 0 60 12"
        className="h-3.5 w-14 overflow-visible text-amber"
      >
        <defs>
          <style>{`
            @keyframes flowDash {
              to {
                stroke-dashoffset: -26;
              }
            }
            @keyframes arrowNudge {
              0%, 100% {
                transform: translateX(0);
              }
              50% {
                transform: translateX(2px);
              }
            }
            .flow-line {
              animation: flowDash 1.1s linear infinite;
            }
            .flow-head {
              animation: arrowNudge 1.1s ease-in-out infinite;
            }
          `}</style>
        </defs>
        <path
          className="flow-line"
          d="M2 6h44"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="6 7"
        />
        <path className="flow-head" d="M46 2l8 4-8 4z" fill="currentColor" />
      </svg>
    </div>
  );
}

function MobileArrow() {
  return (
    <div className="flex items-center justify-center py-1 md:hidden">
      <svg aria-hidden="true" viewBox="0 0 12 36" className="h-7 w-3 overflow-visible text-amber">
        <path
          className="flow-line"
          d="M6 2v24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="5 6"
        />
        <path className="flow-head" d="M2 26l4 7 4-7z" fill="currentColor" />
      </svg>
    </div>
  );
}

export function InAction() {
  return (
    <section id="proof" className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-center font-display text-3xl font-extrabold text-ink sm:text-[2rem]">
        See it in action
      </h2>
      <p className="mt-3 text-center text-[0.95rem] text-muted-foreground">
        From buyer message to closed-won.
      </p>

      <div className="mt-12 flex flex-col items-center gap-2 md:flex-row md:items-start md:justify-center md:gap-0">
        {FLOW.map(({ icon: Icon, label, body }, i) => (
          <div key={label} className="contents">
            {i > 0 && (
              <>
                <div className="hidden md:flex items-center pt-9">
                  <Arrow />
                </div>
                <MobileArrow />
              </>
            )}
            <div className="max-w-[10rem] text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-soft transition-transform duration-300 hover:scale-105">
                <Icon className="size-6 text-ink" strokeWidth={1.8} />
              </span>
              <p className="mt-4 text-[0.7rem] font-bold tracking-[0.12em] text-ink">{label}</p>
              <p className="mt-2 text-[0.8rem] leading-5 text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
