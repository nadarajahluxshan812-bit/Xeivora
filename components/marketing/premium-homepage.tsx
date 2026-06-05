"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, BrainCircuit, FileClock, FolderKanban, Menu, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { OrbitLogo } from "@/components/orbit-logo";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "Features", href: "#features" }
] as const;

const featureCards = [
  {
    title: "Continue Project",
    detail: "Return to any project and instantly continue work.",
    icon: FolderKanban
  },
  {
    title: "Project Memory",
    detail: "Keep important decisions, requirements, and knowledge attached to the project.",
    icon: BrainCircuit
  },
  {
    title: "Timeline",
    detail: "Track how the project evolved over time.",
    icon: FileClock
  }
] as const;

const fragmentedItems = ["Chat", "Files", "Notes", "Repositories", "AI Tools"] as const;
const projectTags = ["Project", "Timeline", "Memory", "Continue Project"] as const;
const footerLinks = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Contact", href: "#" },
  { label: "Twitter", href: "#" }
] as const;

const backgroundColor = "var(--site-bg)";
const foregroundColor = "var(--site-text)";

function NavLinkList({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <nav className={cn("flex items-center gap-8", className)}>
      {navLinks.map((link) => (
        <Link
          className="text-sm font-medium text-[color:var(--site-text)]/78 transition hover:text-[color:var(--site-text)]"
          href={link.href}
          key={link.label}
          onClick={onNavigate}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function SectionFrame({
  id,
  children,
  className = ""
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-[1180px] px-6 md:px-10", className)} id={id}>
      {children}
    </section>
  );
}

function SectionHeading({
  title,
  description,
  align = "center"
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("space-y-4", align === "center" ? "mx-auto max-w-[760px] text-center" : "max-w-[640px] text-left")}>
      <h2 className="font-[Georgia,'Times_New_Roman',serif] text-4xl tracking-[-0.04em] text-[color:var(--site-text)] md:text-5xl">
        {title}
      </h2>
      {description ? <p className="text-base leading-8 text-[color:var(--site-text)]/68 md:text-lg">{description}</p> : null}
    </div>
  );
}

function PrimaryButton({
  href,
  children,
  className = ""
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[color:var(--site-accent)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[color:var(--site-accent-strong)]",
        className
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
  className = ""
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] px-7 py-3.5 text-sm font-semibold text-[color:var(--site-text)] transition hover:border-[color:var(--site-border)] hover:bg-[color:var(--site-ghost-hover)]",
        className
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

export function PremiumHomepage({ initialSection }: { initialSection?: "pricing" }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!initialSection) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const section = document.getElementById(initialSection);
      if (!section) {
        return;
      }

      section.scrollIntoView({ behavior: "auto", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [initialSection]);

  return (
    <div className="min-h-screen" style={{ backgroundColor, color: foregroundColor }}>
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-all",
          scrolled
            ? "border-[color:var(--site-border-soft)] bg-[color:var(--site-bg)]/92 backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-20 w-full max-w-[1240px] items-center justify-between px-6 md:px-10">
          <Link aria-label="Xeivora home" className="shrink-0" href="/">
            <OrbitLogo className="text-[color:var(--site-text)]" compact={false} iconSize={34} showTagline={false} />
          </Link>

          <NavLinkList className="hidden md:flex" />

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggleButton compact />
            <SecondaryButton className="px-6 py-3" href="/login">
              Sign in
            </SecondaryButton>
            <PrimaryButton className="px-6 py-3" href="/signup">
              Get Started
            </PrimaryButton>
          </div>

          <button
            aria-label="Open navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] text-[color:var(--site-text)] md:hidden"
            onClick={() => setMobileNavOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
        <SheetContent
          className="border-[color:var(--site-border-soft)] bg-[color:var(--site-bg)] text-[color:var(--site-text)]"
          side="right"
        >
          <div className="mt-10 space-y-8">
            <OrbitLogo compact={false} iconSize={34} showTagline={false} />
            <NavLinkList className="flex flex-col items-start gap-5" onNavigate={() => setMobileNavOpen(false)} />
            <div className="flex flex-col gap-3">
              <ThemeToggleButton className="w-11" compact />
              <SecondaryButton href="/login">Sign in</SecondaryButton>
              <PrimaryButton href="/signup">Get Started</PrimaryButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main className="pb-28 pt-8 md:pb-32 md:pt-12">
        <SectionFrame className="pt-8 md:pt-16">
          <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(460px,540px)] lg:gap-20">
            <div className="max-w-[640px] space-y-10">
              <div className="space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--site-text)]/48">
                  The continuity layer for project work
                </p>
                <h1 className="font-[Georgia,'Times_New_Roman',serif] text-5xl leading-[0.96] tracking-[-0.06em] text-[color:var(--site-text)] md:text-7xl">
                  The Project Shouldn&apos;t Stop When The Model Does.
                </h1>
                <div className="max-w-[620px] space-y-3 text-lg leading-8 text-[color:var(--site-text)]/68 md:text-xl">
                  <p>Continue projects without rebuilding context.</p>
                  <p>
                    Conversations, decisions, files, progress, and history stay attached to the project so you can pick
                    up where you left off.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <PrimaryButton href="/signup">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </PrimaryButton>
                <SecondaryButton href="#product">
                  <PlayCircle className="h-4 w-4" />
                  Watch Demo
                </SecondaryButton>
              </div>
            </div>

            <div className="flex h-full flex-col justify-between gap-8 rounded-[32px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] p-6 md:p-8">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--site-text)]/45">
                  Continue Project
                </p>
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface-strong)] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-[color:var(--site-text)]">Xeivora</p>
                        <p className="mt-1 text-sm text-[color:var(--site-text)]/56">Last active 15 minutes ago</p>
                      </div>
                      <span className="rounded-full bg-[color:var(--site-accent-soft)] px-3 py-1 text-xs font-medium text-[color:var(--site-accent)]">
                        Memory ready
                      </span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[18px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-bg)]/42 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--site-text)]/42">Project Brain</p>
                        <p className="mt-2 text-sm leading-7 text-[color:var(--site-text)]/72">
                          Decisions, files, and summaries are already attached.
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-bg)]/42 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--site-text)]/42">Timeline</p>
                        <p className="mt-2 text-sm leading-7 text-[color:var(--site-text)]/72">
                          Resume from the latest checkpoint without re-explaining the work.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-bg)]/28 p-5">
                    <div className="flex items-center gap-3 text-sm text-[color:var(--site-text)]/68">
                      <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--site-accent)]" />
                      The project remembers what happened before you got here.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionFrame>

        <SectionFrame className="pt-28 md:pt-36" id="product">
          <SectionHeading align="center" description={undefined} title="Continue any project instantly." />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {projectTags.map((tag) => (
              <span
                className="rounded-full border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] px-4 py-2 text-sm font-medium text-[color:var(--site-text)]/74"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 overflow-hidden rounded-[34px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.08)] md:p-5">
            <Image
              alt="Xeivora project workspace showing continuity, project brain, and timeline."
              className="h-auto w-full rounded-[24px] border border-[color:var(--site-border-soft)]"
              height={1912}
              priority
              quality={95}
              src="/xeivora-project-demo.jpg"
              width={2940}
            />
          </div>

          <div className="mx-auto mt-8 max-w-[720px] text-center text-base leading-8 text-[color:var(--site-text)]/66 md:text-lg">
            <p>Leave for a day, a week, or a month.</p>
            <p>Come back and immediately understand where you left off.</p>
          </div>
        </SectionFrame>

        <SectionFrame className="pt-28 md:pt-36" id="problem">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-center">
            <SectionHeading
              align="left"
              description="Modern projects are spread across conversations, documents, repositories, and tools. Every interruption forces you to rebuild context before you can continue."
              title="AI Work Is Fragmented"
            />

            <div className="rounded-[32px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] p-8 md:p-10">
              <div className="grid gap-3 sm:grid-cols-2">
                {fragmentedItems.map((item) => (
                  <div
                    className="rounded-[20px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface-strong)] px-5 py-4 text-sm font-medium text-[color:var(--site-text)]/74"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="my-8 flex justify-center">
                <div className="rounded-full border border-[color:var(--site-border-soft)] bg-[color:var(--site-bg)]/42 p-4">
                  <ArrowDown className="h-5 w-5 text-[color:var(--site-text)]/52" />
                </div>
              </div>
              <div className="rounded-[24px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-bg)]/42 px-6 py-7 text-center">
                <p className="font-[Georgia,'Times_New_Roman',serif] text-3xl tracking-[-0.04em] text-[color:var(--site-text)] md:text-4xl">
                  Lost Context
                </p>
              </div>
            </div>
          </div>
        </SectionFrame>

        <SectionFrame className="pt-28 md:pt-36" id="solution">
          <div className="rounded-[34px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] px-6 py-12 md:px-12 md:py-16">
            <SectionHeading
              align="left"
              description="Xeivora keeps conversations, decisions, files, tasks, and progress connected to the project itself. The project becomes the source of truth. Not the chat. Not the model. Not the tool."
              title="One Project. One Memory."
            />
          </div>
        </SectionFrame>

        <SectionFrame className="pt-28 md:pt-36" id="features">
          <SectionHeading align="center" title="Three things matter." />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  className="rounded-[30px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] p-8"
                  key={feature.title}
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--site-accent-soft)] text-[color:var(--site-accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 font-[Georgia,'Times_New_Roman',serif] text-2xl tracking-[-0.03em] text-[color:var(--site-text)]">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-[color:var(--site-text)]/66">{feature.detail}</p>
                </div>
              );
            })}
          </div>
        </SectionFrame>

        <SectionFrame className="pt-28 md:pt-36" id="pricing">
          <div className="rounded-[38px] border border-[color:var(--site-border-soft)] bg-[color:var(--site-surface)] px-6 py-16 text-center md:px-12 md:py-20">
            <div className="mx-auto max-w-[760px] space-y-6">
              <h2 className="font-[Georgia,'Times_New_Roman',serif] text-4xl tracking-[-0.05em] text-[color:var(--site-text)] md:text-6xl">
                Build. Leave. Return. Continue.
              </h2>
              <PrimaryButton className="px-8 py-4 text-base" href="/signup">
                Start Building
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </div>
        </SectionFrame>
      </main>

      <footer className="border-t border-[color:var(--site-border-soft)] py-8">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between md:px-10">
          <OrbitLogo compact={false} iconSize={32} showTagline={false} />
          <div className="flex flex-wrap items-center gap-5 text-sm text-[color:var(--site-text)]/58">
            {footerLinks.map((link) => (
              <Link className="transition hover:text-[color:var(--site-text)]" href={link.href} key={link.label}>
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-sm text-[color:var(--site-text)]/48">© 2026 Xeivora</p>
        </div>
      </footer>
    </div>
  );
}
