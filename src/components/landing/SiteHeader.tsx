const NAV = [
  { label: "Product", href: "/#how-it-works" },
  { label: "Demo", href: "/demo" },
  { label: "Docs", href: "/docs" },
  { label: "GitHub", href: "https://github.com/NikhilRaikwar/Counter", external: true },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <a href="/" className="font-display text-2xl font-extrabold tracking-tight text-ink">
        Counter
      </a>
      <nav className="hidden items-center gap-8 md:flex">
        {NAV.map((item) => (
          <a
            key={item.label}
            href={item.href}
            {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="text-sm font-medium text-ink/80 transition-colors hover:text-ink"
          >
            {item.label}
          </a>
        ))}
      </nav>
      <a
        href="/demo"
        className="rounded-lg bg-amber px-4 py-2.5 text-sm font-semibold text-amber-foreground shadow-[0_1px_0_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-0.5"
      >
        Try Counter
      </a>
    </header>
  );
}
