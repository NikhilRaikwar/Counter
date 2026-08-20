import { useState, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { Upload, X, ArrowRight, Sparkles, SlidersHorizontal, Tag, FileText } from "lucide-react";
import { OFFER_PRESETS } from "@/lib/offer-presets";
import type { MerchantPolicy } from "@/types/product";
import { counterApi, CounterApiError } from "@/services/counter-api";
import { saveMerchantCapability, savePendingPolicyReview } from "@/services/capability-store";

interface OfferFormProps {
  onProceedToReview?: (data: {
    productName: string;
    description: string;
    listPrice: number;
    image?: string;
    policy: MerchantPolicy;
  }) => void;
}

export function OfferForm({ onProceedToReview }: OfferFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productName, setProductName] = useState("SEO Audit Pro");
  const [description, setDescription] = useState(
    "A complete technical SEO audit with prioritized fixes and one strategy session.",
  );
  const [listPrice, setListPrice] = useState("20000");
  const [rules, setRules] = useState(
    `Never sell below ₹17,500.

Counter may discount by up to ₹2,500.

It can include a 30-minute strategy call before lowering the price.

Maximum 4 negotiation rounds.

Never include extra revisions.

Never change the product scope.`,
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyPreset = (presetKey: string) => {
    const preset = OFFER_PRESETS[presetKey];
    if (preset) {
      setProductName(preset.productName);
      setDescription(preset.description);
      setListPrice(String(preset.listPrice));
      setRules(preset.rules);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rupeeDigits = listPrice.replace(/[^0-9]/g, "");
    if (!rupeeDigits) {
      setError("Enter a valid whole-rupee public price.");
      return;
    }
    const paise = Number(BigInt(rupeeDigits) * 100n);
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await counterApi.createOffer({
        merchant_display_name: "Counter Merchant",
        product_name: productName.trim() || "Negotiable Offer",
        description: description.trim() || "Complete package ready for negotiation.",
        image_url: null,
        list_price_paise: paise,
        currency: "INR",
      });
      saveMerchantCapability(created.offer.id, created.management_capability);
      const extraction = await counterApi.extractPolicyDraft(
        created.offer.id,
        created.management_capability,
        rules,
      );
      savePendingPolicyReview({ offer: created.offer, rulesText: rules, extraction });
      if (onProceedToReview) {
        const draft = extraction.draft;
        onProceedToReview({
          productName: created.offer.product_name,
          description: created.offer.description,
          listPrice: created.offer.list_price_paise / 100,
          policy: {
            floorPrice: (draft.floor_price_paise ?? 0) / 100,
            maxDiscount: (draft.max_discount_paise ?? 0) / 100,
            maxRounds: draft.max_rounds ?? 0,
            expiryMinutes: draft.expiry_minutes ?? 0,
            allowedBundles: draft.allowed_bundles.map((bundle) => bundle.name),
            allowedActions: draft.allowed_actions,
            blockedActions: draft.forbidden_actions,
            rawRules: rules,
          },
        });
      } else {
        router.navigate({ to: "/create/review" });
      }
    } catch (cause) {
      setError(
        cause instanceof CounterApiError
          ? cause.message
          : "Counter could not create this draft. Check that the backend is running and retry.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Page Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3.5 py-1 text-xs font-semibold text-amber-foreground">
          <Sparkles className="size-3.5" />
          Create a negotiable link
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Turn your offer into a negotiable link.
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Add what you're selling. Set your limits. Counter handles the back-and-forth.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        {/* SECTION 1: WHAT ARE YOU SELLING? */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink">What are you selling?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Basic offer details that your buyers will initially see.
          </p>

          <div className="mt-6 space-y-5">
            {/* Product Image */}
            <div>
              <label className="block text-xs font-semibold text-ink">
                Product image <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {imagePreview ? (
                <div className="mt-2 relative inline-flex items-center gap-3 rounded-xl border border-border bg-cream/50 p-2 pr-4">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="size-14 rounded-lg object-cover border border-border"
                  />
                  <div>
                    <p className="text-xs font-semibold text-ink">Image selected</p>
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-muted-foreground hover:text-ink underline"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 text-xs text-bad hover:underline"
                      >
                        <X className="size-3" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-4 transition-colors hover:bg-muted/50"
                >
                  <Upload className="size-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-ink">Add product image</span>
                  <span className="text-xs text-muted-foreground">PNG/JPG · Optional</span>
                </div>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-ink">Product name</label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. SEO Audit Pro, 10-Hour Design Block"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-ink">Description</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what the buyer receives..."
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>

            {/* Public Price */}
            <div>
              <label className="block text-xs font-semibold text-ink">
                Public price{" "}
                <span className="text-muted-foreground font-normal">(Visible to buyer)</span>
              </label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-bold text-muted-foreground">
                  ₹
                </span>
                <input
                  type="text"
                  required
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="20000"
                  className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-2.5 text-sm font-bold text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: NEGOTIATION BOUNDARIES */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                How far can Counter negotiate?
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Describe the deal boundaries in plain English.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[0.7rem] font-bold uppercase tracking-wider text-amber-foreground bg-amber-soft px-2.5 py-1 rounded-md">
              <SlidersHorizontal className="size-3" />
              Private Boundaries
            </span>
          </div>

          <div className="mt-5">
            <textarea
              rows={6}
              required
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Never sell below ₹17,500..."
              className="w-full font-mono text-sm leading-relaxed rounded-xl border border-border bg-muted/20 p-4 text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
            />
          </div>

          {/* Quick Presets */}
          <div className="mt-4 pt-3 border-t border-border/60">
            <p className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Quick presets:
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(OFFER_PRESETS).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="rounded-lg border border-border/80 bg-cream/40 px-2.5 py-1 text-xs font-medium text-ink hover:bg-amber-soft hover:border-amber/60 hover:text-amber-foreground transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            {error && <p className="mr-auto text-xs font-medium text-rose-700">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-amber px-6 py-3.5 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {isSubmitting ? "Understanding your rules…" : "Turn into rules"}{" "}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
