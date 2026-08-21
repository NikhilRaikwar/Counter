import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { PublicBuyerHeader } from "@/components/buyer/PublicBuyerHeader";
import { BuyerOfferCard } from "@/components/buyer/BuyerOfferCard";
import { BuyerNegotiationChat } from "@/components/buyer/BuyerNegotiationChat";
import { BuyerDealAgreedCard } from "@/components/buyer/BuyerDealAgreedCard";
import { BuyerPaymentSuccessCard } from "@/components/buyer/BuyerPaymentSuccessCard";
import { counterApi, CounterApiError } from "@/services/counter-api";
import { getDealCapability, saveDealCapability } from "@/services/capability-store";
import type { Message, Offer } from "@/types/product";

export const Route = createFileRoute("/d/$slug")({
  head: () => ({ meta: [{ title: "Negotiable Offer — Counter" }] }),
  component: PublicBuyerPage,
});

function PublicBuyerPage() {
  const { slug } = Route.useParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [viewState, setViewState] = useState<"offer" | "chat" | "agreed">("offer");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<
    "idle" | "preparing" | "awaiting" | "paid" | "failed"
  >("idle");
  const [returnState, setReturnState] = useState<
    "none" | "returning" | "verifying" | "paid" | "failed" | "missing-capability"
  >("none");
  const retryRef = useRef<{ text: string; id: string; buyerAdded: boolean } | null>(null);

  useEffect(() => {
    counterApi
      .getPublicOffer(slug)
      .then((value) =>
        setOffer({
          id: slug,
          slug,
          merchantName: value.merchant_display_name,
          productName: value.product_name,
          description: value.description,
          image: value.image_url ?? undefined,
          listPrice: value.list_price_paise / 100,
          status: "live",
          createdAt: "",
          conversationsCount: 0,
          dealsAgreedCount: 0,
          paidCount: 0,
          policy: {
            floorPrice: 0,
            maxDiscount: 0,
            maxRounds: 0,
            expiryMinutes: 0,
            allowedBundles: [],
            allowedActions: [],
            blockedActions: [],
          },
        }),
      )
      .catch(() => setError("This negotiable offer is unavailable."));
  }, [slug]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("payment") !== "return") return;

    const capability = getDealCapability(slug);
    if (!capability) {
      setReturnState("missing-capability");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    const started = Date.now();
    setReturnState("returning");

    const verify = async () => {
      if (cancelled) return;
      setReturnState("verifying");
      try {
        const status = await counterApi.getPaymentStatus(capability);
        if (status.status === "paid") {
          setPaymentState("paid");
          setReturnState("paid");
          return;
        }
        if (status.status === "expired" || status.status === "cancelled") {
          setPaymentState("failed");
          setReturnState("failed");
          return;
        }
      } catch {
        // Transient errors do not change payment truth; retry within the bounded window.
      }
      if (Date.now() - started < 2 * 60_000) timer = window.setTimeout(verify, 2500);
      else setReturnState("failed");
    };

    timer = window.setTimeout(verify, 300);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [slug]);

  const handleStartNegotiation = async () => {
    setError(null);
    try {
      let capability = getDealCapability(slug);
      if (!capability) {
        const started = await counterApi.startDeal(slug);
        capability = started.deal_capability;
        saveDealCapability(slug, capability);
      }
      setViewState("chat");
      if (messages.length === 0 && offer)
        setMessages([
          {
            id: "welcome",
            sender: "counter",
            text: `Hi! I'm Counter, negotiating on behalf of ${offer.merchantName}. What offer did you have in mind?`,
            timestamp: "Just now",
          },
        ]);
    } catch {
      setError("Counter could not start a deal. Please retry.");
    }
  };

  const handleSendMessage = async (text: string) => {
    const capability = getDealCapability(slug);
    if (!capability || isThinking) return;
    const pending =
      retryRef.current?.text === text
        ? retryRef.current
        : { text, id: crypto.randomUUID(), buyerAdded: false };
    retryRef.current = pending;
    if (!pending.buyerAdded) {
      setMessages((current) => [
        ...current,
        { id: pending.id, sender: "buyer", text, timestamp: "Just now" },
      ]);
      pending.buyerAdded = true;
    }
    setIsThinking(true);
    setError(null);
    try {
      const response = await counterApi.sendBuyerMessage(capability, text, pending.id);
      setMessages((current) => [
        ...current,
        {
          id: `${pending.id}:counter`,
          sender: "counter",
          text: response.message.content,
          timestamp: "Just now",
          offerPrice: response.candidate.amount_paise
            ? response.candidate.amount_paise / 100
            : undefined,
        },
      ]);
      retryRef.current = null;
      if (response.deal_status === "agreed" && response.candidate.amount_paise !== null) {
        setAgreedPrice(response.candidate.amount_paise / 100);
        setViewState("agreed");
      }
    } catch (cause) {
      setError(
        cause instanceof CounterApiError
          ? cause.message
          : "The turn could not be sent. Retry the same message safely.",
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleOpenCheckout = async () => {
    const capability = getDealCapability(slug);
    if (!capability || paymentState === "preparing" || paymentState === "paid") return;
    setPaymentState("preparing");
    setError(null);
    try {
      const payment = await counterApi.createPaymentLink(capability);
      window.location.assign(payment.payment_url);
    } catch (cause) {
      setPaymentState("failed");
      setError(cause instanceof CounterApiError ? cause.message : "Checkout is unavailable.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <PublicBuyerHeader merchantName={offer?.merchantName ?? "Counter Merchant"} />
      <main className="flex-1 flex flex-col items-center justify-center py-6">
        {error && <p className="mb-3 text-xs font-medium text-rose-700">{error}</p>}
        {returnState === "paid" ? (
          <BuyerPaymentSuccessCard offer={offer} paidAmount={agreedPrice} />
        ) : returnState !== "none" ? (
          <div className="mx-4 w-full max-w-xl rounded-3xl border border-border bg-card p-8 text-center shadow-md">
            <LoaderCircle className="mx-auto size-10 animate-spin text-amber-600" />
            <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">
              {returnState === "returning"
                ? "Returning from secure checkout…"
                : returnState === "verifying"
                  ? "Verifying payment…"
                  : returnState === "missing-capability"
                    ? "Payment was submitted."
                    : "Payment confirmation is still pending."}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {returnState === "missing-capability"
                ? "Return to the original Counter deal session to verify status."
                : returnState === "failed"
                  ? "Counter could not confirm a final payment status yet. Please return to this deal later."
                  : "Counter is checking the signed server-side payment record."}
            </p>
          </div>
        ) : null}
        {returnState === "none" && !offer && !error && (
          <p className="text-sm text-muted-foreground">Loading offer…</p>
        )}
        {returnState === "none" && offer && viewState === "offer" && (
          <BuyerOfferCard offer={offer} onStartNegotiation={handleStartNegotiation} />
        )}
        {returnState === "none" && offer && viewState === "chat" && (
          <BuyerNegotiationChat
            offer={offer}
            messages={messages}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            onSelectAgreedPrice={() => undefined}
          />
        )}
        {returnState === "none" && offer && viewState === "agreed" && agreedPrice !== null && (
          <BuyerDealAgreedCard
            offer={offer}
            agreedPrice={agreedPrice}
            onOpenCheckout={handleOpenCheckout}
            paymentState={paymentState}
          />
        )}
      </main>
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        Powered by Counter — Bounded Deal Desk
      </footer>
    </div>
  );
}
