# Current UI Architecture

## Stack

- React 19 with TypeScript strict mode.
- TanStack Start and file-based TanStack Router.
- Vite 8 and Nitro server build; Tailwind CSS 4 via the Vite plugin.
- Radix UI/shadcn-style primitives under `src/components/ui`, Lucide icons, Sonner.
- TanStack Query is initialized globally, but product state is currently browser-local rather than query-backed.

## Routes

| Route | File | Purpose |
|---|---|---|
| `/` | `src/routes/index.tsx` | Landing page |
| `/create` | `src/routes/create/index.tsx` | Merchant offer form |
| `/create/review` | `src/routes/create/review.tsx` | Parsed-policy review and publish |
| `/deals` | `src/routes/deals/index.tsx` | Merchant deal list |
| `/deals/:id` | `src/routes/deals/$id/index.tsx` | Merchant deal inspector |
| `/deals/:id/published` | `src/routes/deals/$id/published.tsx` | Publish success/share link |
| `/d/:slug` | `src/routes/d/$slug.tsx` | Public buyer offer and negotiation |
| `/demo`, `/demo/setup`, `/demo/deal` | `src/routes/demo/*` | Scripted safe/unsafe demo |
| `/docs` | `src/routes/docs/index.tsx` | Product safety/architecture explainer |

There is no separate `/safety` route; safety content lives in `/docs`.

## State, types, and mocks

Domain types are in `src/types/product.ts`: `Offer`, `MerchantPolicy`, `DealSession`, `Message`, `ActivityEvent`, `DealStatus`, and `DecisionState`. `src/types/demo.ts` re-exports them.

`src/lib/mock-service.ts` stores offers and drafts in `localStorage`. Actual mock surface:

- `getStoredOffers`, `saveStoredOffers`
- `mockGetOfferBySlug`, `mockGetOfferById`
- `mockCreateDraftOffer`, `mockGetDraftOffer`, `mockPublishOffer`
- `parsePlainEnglishPolicy`
- `mockGetDealSession`

`src/lib/demo-store.ts` contains the scripted negotiation state machine through `useDemoSession`; `src/lib/demo-data.ts` supplies `SAFE_FLOW_STEPS`, `UNSAFE_FLOW_STEPS`, and `parseCustomPolicy`.

## Simulation boundaries

- Offer creation/publish: `OfferForm` writes a draft to `localStorage`; `PolicyReviewCard` parses rules with regex/defaults and calls `mockPublishOffer`.
- Public negotiation: `src/routes/d/$slug.tsx` generates responses and price decisions in component logic.
- Demo negotiation/policy: `useDemoSession` advances fixed timers and scripted safe/attack paths, including deterministic-looking activity events.
- Merchant inspector: `MerchantDealInspector` loads preset safe/attack sessions and locally simulates decisions.
- Checkout: `DecisionPanel` and `CheckoutModal` transition local state to `payment_ready`/`paid`; no Razorpay call occurs.

## Reusable components

Merchant components cover offer form, policy review, publish result, navigation, and deal list. Buyer components cover public header, offer card, chat, and agreed-deal card. Inspector and demo components are independently composed. Generic accessible primitives live in `src/components/ui`.

## Backend replacement map

| Current frontend behavior | Later backend responsibility |
|---|---|
| Draft/publish in local storage | Offers API, policy extraction/review, immutable policy version |
| Offer lookup by ID/slug | Durable offer/public-link API |
| Component/scripted buyer response | Negotiation endpoint backed by LangGraph |
| Scripted policy result | Deterministic server policy gate |
| In-memory activity trail | Deal messages/events persistence |
| Checkout modal/state mutation | Idempotent Razorpay Payment Link execution and returned `short_url` |
| Local `paid` transition | Verified webhook-driven payment state |

The finished UI should be preserved; replacement should occur behind typed client services and route data/mutations.
