import Link from "next/link";
import type { ReactNode } from "react";

import { OrbitLogo } from "@/components/orbit-logo";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";

const links = [
  ["Product", "/product"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
  ["Contact", "/contact"]
] as const;

export function MarketingNav() {
  return (
    <header
      className="sticky top-0 z-40 border-b text-[color:var(--site-text)] backdrop-blur-xl"
      style={{
        borderColor: "var(--site-border-soft)",
        backgroundColor: "color-mix(in srgb, var(--site-panel) 92%, transparent)"
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/">
          <OrbitLogo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-[color:var(--site-subtle)] md:flex">
          {links.map(([label, href]) => (
            <Link className="transition hover:text-[color:var(--site-text)]" href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggleButton className="hidden md:inline-flex" compact />
          <Link className="hidden rounded-full border border-[color:var(--site-border)] bg-[color:var(--site-ghost-bg)] px-4 py-2 text-sm text-[color:var(--site-text)] md:inline-flex" href="/login">
            Login
          </Link>
          <Link className="rounded-full bg-[color:var(--site-accent)] px-4 py-2 text-sm font-semibold text-white" href="/chat">
            Open Xeivora
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[color:var(--site-border-soft)] bg-[color:var(--site-panel)] text-[color:var(--site-text)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_.8fr_.8fr] md:px-6">
        <div>
          <OrbitLogo />
          <p className="mt-4 max-w-lg text-sm leading-7 text-[color:var(--site-subtle)]">
            Xeivora connects AI models, tools, agents, and workflows into one continuous intelligent system.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Platform</h3>
          <div className="mt-4 grid gap-3 text-sm text-[color:var(--site-subtle)]">
            <Link href="/product">Product</Link>
            <Link href="/chat">Chat</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/workflows">Workflows</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Company</h3>
          <div className="mt-4 grid gap-3 text-sm text-[color:var(--site-subtle)]">
            <Link href="/about">About</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/contact">Contact</Link>
            <span>xeivora.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MarketingPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[color:var(--site-bg)] text-[color:var(--site-text)]">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, var(--site-overlay-top), transparent 34%), radial-gradient(circle at top right, var(--site-overlay-soft), transparent 30%), radial-gradient(circle at bottom, var(--site-overlay-soft), transparent 35%)"
        }}
      />
      <div className="relative">
        <MarketingNav />
        {children}
        <MarketingFooter />
      </div>
    </main>
  );
}

export function MarketingHero({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--site-accent)]">{eyebrow}</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight md:text-7xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[color:var(--site-subtle)]">{subtitle}</p>
      </div>
    </section>
  );
}

export function MarketingCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[1.7rem] border border-[color:var(--site-border)] bg-[color:var(--site-card)] p-6 text-[color:var(--site-text)] shadow-[0_30px_90px_rgba(0,0,0,0.12)]">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[color:var(--site-subtle)]">{body}</p>
    </article>
  );
}
