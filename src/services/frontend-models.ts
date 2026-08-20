import type { Offer } from "@/types/product";
import type { OfferSummary, StructuredPolicy } from "./counter-api";

export function toFrontendOffer(
  offer: OfferSummary,
  policy: (StructuredPolicy & { list_price_paise?: number }) | null,
  stats = { conversations: 0, agreed: 0 },
): Offer {
  return {
    id: offer.id,
    slug: offer.public_slug ?? "",
    merchantName: offer.merchant_display_name,
    productName: offer.product_name,
    description: offer.description,
    image: offer.image_url ?? undefined,
    listPrice: offer.list_price_paise / 100,
    status: offer.status === "archived" ? "paused" : offer.status,
    createdAt: offer.created_at,
    conversationsCount: stats.conversations,
    dealsAgreedCount: stats.agreed,
    paidCount: 0,
    policy: {
      floorPrice: (policy?.floor_price_paise ?? offer.list_price_paise) / 100,
      maxDiscount: (policy?.max_discount_paise ?? 0) / 100,
      maxRounds: policy?.max_rounds ?? 0,
      expiryMinutes: policy?.expiry_minutes ?? 0,
      rawRules: policy?.original_rules_text,
      allowedBundles: policy?.allowed_bundles.map((item) => item.name) ?? [],
      allowedActions: policy?.allowed_actions ?? [],
      blockedActions: policy?.forbidden_actions ?? [],
    },
  };
}
