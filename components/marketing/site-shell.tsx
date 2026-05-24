"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { marketingNavItems } from "@/lib/marketing-site-data";
import { cn } from "@/lib/utils";
import { MarketingBrand, NavbarActionButton, ThemeButton } from "./reference-ui";

export function MarketingSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030303] text-white [font-family:var(--font-marketing-body)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#030303_0%,#050509_55%,#030303_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(76,29,149,0.24),transparent_34%),radial-gradient(circle_at_20%_15%,rgba(124,58,237,0.08),transparent_20%),radial-gradient(circle_at_80%_12%,rgba(59,130,246,0.08),transparent_20%)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(139,92,246,0.28)_1px,transparent_1px)] [background-position:0_0] [background-size:24px_24px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
      </div>

      <div className="relative z-10">
        <MarketingNavbar />
        <main>{children}</main>
      </div>
    </div>
  );
}

export function MarketingNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/86 backdrop-blur-xl">
        <div className="mx-auto grid h-[72px] max-w-[1180px] grid-cols-[auto,1fr,auto] items-center gap-6 px-4 sm:px-6">
          <Link className="justify-self-start" href="/">
            <MarketingBrand />
          </Link>

          <nav className="hidden items-center justify-center gap-9 lg:flex">
            {marketingNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  className={cn(
                    "relative text-sm font-medium text-white/76 transition hover:text-white",
                    active && "text-white"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {item.label}
                    {item.chevron ? <ChevronDown className="h-3.5 w-3.5 text-white/48" /> : null}
                  </span>
                  <span
                    className={cn(
                      "absolute -bottom-[23px] left-0 h-0.5 w-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] transition-transform duration-200",
                      active ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 justify-self-end lg:flex">
            <ThemeButton />
            <NavbarActionButton href="/login">Sign in</NavbarActionButton>
            <NavbarActionButton href="/chat" primary>
              Get Started
            </NavbarActionButton>
          </div>

          <button
            aria-label="Open navigation"
            className="inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-full border border-white/[0.1] bg-white/[0.02] text-white lg:hidden"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
        <SheetContent className="border-white/[0.08] bg-[#050505] p-0" side="left">
          <div className="flex h-full flex-col px-5 py-6">
            <Link className="mb-10" href="/" onClick={() => setMobileOpen(false)}>
              <MarketingBrand />
            </Link>

            <nav className="grid gap-2">
              {marketingNavItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    className={cn(
                      "flex h-12 items-center justify-between rounded-[16px] border px-4 text-sm font-medium transition",
                      active
                        ? "border-[#8b5cf6]/34 bg-[#171024] text-white"
                        : "border-transparent text-white/68 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white"
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>{item.label}</span>
                    {item.chevron ? <ChevronDown className="h-4 w-4 text-white/42" /> : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto grid gap-3 pt-8">
              <ThemeButton />
              <NavbarActionButton href="/login">Sign in</NavbarActionButton>
              <NavbarActionButton href="/chat" primary>
                Get Started
              </NavbarActionButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
