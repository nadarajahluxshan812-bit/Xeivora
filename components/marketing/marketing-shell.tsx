import Link from "next/link";
import type { ReactNode } from "react";

import { OrbitLogo } from "@/components/orbit-logo";

const links = [
  ["Product", "/product"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
  ["Contact", "/contact"]
] as const;

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/75 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/">
          <OrbitLogo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-white/65 md:flex">
          {links.map(([label, href]) => (
            <Link className="transition hover:text-white" href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link className="hidden rounded-full border border-white/12 px-4 py-2 text-sm text-white/72 md:inline-flex" href="/login">
            Login
          </Link>
          <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950" href="/chat">
            Open Xeivora
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_.8fr_.8fr] md:px-6">
        <div>
          <OrbitLogo />
          <p className="mt-4 max-w-lg text-sm leading-7 text-white/55">
            Xeivora connects AI models, tools, agents, and workflows into one continuous intelligent system.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Platform</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/58">
            <Link href="/product">Product</Link>
            <Link href="/chat">Chat</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/workflows">Workflows</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Company</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/58">
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
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.15),transparent_30%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.11),transparent_35%)]" />
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
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">{eyebrow}</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight md:text-7xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">{subtitle}</p>
      </div>
    </section>
  );
}

export function MarketingCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[1.7rem] border border-white/10 bg-white p-6 text-slate-950 shadow-[0_30px_90px_rgba(0,0,0,0.18)]">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
    </article>
  );
}
