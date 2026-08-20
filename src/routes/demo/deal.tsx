import { createFileRoute } from "@tanstack/react-router";
import { DemoNavbar } from "@/components/demo/DemoNavbar";
import { MerchantRulesCard } from "@/components/demo/MerchantRulesCard";
import { NegotiationChat } from "@/components/demo/NegotiationChat";
import { DecisionPanel } from "@/components/demo/DecisionPanel";
import { CheckoutModal } from "@/components/demo/CheckoutModal";
import { useDemoSession } from "@/lib/demo-store";

const title = "Live Deal Negotiation — Counter Demo";
const description =
  "Autonomous deal desk in action. The model suggests offers, but your rules strictly decide.";

export const Route = createFileRoute("/demo/deal")({
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
  component: DemoDealPage,
});

function DemoDealPage() {
  const {
    policy,
    decisionState,
    messages,
    activity,
    negotiatedPrice,
    attemptedPrice,
    currentRound,
    isSimulating,
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
    reset,
    runSafeBuyer,
    runUnsafeBuyer,
    sendCustomBuyerMessage,
    proceedToPaymentReady,
  } = useDemoSession();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DemoNavbar />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1400px] mx-auto w-full">
        {/* Subheader Banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-cream/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xs sm:text-sm text-ink">
              Product: <span className="text-amber-foreground underline">{policy.name}</span>
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (List: ₹{policy.listPrice.toLocaleString("en-IN")} • Floor: ₹
              {policy.lowestPrice.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            The model suggests. <span className="text-ink">Your rules decide.</span>
          </p>
        </div>

        {/* THREE-COLUMN RESPONSIVE LAYOUT */}
        {/* Desktop: 26% / 47% / 27% */}
        {/* Tablet: 2 columns on top, decision below */}
        {/* Mobile: stacked */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* LEFT COLUMN: MERCHANT RULES (lg:col-span-3 ~ 25-26%) */}
          <div className="lg:col-span-3 order-1">
            <MerchantRulesCard policy={policy} currentRound={currentRound} />
          </div>

          {/* CENTER COLUMN: LIVE NEGOTIATION (lg:col-span-6 ~ 47-50%) */}
          <div className="lg:col-span-6 order-2">
            <NegotiationChat
              messages={messages}
              isSimulating={isSimulating}
              onSendCustomMessage={sendCustomBuyerMessage}
              onRunSafeBuyer={runSafeBuyer}
              onRunUnsafeBuyer={runUnsafeBuyer}
              onReset={reset}
            />
          </div>

          {/* RIGHT COLUMN: DECISION & AUDIT (lg:col-span-3 ~ 25-26%) */}
          <div className="lg:col-span-3 order-3">
            <DecisionPanel
              decisionState={decisionState}
              policy={policy}
              negotiatedPrice={negotiatedPrice}
              attemptedPrice={attemptedPrice}
              activity={activity}
              onCreatePaymentLink={proceedToPaymentReady}
              onOpenCheckoutModal={() => setIsCheckoutModalOpen(true)}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        Counter Demo Environment — Frontend UI Preview
      </footer>

      {/* Simulated Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        policy={policy}
        negotiatedPrice={negotiatedPrice}
      />
    </div>
  );
}
