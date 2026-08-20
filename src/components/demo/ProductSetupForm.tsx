import { useState, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Upload,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { parseCustomPolicy } from "@/lib/demo-data";
import { saveStoredPolicy } from "@/lib/demo-store";
import type { ProductPolicy } from "@/types/demo";

export function ProductSetupForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [productName, setProductName] = useState("Growth Sprint");
  const [description, setDescription] = useState(
    "A 2-week growth consulting sprint for early-stage startups. Includes two strategy calls and a written growth plan.",
  );
  const [listPrice, setListPrice] = useState("6000");
  const [rawRules, setRawRules] = useState(
    `Never sell below ₹5,200.

Counter may discount up to ₹800.

It can offer a 30-minute review call before lowering the price.

Maximum 4 negotiation rounds.

Never invent another bonus or product.`,
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Policy preview state
  const [parsedPolicy, setParsedPolicy] = useState<ProductPolicy | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

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

  const handlePreviewRules = (e: React.FormEvent) => {
    e.preventDefault();
    const policy = parseCustomPolicy({
      name: productName,
      description,
      listPrice,
      rawRules,
      imageUrl: imagePreview || undefined,
    });
    setParsedPolicy(policy);
    setIsPreviewing(true);
  };

  const handleStartNegotiation = () => {
    if (!parsedPolicy) return;
    saveStoredPolicy(parsedPolicy);
    router.navigate({ to: "/demo/deal" });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 text-xs font-semibold text-amber-foreground">
          <SlidersHorizontal className="size-3.5" />
          60-Second Setup
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Give Counter a deal to negotiate.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Add your product and describe the rules in plain English.
        </p>
      </div>

      <div className="mt-10 space-y-8">
        {!isPreviewing ? (
          <form onSubmit={handlePreviewRules} className="space-y-8">
            {/* SECTION 1: PRODUCT INFO */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
              <h2 className="font-display text-xl font-bold text-ink">1. Product Information</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                What are you selling to your buyers?
              </p>

              <div className="mt-6 space-y-5">
                {/* Product Image Upload */}
                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Product image{" "}
                    <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="mt-2 relative inline-flex items-center gap-3 rounded-xl border border-border bg-cream/60 p-2 pr-4">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="size-14 rounded-lg object-cover border border-border"
                      />
                      <div>
                        <p className="text-xs font-semibold text-ink">Image selected</p>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-bad hover:underline"
                        >
                          <X className="size-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/30 p-4 transition-colors hover:bg-muted/60"
                    >
                      <Upload className="size-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-ink">Add product image</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
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
                    placeholder="e.g. Growth Sprint, SEO Audit, SaaS Pro Annual"
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-ink">
                    What are you selling?
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe deliverables and value provided..."
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                  />
                </div>

                {/* List Price */}
                <div>
                  <label className="block text-xs font-semibold text-ink">List price</label>
                  <div className="relative mt-1.5">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-bold text-muted-foreground">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={100}
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      placeholder="6000"
                      className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-2.5 text-sm font-semibold text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: NEGOTIATION RULES */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
              <h2 className="font-display text-xl font-bold text-ink">
                2. Tell Counter what it can do
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Set boundaries in plain English. Counter strictly locks floor price and prevents
                unauthorized deals.
              </p>

              <div className="mt-6">
                <textarea
                  rows={6}
                  required
                  value={rawRules}
                  onChange={(e) => setRawRules(e.target.value)}
                  placeholder={`Never sell below ₹5,200.\nCounter may discount up to ₹800.\nMaximum 4 negotiation rounds.`}
                  className="w-full font-mono text-sm leading-relaxed rounded-xl border border-border bg-muted/20 p-4 text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-amber px-6 py-3 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5"
                >
                  Preview my rules <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* POLICY PREVIEW CARD */
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-6">
            <div className="rounded-2xl border-2 border-amber/60 bg-card p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-soft px-2.5 py-0.5 text-xs font-bold text-amber-foreground">
                    <ShieldAlert className="size-3.5" /> Parsed Guardrails
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                    Counter's authority
                  </h2>
                </div>
                <button
                  onClick={() => setIsPreviewing(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-muted"
                >
                  Edit rules
                </button>
              </div>

              {/* Policy Table */}
              <div className="mt-6 overflow-hidden rounded-xl border border-border bg-cream/40">
                <div className="divide-y divide-border/60 text-xs sm:text-sm">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Product</span>
                    <span className="font-bold text-ink">{parsedPolicy?.name}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">List price</span>
                    <span className="font-bold text-ink">
                      ₹{parsedPolicy?.listPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 bg-emerald-50/50">
                    <span className="text-muted-foreground font-medium">Lowest allowed price</span>
                    <span className="font-bold text-emerald-700">
                      ₹{parsedPolicy?.lowestPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Maximum discount</span>
                    <span className="font-bold text-ink">
                      ₹{parsedPolicy?.maxDiscount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Maximum rounds</span>
                    <span className="font-bold text-ink">{parsedPolicy?.maxRounds}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Link expiry</span>
                    <span className="font-bold text-ink">{parsedPolicy?.linkExpiry}</span>
                  </div>
                </div>
              </div>

              {/* Allowed vs Blocked Columns */}
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {/* Allowed */}
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Allowed Actions
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs font-medium text-ink">
                    {parsedPolicy?.allowedActions.map((action, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Never Allowed */}
                <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800">
                    <XCircle className="size-4 text-rose-600" />
                    Never Allowed
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs font-medium text-ink">
                    {parsedPolicy?.blockedActions.map((action, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-rose-600 font-bold">✕</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsPreviewing(false)}
                  className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-ink hover:bg-muted"
                >
                  Back to edit
                </button>
                <button
                  type="button"
                  onClick={handleStartNegotiation}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber px-6 py-3 text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5"
                >
                  Start negotiation <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
