import { Link } from "@tanstack/react-router";
import { Plus, ArrowLeft } from "lucide-react";

export function MerchantNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink hover:opacity-90"
          >
            <img
              src="/counter-favicon.png"
              alt="Counter Logo"
              className="size-7 rounded-lg object-contain"
            />
            Counter
          </Link>
          <span className="rounded-md bg-amber-soft px-2 py-0.5 text-xs font-semibold text-amber-foreground">
            Merchant
          </span>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/deals"
            className="text-sm font-semibold text-ink transition-colors hover:text-ink/80"
          >
            Deals
          </Link>
          <Link
            to="/demo"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            Demo
          </Link>
          <Link
            to="/docs"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            Docs
          </Link>
          <a
            href="https://github.com/NikhilRaikwar/Counter"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            GitHub
          </a>
          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber px-3.5 py-1.5 text-xs sm:text-sm font-bold text-amber-foreground shadow-xs transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" />
            <span>Create deal</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
