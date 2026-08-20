# Frontend integration map

| Previous production boundary | Real Phase 6 boundary | Frontend location |
|---|---|---|
| `mockCreateDraftOffer` | `POST /api/offers` | `OfferForm`, `counter-api.ts` |
| `parsePlainEnglishPolicy` | `POST /api/offers/{offer_id}/policy-draft` | `OfferForm` |
| `mockGetDraftOffer` | transient extraction result in `sessionStorage`; offer truth reloaded from API | `PolicyReviewCard` |
| `mockPublishOffer` | `POST /api/offers/{offer_id}/publish` | `PolicyReviewCard` |
| `mockGetOfferById` | `GET /api/offers/{offer_id}` with merchant capability | published page, deals list, inspector |
| `getStoredOffers` | locally remembered offer IDs/capabilities, then private API reads | `DealsList` |
| `mockGetOfferBySlug` | `GET /api/public/offers/{slug}` | `/d/:slug` |
| component-generated negotiation | start deal + `POST /api/public/deals/messages` | `/d/:slug` |
| `mockGetDealSession` / inspector scenarios | merchant-private deal list/detail reads | `MerchantDealInspector` |
| local checkout/paid transitions | disabled honest Phase 6 CTA | `BuyerDealAgreedCard` |

`mock-service`, `demo-store`, and scripted SAFE/UNSAFE fixtures remain only for the explicitly separate `/demo` preview. Production create, public buyer, deals, published, and inspector routes do not import them.
