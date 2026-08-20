import type { OfferSummary, PolicyDraftResponse } from "./counter-api";

const MERCHANT_KEY = "counter.merchantCapabilities.v1";
const REVIEW_KEY = "counter.pendingPolicyReview.v1";
const DEAL_PREFIX = "counter.dealCapability.v1:";

type MerchantCapabilities = Record<string, string>;

function browserStorage(kind: "local" | "session") {
  if (typeof window === "undefined") return null;
  return kind === "local" ? window.localStorage : window.sessionStorage;
}

export function saveMerchantCapability(offerId: string, capability: string) {
  const storage = browserStorage("local");
  if (!storage) return;
  const current = getMerchantCapabilities();
  current[offerId] = capability;
  storage.setItem(MERCHANT_KEY, JSON.stringify(current));
}

export function getMerchantCapabilities(): MerchantCapabilities {
  const raw = browserStorage("local")?.getItem(MERCHANT_KEY);
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? (value as MerchantCapabilities) : {};
  } catch {
    return {};
  }
}

export function getMerchantCapability(offerId: string) {
  return getMerchantCapabilities()[offerId] ?? null;
}

export type PendingPolicyReview = {
  offer: OfferSummary;
  rulesText: string;
  extraction: PolicyDraftResponse;
};

export function savePendingPolicyReview(review: PendingPolicyReview) {
  browserStorage("session")?.setItem(REVIEW_KEY, JSON.stringify(review));
}

export function getPendingPolicyReview(): PendingPolicyReview | null {
  const raw = browserStorage("session")?.getItem(REVIEW_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPolicyReview;
  } catch {
    return null;
  }
}

export function clearPendingPolicyReview() {
  browserStorage("session")?.removeItem(REVIEW_KEY);
}

export function saveDealCapability(slug: string, capability: string) {
  browserStorage("session")?.setItem(`${DEAL_PREFIX}${slug}`, capability);
}

export function getDealCapability(slug: string) {
  return browserStorage("session")?.getItem(`${DEAL_PREFIX}${slug}`) ?? null;
}
