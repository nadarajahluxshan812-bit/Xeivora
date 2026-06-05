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
    <div
      className="min-h-screen [font-family:var(--font-marketing-body)]"
      style={{ backgroundColor: "var(--site-bg)", color: "var(--site-text)" }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(180deg, var(--site-bg) 0%, var(--site-panel) 55%, var(--site-bg) 100%)"
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at top, var(--site-overlay-top), transparent 34%), radial-gradient(circle at 18% 14%, var(--site-overlay-soft), transparent 18%), radial-gradient(circle at 82% 12%, var(--site-overlay-soft), transparent 18%)"
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--site-border)] to-transparent" />
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
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          borderColor: "var(--site-border-soft)",
          backgroundColor: "color-mix(in srgb, var(--site-panel) 86%, transparent)"
        }}
      >
        <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[auto,1fr,auto] items-center gap-6 px-6 sm:px-10 lg:px-12">
          <Link className="justify-self-start" href="/">
            <MarketingBrand />
          </Link>

          <nav className="hidden items-center justify-center gap-9 lg:flex">
            {marketingNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  className={cn(
                    "relative text-sm font-medium transition hover:text-[color:var(--site-text)]",
                    active ? "text-[color:var(--site-text)]" : "text-[color:var(--site-text)]/76"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {item.label}
                    {item.chevron ? <ChevronDown className="h-3.5 w-3.5 text-[color:var(--site-text)]/48" /> : null}
                  </span>
                  <span
                    className={cn(
                      "absolute -bottom-[23px] left-0 h-0.5 w-full rounded-full bg-[color:var(--site-accent)] transition-transform duration-200",
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
            <NavbarActionButton href="/signup" primary>
              Get Started
            </NavbarActionButton>
          </div>

          <button
            aria-label="Open navigation"
            className="inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-full border lg:hidden"
            style={{
              borderColor: "var(--site-border)",
              backgroundColor: "var(--site-ghost-bg)",
              color: "var(--site-text)"
            }}
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
        <SheetContent
          className="p-0"
          side="left"
          style={{
            borderColor: "var(--site-border-soft)",
            backgroundColor: "var(--site-panel)",
            color: "var(--site-text)"
          }}
        >
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
                        ? "text-[color:var(--site-text)]"
                        : "border-transparent text-[color:var(--site-text)]/68 hover:text-[color:var(--site-text)]"
                    )}
                    style={
                      active
                        ? { borderColor: "var(--site-accent)", backgroundColor: "var(--site-accent-soft)" }
                        : {
                            borderColor: "transparent",
                            backgroundColor: "transparent"
                          }
                    }
                    href={item.href}
                    key={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>{item.label}</span>
                    {item.chevron ? <ChevronDown className="h-4 w-4 text-[color:var(--site-text)]/42" /> : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto grid gap-3 pt-8">
              <ThemeButton />
              <NavbarActionButton href="/login">Sign in</NavbarActionButton>
              <NavbarActionButton href="/signup" primary>
                Get Started
              </NavbarActionButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
