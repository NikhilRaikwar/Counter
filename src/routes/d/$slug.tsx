import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PublicBuyerHeader } from "@/components/buyer/PublicBuyerHeader";
import { BuyerOfferCard } from "@/components/buyer/BuyerOfferCard";
import { BuyerNegotiationChat } from "@/components/buyer/BuyerNegotiationChat";
import { BuyerDealAgreedCard } from "@/components/buyer/BuyerDealAgreedCard";
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
      window.open(payment.payment_url, "_blank", "noopener,noreferrer");
      setPaymentState("awaiting");
      const started = Date.now();
      const poll = window.setInterval(async () => {
        if (Date.now() - started > 10 * 60_000) {
          window.clearInterval(poll);
          return;
        }
        try {
          const status = await counterApi.getPaymentStatus(capability);
          if (status.status === "paid") {
            setPaymentState("paid");
            window.clearInterval(poll);
          } else if (status.status === "expired" || status.status === "cancelled") {
            setPaymentState("failed");
            window.clearInterval(poll);
          }
        } catch {
          // A transient polling failure is safe; the server webhook remains authoritative.
        }
      }, 2500);
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
        {!offer && !error && <p className="text-sm text-muted-foreground">Loading offer…</p>}
        {offer && viewState === "offer" && (
          <BuyerOfferCard offer={offer} onStartNegotiation={handleStartNegotiation} />
        )}
        {offer && viewState === "chat" && (
          <BuyerNegotiationChat
            offer={offer}
            messages={messages}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            onSelectAgreedPrice={() => undefined}
          />
        )}
        {offer && viewState === "agreed" && agreedPrice !== null && (
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
