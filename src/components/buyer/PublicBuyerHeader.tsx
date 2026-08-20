import { Link } from "@tanstack/react-router";

interface PublicBuyerHeaderProps {
  merchantName?: string;
}

export function PublicBuyerHeader({ merchantName = "Acme Studio" }: PublicBuyerHeaderProps) {
  return (
    <header className="border-b border-border/80 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-ink hover:opacity-90"
        >
          <img
            src="/counter-favicon.png"
            alt="Counter"
            className="size-6 rounded-md object-contain"
          />
          <span>Counter</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <span>Negotiating for</span>
          <span className="font-bold text-ink">{merchantName}</span>
        </div>
      </div>
    </header>
  );
}
