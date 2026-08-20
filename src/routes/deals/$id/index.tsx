import { createFileRoute } from "@tanstack/react-router";
import { MerchantNavbar } from "@/components/merchant/MerchantNavbar";
import { MerchantDealInspector } from "@/components/inspector/MerchantDealInspector";

const title = "Deal Inspector — Counter Merchant Desk";
const description =
  "Inspect live buyer conversation, private floor validation checks, and deterministic deal engine output.";

export const Route = createFileRoute("/deals/$id/")({
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
  component: DealInspectorPage,
});

function DealInspectorPage() {
  const { id } = Route.useParams();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <MerchantNavbar />
      <main className="flex-1">
        <MerchantDealInspector dealId={id} />
      </main>
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        Counter Merchant Observability — Deterministic Policy Guardrails Active
      </footer>
    </div>
  );
}
