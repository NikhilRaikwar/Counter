import { createFileRoute } from "@tanstack/react-router";
import { DemoNavbar } from "@/components/demo/DemoNavbar";
import { ProductSetupForm } from "@/components/demo/ProductSetupForm";

const title = "Setup Your Deal — Counter Demo";
const description =
  "Add your product and describe negotiation rules in plain English in under 60 seconds.";

export const Route = createFileRoute("/demo/setup")({
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
  component: DemoSetupPage,
});

function DemoSetupPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DemoNavbar />
      <main className="flex-1 py-4">
        <ProductSetupForm />
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Counter — The model suggests. Your rules decide.
      </footer>
    </div>
  );
}
