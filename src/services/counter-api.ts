export type OfferStatus = "draft" | "live" | "paused" | "archived";

export type OfferSummary = {
  id: string;
  merchant_display_name: string;
  product_name: string;
  description: string;
  image_url: string | null;
  list_price_paise: number;
  currency: string;
  status: OfferStatus;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type OfferCreate = {
  merchant_display_name: string;
  product_name: string;
  description: string;
  image_url?: string | null;
  list_price_paise: number;
  currency: "INR";
};

export type OfferUpdate = Partial<OfferCreate>;

export type AllowedBundle = {
  id: string;
  name: string;
  additional_cost_paise: number;
};

export type StructuredPolicy = {
  currency: "INR";
  floor_price_paise: number;
  max_discount_paise: number;
  max_rounds: number;
  expiry_minutes: number;
  allowed_bundles: AllowedBundle[];
  allowed_actions: string[];
  forbidden_actions: string[];
  original_rules_text?: string;
};

export type PolicyDraftResponse = {
  status: "review_required" | "conflict";
  offer: { product_name: string; list_price_paise: number; currency: "INR" };
  draft: {
    floor_price_paise: number | null;
    max_discount_paise: number | null;
    max_rounds: number | null;
    expiry_minutes: number | null;
    allowed_bundles: Array<{
      name: string;
      additional_cost_paise: number;
      description?: string | null;
    }>;
    allowed_actions: string[];
    forbidden_actions: string[];
    missing_fields: string[];
    warnings: string[];
  };
  conflicts: Array<{ code: string; message: string }>;
  warnings: string[];
  missing_fields: string[];
};

export type BuyerTurnResponse = {
  deal_status: "negotiating" | "agreed" | "refused_candidate";
  round: number;
  message: { role: "counter"; content: string };
  candidate: {
    action: "counter" | "offer_bundle" | "accept" | "refuse" | "clarify";
    amount_paise: number | null;
    bundle_id: string | null;
    validation_status: "passed" | "failed";
  };
};

export type MerchantDeal = {
  id: string;
  status: string;
  current_round: number;
  candidate_action: string | null;
  candidate_amount_paise: number | null;
  candidate_bundle_id: string | null;
  candidate_validation_status: string | null;
  candidate_violation_codes: string[];
  accepted_amount_paise: number | null;
  accepted_currency: string | null;
  accepted_bundle_id: string | null;
  agreement_locked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MerchantDealMessage = {
  id: string;
  sequence: number;
  sender: "buyer" | "counter" | "system";
  text: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PublicOffer = {
  slug: string;
  merchant_display_name: string;
  product_name: string;
  description: string;
  image_url: string | null;
  list_price_paise: number;
  currency: string;
  status: "live";
};

export class CounterApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class CounterApiClient {
  constructor(private readonly baseUrl: string) {}

  async createOffer(payload: OfferCreate) {
    return this.request<{ offer: OfferSummary; management_capability: string }>("/api/offers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getMerchantOffer(offerId: string, capability: string) {
    return this.request<{ offer: OfferSummary; current_policy: StructuredPolicy | null }>(
      `/api/offers/${encodeURIComponent(offerId)}`,
      { headers: this.capabilityHeader(capability) },
    );
  }

  async updateOffer(offerId: string, capability: string, payload: OfferUpdate) {
    return this.request<{ offer: OfferSummary; current_policy: StructuredPolicy | null }>(
      `/api/offers/${encodeURIComponent(offerId)}`,
      {
        method: "PATCH",
        headers: this.capabilityHeader(capability),
        body: JSON.stringify(payload),
      },
    );
  }

  async publishOffer(offerId: string, capability: string, policy: StructuredPolicy) {
    return this.request<{
      offer: OfferSummary;
      policy: StructuredPolicy & { version: number; list_price_paise: number; created_at: string };
      public_url_path: string;
    }>(`/api/offers/${encodeURIComponent(offerId)}/publish`, {
      method: "POST",
      headers: this.capabilityHeader(capability),
      body: JSON.stringify(policy),
    });
  }

  async extractPolicyDraft(offerId: string, capability: string, rulesText: string) {
    return this.request<PolicyDraftResponse>(
      `/api/offers/${encodeURIComponent(offerId)}/policy-draft`,
      {
        method: "POST",
        headers: this.capabilityHeader(capability),
        body: JSON.stringify({ rules_text: rulesText }),
      },
    );
  }

  async getPublicOffer(slug: string) {
    return this.request<PublicOffer>(`/api/public/offers/${encodeURIComponent(slug)}`);
  }

  async startDeal(slug: string) {
    return this.request<{ deal_capability: string; deal_status: "negotiating" }>(
      `/api/public/offers/${encodeURIComponent(slug)}/deals`,
      { method: "POST" },
    );
  }

  async sendBuyerMessage(capability: string, message: string, clientMessageId: string) {
    return this.request<BuyerTurnResponse>("/api/public/deals/messages", {
      method: "POST",
      headers: { "X-Counter-Deal-Capability": capability },
      body: JSON.stringify({ message, client_message_id: clientMessageId }),
    });
  }

  async getMerchantDeals(offerId: string, capability: string) {
    return this.request<{ deals: MerchantDeal[] }>(
      `/api/offers/${encodeURIComponent(offerId)}/deals`,
      {
        headers: this.capabilityHeader(capability),
      },
    );
  }

  async getMerchantDeal(offerId: string, dealId: string, capability: string) {
    return this.request<{ deal: MerchantDeal; messages: MerchantDealMessage[] }>(
      `/api/offers/${encodeURIComponent(offerId)}/deals/${encodeURIComponent(dealId)}`,
      { headers: this.capabilityHeader(capability) },
    );
  }

  private capabilityHeader(capability: string): HeadersInit {
    return { "X-Counter-Management-Capability": capability };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      throw new CounterApiError(
        response.status,
        body?.error?.code ?? "request_failed",
        body?.error?.message ?? "Counter API request failed",
      );
    }
    return (await response.json()) as T;
  }
}

export const counterApi = new CounterApiClient(
  import.meta.env.VITE_COUNTER_API_URL ?? "http://localhost:8000",
);
