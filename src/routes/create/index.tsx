import { createFileRoute } from "@tanstack/react-router";
import { MerchantNavbar } from "@/components/merchant/MerchantNavbar";
import { OfferForm } from "@/components/merchant/OfferForm";

const title = "Create a Negotiable Link — Counter";
const description =
  "Turn any offer into a negotiable link. Set your price, limits, and plain English rules in under 60 seconds.";

export const Route = createFileRoute("/create/")({
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
  component: CreatePage,
});

function CreatePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <MerchantNavbar />
      <main className="flex-1">
        <OfferForm />
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Counter — Autonomous deal desk for merchants.
      </footer>
    </div>
  );
}
