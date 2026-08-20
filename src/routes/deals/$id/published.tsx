import { createFileRoute } from "@tanstack/react-router";
import { MerchantNavbar } from "@/components/merchant/MerchantNavbar";
import { PublishSuccessCard } from "@/components/merchant/PublishSuccessCard";
import { useEffect, useState } from "react";
import { counterApi } from "@/services/counter-api";
import { getMerchantCapability } from "@/services/capability-store";
import { toFrontendOffer } from "@/services/frontend-models";
import type { Offer } from "@/types/product";

const title = "Negotiable Link Live — Counter";
const description =
  "Your link is live. Share it with buyers to let Counter negotiate within your boundaries.";

export const Route = createFileRoute("/deals/$id/published")({
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
  component: PublishedSuccessPage,
});

function PublishedSuccessPage() {
  const { id } = Route.useParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const capability = getMerchantCapability(id);
    if (!capability) {
      setError("This browser no longer has the management key for this Counter link.");
      return;
    }
    counterApi
      .getMerchantOffer(id, capability)
      .then((result) => setOffer(toFrontendOffer(result.offer, result.current_policy)))
      .catch(() => setError("The published offer could not be loaded."));
  }, [id]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <MerchantNavbar />
      <main className="flex-1 flex items-center justify-center py-6">
        {offer ? (
          <PublishSuccessCard offer={offer} />
        ) : (
          <p className="text-sm text-muted-foreground">{error ?? "Loading published link…"}</p>
        )}
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Counter — Autonomous deal desk for merchants.
      </footer>
    </div>
  );
}
