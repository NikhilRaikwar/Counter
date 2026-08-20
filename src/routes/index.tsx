import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/landing/SiteHeader";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { RulesDecide } from "@/components/landing/RulesDecide";
import { InAction } from "@/components/landing/InAction";
import { BuiltFor } from "@/components/landing/BuiltFor";
import { FinalCta, SiteFooter } from "@/components/landing/FinalCta";

const title = "Counter — Your AI negotiates, your margins stay safe";
const description =
  "Set a floor price and approve bounds. Counter negotiates with buyers in real time and creates a verified payment link only when the deal is safe.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "keywords",
        content:
          "AI negotiation, price negotiation, margin protection, dynamic pricing, sales automation, discount guardrails, e-commerce checkout, SaaS deal closer",
      },
      { property: "og:site_name", content: "Counter" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/counter-banner.png" },
      { property: "og:image:alt", content: "Counter - AI Margin Protection & Deal Negotiation" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: "/counter-banner.png" },
      { name: "twitter:image:alt", content: "Counter - AI Margin Protection & Deal Negotiation" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <RulesDecide />
      <InAction />
      <BuiltFor />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}
