import { createFileRoute } from "@tanstack/react-router";
import { MerchantNavbar } from "@/components/merchant/MerchantNavbar";
import { DealsList } from "@/components/merchant/DealsList";

const title = "Your Deals & Links — Counter";
const description =
  "Manage active negotiable links, view live conversation statistics, and inspect deal policies.";

export const Route = createFileRoute("/deals/")({
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
  component: DealsPage,
});

function DealsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <MerchantNavbar />
      <main className="flex-1">
        <DealsList />
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Counter — Autonomous deal desk for merchants.
      </footer>
    </div>
  );
}
