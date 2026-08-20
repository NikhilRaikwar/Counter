export type Offer = {
  id: string;
  slug: string;
  merchantName: string;
  productName: string;
  description: string;
  image?: string;
  listPrice: number;
  status: "draft" | "live" | "paused";
  createdAt: string;
  conversationsCount: number;
  dealsAgreedCount: number;
  paidCount: number;
  policy: MerchantPolicy;
};

export type MerchantPolicy = {
  floorPrice: number;
  maxDiscount: number;
  maxRounds: number;
  expiryMinutes: number;
  rawRules?: string;
  allowedBundles: string[];
  allowedActions: string[];
  blockedActions: string[];
};

export type DealStatus =
  "idle" | "negotiating" | "agreed" | "blocked" | "payment_ready" | "paid" | "expired";

export type DecisionState =
  "idle" | "negotiating" | "approved" | "blocked" | "payment_ready" | "paid";

export type Message = {
  id: string;
  sender: "buyer" | "counter" | "system";
  text: string;
  timestamp: string;
  offerPrice?: number;
  isAttack?: boolean;
};

export type ActivityEvent = {
  id: string;
  label: string;
  status: "done" | "active" | "failed" | "neutral";
  timestamp: string;
};

export type DealSession = {
  id: string;
  offerId: string;
  slug: string;
  buyerName?: string;
  messages: Message[];
  status: DealStatus;
  decisionState: DecisionState;
  currentRound: number;
  negotiatedPrice?: number;
  attemptedPrice?: number;
  activity: ActivityEvent[];
  isAttackDetected?: boolean;
  createdAt: string;
};

// Aliases for compatibility
export type ProductPolicy = {
  id: string;
  name: string;
  description: string;
  listPrice: number;
  lowestPrice: number;
  maxDiscount: number;
  maxRounds: number;
  linkExpiry: string;
  imageUrl?: string;
  allowedActions: string[];
  blockedActions: string[];
  rawRules?: string;
};

export type ChatMessage = Message;
export type ActivityItem = ActivityEvent;
