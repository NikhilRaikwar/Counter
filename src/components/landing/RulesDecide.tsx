import { CircleCheck, CircleX, Check, X } from "lucide-react";

const APPROVED = ["Above floor price", "Within discount limit", "Link created"];
const BLOCKED = ["Below floor price", "Unauthorised action", "Risk score: risk not called"];

export function RulesDecide() {
  return (
    <section id="safety" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-center font-display text-3xl font-extrabold text-ink sm:text-[2rem]">
        The model suggests. Your rules decide.
      </h2>
      <p className="mt-3 text-center text-[0.95rem] text-muted-foreground">
        Counter can influence the deal, but never controls the money.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-ok/25 bg-ok-soft p-6">
          <div className="flex items-center gap-4">
            <CircleCheck className="size-9 text-ok" strokeWidth={2} />
            <span className="font-display text-lg font-bold text-ink">Approved</span>
          </div>
          <p className="mt-3 pl-13 font-display text-3xl font-extrabold text-ok">₹3,300</p>
          <ul className="mt-5 space-y-3 border-t border-ok/20 pt-5">
            {APPROVED.map((item) => (
              <li key={item} className="flex items-center gap-3 text-[0.95rem] text-ink">
                <Check className="size-4 shrink-0 text-ok" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-bad/25 bg-bad-soft p-6">
          <div className="flex items-center gap-4">
            <CircleX className="size-9 text-bad" strokeWidth={2} />
            <span className="font-display text-lg font-bold text-ink">Blocked</span>
          </div>
          <p className="mt-3 pl-13 font-display text-3xl font-extrabold text-bad">&#8377;1</p>
          <ul className="mt-5 space-y-3 border-t border-bad/20 pt-5">
            {BLOCKED.map((item) => (
              <li key={item} className="flex items-center gap-3 text-[0.95rem] text-ink">
                <X className="size-4 shrink-0 text-bad" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
