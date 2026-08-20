import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Counter — Your AI negotiates, your margins stay safe" },
      {
        name: "description",
        content:
          "Set a floor price and approve bounds. Counter negotiates with buyers in real time and creates a verified payment link only when the deal is safe.",
      },
      {
        name: "keywords",
        content:
          "AI negotiation, price negotiation, margin protection, dynamic pricing, sales automation, discount guardrails, e-commerce checkout, SaaS deal closer",
      },
      { name: "author", content: "Counter" },
      { name: "theme-color", content: "#070B12" },
      { property: "og:site_name", content: "Counter" },
      { property: "og:title", content: "Counter — Your AI negotiates, your margins stay safe" },
      {
        property: "og:description",
        content:
          "Set a floor price and approve bounds. Counter negotiates with buyers in real time and creates a verified payment link only when the deal is safe.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://counter.nikhilraikwar.me/" },
      {
        property: "og:image",
        content: "https://counter.nikhilraikwar.me/counter-banner.png",
      },
      { property: "og:image:alt", content: "Counter - AI Margin Protection & Deal Negotiation" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Counter — Your AI negotiates, your margins stay safe" },
      {
        name: "twitter:description",
        content:
          "Set a floor price and approve bounds. Counter negotiates with buyers in real time and creates a verified payment link only when the deal is safe.",
      },
      {
        name: "twitter:image",
        content: "https://counter.nikhilraikwar.me/counter-banner.png",
      },
      { name: "twitter:image:alt", content: "Counter - AI Margin Protection & Deal Negotiation" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/counter-favicon.png?v=2", type: "image/png" },
      { rel: "shortcut icon", href: "/counter-favicon.png?v=2" },
      { rel: "apple-touch-icon", href: "/counter-favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
