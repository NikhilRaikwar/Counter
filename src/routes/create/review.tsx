import { createFileRoute } from "@tanstack/react-router";
import { MerchantNavbar } from "@/components/merchant/MerchantNavbar";
import { PolicyReviewCard } from "@/components/merchant/PolicyReviewCard";

const title = "Review Negotiation Boundaries — Counter";
const description =
  "Confirm Counter's authority and private merchant limits before publishing your negotiable link.";

export const Route = createFileRoute("/create/review")({
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
  component: CreateReviewPage,
});

function CreateReviewPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <MerchantNavbar />
      <main className="flex-1">
        <PolicyReviewCard />
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Counter — The model suggests. Your rules decide.
      </footer>
    </div>
  );
}
