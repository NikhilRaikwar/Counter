import { useState, useRef, useEffect } from "react";
import { Send, Shield, RefreshCw, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ChatMessage } from "@/types/demo";

interface NegotiationChatProps {
  messages: ChatMessage[];
  isSimulating: boolean;
  onSendCustomMessage: (text: string) => void;
  onRunSafeBuyer: () => void;
  onRunUnsafeBuyer: () => void;
  onReset: () => void;
}

export function NegotiationChat({
  messages,
  isSimulating,
  onSendCustomMessage,
  onRunSafeBuyer,
  onRunUnsafeBuyer,
  onReset,
}: NegotiationChatProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSimulating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSimulating) return;
    onSendCustomMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-bold text-ink">Live negotiation</h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            • Buyer & Counter AI
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
          </span>
          Live demo
        </div>
      </div>

      {/* Quick Demo Controls Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Quick flows:</span>
          <button
            type="button"
            disabled={isSimulating}
            onClick={onRunSafeBuyer}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="size-3 text-emerald-700" />
            Try safe buyer
          </button>
          <button
            type="button"
            disabled={isSimulating}
            onClick={onRunUnsafeBuyer}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-100/70 hover:bg-rose-200/80 px-2.5 py-1 text-xs font-semibold text-rose-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <AlertTriangle className="size-3 text-rose-700" />
            Try unsafe buyer
          </button>
        </div>

        <button
          type="button"
          disabled={isSimulating}
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-ink hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className="size-3" />
          Reset
        </button>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-[380px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 my-auto">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-soft text-amber-foreground">
              <Sparkles className="size-5" />
            </div>
            <h3 className="mt-3 font-display font-bold text-sm text-ink">
              Start a deal conversation
            </h3>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Click <span className="font-semibold text-emerald-700">"Try safe buyer"</span> for an
              approved deal, or{" "}
              <span className="font-semibold text-rose-700">"Try unsafe buyer"</span> to test
              injection protection.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={onRunSafeBuyer}
                className="rounded-lg bg-amber px-3 py-1.5 text-xs font-bold text-amber-foreground shadow-xs hover:bg-amber/90"
              >
                Start safe buyer flow
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isBuyer = msg.sender === "buyer";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isBuyer ? "items-start" : "items-end"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                <div className="flex items-center gap-1.5 px-1 mb-1 text-[0.68rem] text-muted-foreground font-medium">
                  {!isBuyer && (
                    <img
                      src="/counter-favicon.png"
                      alt="Counter"
                      className="size-3.5 rounded-xs object-contain"
                    />
                  )}
                  <span>{isBuyer ? "Buyer" : "Counter AI"}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    isBuyer
                      ? "rounded-tl-xs bg-muted/80 text-ink border border-border/80"
                      : "rounded-tr-xs bg-amber-soft text-ink border border-amber/40"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </div>
            );
          })
        )}

        {isSimulating && (
          <div className="flex flex-col items-end animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 px-1 mb-1 text-[0.68rem] text-muted-foreground font-medium">
              <img
                src="/counter-favicon.png"
                alt="Counter"
                className="size-3.5 rounded-xs object-contain"
              />
              <span>Counter AI</span>
              <span>•</span>
              <span>Evaluating policy...</span>
            </div>
            <div className="rounded-2xl rounded-tr-xs bg-amber-soft/60 border border-amber/30 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber animate-bounce [animation-delay:-0.3s]"></span>
                <span className="size-1.5 rounded-full bg-amber animate-bounce [animation-delay:-0.15s]"></span>
                <span className="size-1.5 rounded-full bg-amber animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-border/80 p-3 bg-muted/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSimulating}
            placeholder="Type as the buyer (e.g. 'Can you do ₹5,300?')..."
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm text-ink placeholder:text-muted-foreground focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSimulating}
            className="flex size-10 items-center justify-center rounded-xl bg-amber text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
