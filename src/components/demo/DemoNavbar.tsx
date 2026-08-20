import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function DemoNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
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
            Demo
          </span>
        </div>

        <nav className="flex items-center gap-6 sm:gap-8">
          <Link
            to="/demo"
            className="text-sm font-semibold text-ink transition-colors hover:text-ink/80"
          >
            Demo
          </Link>
          <a
            href="/#rules"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            Safety
          </a>
          <a
            href="/#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            Docs
          </a>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted sm:inline-flex"
          >
            <ArrowLeft className="size-3.5" />
            Exit demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
