"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Code2,
  FileClock,
  Files,
  FolderKanban,
  GitBranch,
  Menu,
  Sparkles
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import UpgradeButton from "@/components/payments/UpgradeButton";
import { OrbitLogo } from "@/components/orbit-logo";
import { useXeivoraTheme } from "@/components/theme/theme-provider";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { cn } from "@/lib/utils";

const bg = "var(--site-bg)";
const coral = "var(--site-accent)";
const cream = "var(--site-text)";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Models", href: "#models" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" }
] as const;

const tickerItems = [
  "Continue Project",
  "Context preserved",
  "Decisions remembered",
  "Project Brain",
  "Files stay attached",
  "Timeline history",
  "Cross-model continuity",
  "Momentum protected"
] as const;

const heroPillars = [
  {
    label: "Core function",
    value: "Continue projects without rebuilding context"
  },
  {
    label: "Connected models",
    value: "Claude · GPT · Gemini · DeepSeek · Local"
  },
  {
    label: "Core promise",
    value: "Conversations, files, decisions, and progress stay intact."
  }
] as const;

const stats = [
  { value: "7d", label: "Context waiting" },
  { value: "14d", label: "Decisions intact" },
  { value: "30d", label: "Progress remembered" },
  { value: "1 click", label: "Continue project" }
] as const;

const workflowSteps = [
  {
    number: "01",
    title: "Start",
    detail: "Work begins inside a project"
  },
  {
    number: "02",
    title: "Remember",
    detail: "Project Brain stores decisions and files"
  },
  {
    number: "03",
    title: "Resume",
    detail: "Continue across models without reset"
  },
  {
    number: "04",
    title: "Ship",
    detail: "Momentum survives long gaps in work"
  }
] as const;

const modelCards = [
  {
    letter: "C",
    title: "Claude 3.5",
    detail: "Reasoning-heavy project work continues with the same files, goals, and decision trail attached.",
    status: "Supported"
  },
  {
    letter: "G",
    title: "GPT-4o",
    detail: "Implementation, coding, and visual tasks pick up from the exact same project state.",
    status: "Supported"
  },
  {
    letter: "G",
    title: "Gemini 2.5",
    detail: "Research and synthesis continue without losing decisions made in earlier sessions.",
    status: "Supported"
  },
  {
    letter: "L",
    title: "Local models",
    detail: "Private environments can still inherit the same project memory and continuity layer.",
    status: "Ready"
  }
] as const;

const featureCards = [
  {
    title: "Continue Project",
    detail: "Return after days or weeks and immediately see what changed, what is blocked, and what to do next.",
    icon: FolderKanban
  },
  {
    title: "Project Brain",
    detail: "Remember requirements, architecture choices, decisions, and summaries that should survive every session.",
    icon: Sparkles
  },
  {
    title: "Timeline",
    detail: "Track how the project evolved across chats, files, milestones, and model handoffs.",
    icon: FileClock
  },
  {
    title: "Files stay attached",
    detail: "Bring docs, code, and references into the project once and keep them connected to every future session.",
    icon: Files
  },
  {
    title: "Cross-model continuity",
    detail: "Claude, GPT, Gemini, DeepSeek, and local models can all continue from the same project memory.",
    icon: GitBranch
  },
  {
    title: "AI Workspace",
    detail: "Chats are one part of a living project workspace built around context, progress, and momentum.",
    icon: Code2
  }
] as const;

const pricingTiers: ReadonlyArray<{
  kicker: string;
  name: string;
  price: string;
  period: string;
  features: readonly string[];
  cta: string;
  featured?: boolean;
}> = [
  {
    kicker: "Starter",
    name: "Starter",
    price: "£0",
    period: "forever free",
    features: ["— 1 active workspace", "— Core memory lane", "— Standard model routing", "— File uploads up to 25 MB"],
    cta: "Start free"
  },
  {
    kicker: "Pro",
    name: "Pro",
    price: "£19",
    period: "/month",
    features: ["— Unlimited chats", "— Auto-switching continuity", "— Priority model access", "— Advanced workflow controls"],
    cta: "Go Pro",
    featured: true
  },
  {
    kicker: "Enterprise",
    name: "Enterprise",
    price: "£49",
    period: "/user/month",
    features: ["— Team memory graph", "— Workspace governance", "— Private deployments", "— Dedicated support"],
    cta: "Talk to sales"
  }
] as const;

const footerLinks = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Contact", href: "#" },
  { label: "Twitter", href: "#" }
] as const;

export function PremiumHomepage({ initialSection }: { initialSection?: "pricing" }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 18);
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
    <div className="xv-marketing-home relative min-h-screen" style={{ backgroundColor: bg, color: cream }}>
      <style jsx global>{`
        @keyframes xv-marquee {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes xv-blink {
          0%,
          49% {
            opacity: 1;
          }

          50%,
          100% {
            opacity: 0;
          }
        }

        @keyframes xv-status-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.32);
            opacity: 0.88;
          }

          70% {
            box-shadow: 0 0 0 12px rgba(34, 197, 94, 0);
            opacity: 1;
          }

          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
            opacity: 0.88;
          }
        }

        @keyframes xv-hero-orbit-spin {
          0% {
            transform: rotate(0deg) scale(1);
          }

          50% {
            transform: rotate(180deg) scale(1.015);
          }

          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes xv-hero-orbit-spin-reverse {
          0% {
            transform: rotate(0deg) scale(1);
          }

          50% {
            transform: rotate(-180deg) scale(0.985);
          }

          100% {
            transform: rotate(-360deg) scale(1);
          }
        }

        @keyframes xv-hero-orbit-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -10px, 0);
          }
        }

        .xv-marketing-home {
          background: var(--site-bg);
          color: var(--site-text);
          overflow-x: hidden;
          scrollbar-color: var(--site-accent) transparent;
          scrollbar-width: thin;
        }

        .xv-marketing-home *::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }

        .xv-marketing-home *::-webkit-scrollbar-thumb {
          background: var(--site-accent);
          border: 0;
          border-radius: 999px;
        }

        .xv-marketing-home *::-webkit-scrollbar-track {
          background: transparent;
        }

        .xv-outline-text {
          color: transparent;
          -webkit-text-stroke: 1px var(--site-outline);
        }

        .xv-section-reveal {
          opacity: 0;
          transform: translateY(32px);
          transition:
            opacity 0.8s ease,
            transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .xv-section-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .xv-ticker-track {
          animation: xv-marquee 30s linear infinite;
          will-change: transform;
        }

        .xv-terminal-cursor {
          animation: xv-blink 1.05s steps(2, end) infinite;
        }

        .xv-status-pulse {
          animation: xv-status-pulse 2s infinite;
        }

        .xv-home-panel {
          background: var(--site-panel);
        }

        .xv-home-card {
          background: var(--site-card);
        }

        .xv-home-card-soft {
          background: var(--site-card-soft);
        }

        .xv-home-border {
          border-color: var(--site-border);
        }

        .xv-home-border-soft {
          border-color: var(--site-border-soft);
        }

        .xv-home-border-strong {
          border-color: var(--site-border-strong);
        }

        .xv-home-text {
          color: var(--site-text);
        }

        .xv-home-muted {
          color: var(--site-muted);
        }

        .xv-home-subtle {
          color: var(--site-subtle);
        }

        .xv-home-accent {
          color: var(--site-accent);
        }

        .xv-home-ghost {
          background: var(--site-ghost-bg);
        }

        .xv-home-ghost:hover {
          background: var(--site-ghost-hover);
        }

        .xv-hero-orbit-field {
          animation: xv-hero-orbit-float 10s ease-in-out infinite;
          will-change: transform;
        }

        .xv-hero-orbit-spin {
          animation: xv-hero-orbit-spin 22s linear infinite;
          will-change: transform;
        }

        .xv-hero-orbit-spin-reverse {
          animation: xv-hero-orbit-spin-reverse 28s linear infinite;
          will-change: transform;
        }
      `}</style>
      <ParticleCanvas />
      <CursorFollower />

      <MarketingNavbar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} scrolled={scrolled} />

      <main className="relative z-10">
        <section className="relative flex min-h-screen items-center overflow-hidden pt-28">
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 28%, rgba(var(--site-accent-rgb),0.18), transparent 34%), radial-gradient(circle at 18% 24%, rgba(var(--site-accent-rgb),0.04), transparent 22%), radial-gradient(circle at 82% 16%, rgba(var(--site-accent-rgb),0.08), transparent 16%)"
              }}
            />
          </div>

          <div className="relative mx-auto flex w-full max-w-[1280px] flex-col px-6 pb-14 sm:px-8 lg:px-12">
            <Reveal>
              <div className="xv-home-muted mb-12 flex flex-col gap-4 text-[12px] font-medium uppercase tracking-[0.24em] md:flex-row md:items-center md:justify-between">
                <span>XVR — 2026</span>
                <span className="inline-flex items-center gap-3">
                  <span className="xv-status-pulse h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                  All systems operational
                </span>
              </div>
            </Reveal>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,720px)_minmax(280px,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,760px)_minmax(320px,1fr)]">
              <div className="relative z-10 max-w-[860px]">
                <Reveal delay={70}>
                  <div>
                    <p className="xv-home-subtle mb-5 text-[12px] font-medium uppercase tracking-[0.3em]">
                      Continuity · Memory · Momentum
                    </p>
                    <h1
                      className="font-[Georgia,'Times New Roman',serif] text-[3.9rem] leading-[0.88] tracking-[-0.06em] sm:text-[5.4rem] lg:text-[7.1rem]"
                      style={{ color: cream }}
                    >
                      <span className="block">The project</span>
                      <span className="block italic" style={{ color: coral }}>
                        shouldn&apos;t stop
                      </span>
                      <span className="xv-outline-text block">when the model does.</span>
                    </h1>
                  </div>
                </Reveal>

                <Reveal delay={120}>
                  <p className="xv-home-muted mt-8 max-w-[620px] text-balance text-[18px] font-light leading-[1.9]">
                    Continue AI-powered projects without losing context, decisions, files, progress, or memory.
                  </p>
                </Reveal>

                <Reveal delay={170}>
                  <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
                    <Link
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium text-white transition hover:-translate-y-0.5"
                      href="/signup"
                      style={{ backgroundColor: coral, boxShadow: "0 16px 48px var(--site-accent-glow)" }}
                    >
                      Get started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      className="xv-home-border xv-home-ghost xv-home-text inline-flex h-12 items-center justify-center rounded-full border px-6 text-[15px] font-medium transition hover:border-[color:var(--site-border-strong)]"
                      href="#demo"
                    >
                      Watch demo
                    </Link>
                  </div>
                </Reveal>

                <Reveal className="mt-10 lg:hidden" delay={190}>
                  <ContinueProjectPreview />
                </Reveal>
              </div>

              <Reveal delay={110}>
                <div className="hidden lg:flex lg:min-h-[420px] lg:items-start lg:justify-center lg:pt-2 xl:min-h-[460px] xl:pt-5">
                  <ContinueProjectPreview />
                </div>
              </Reveal>
            </div>

            <Reveal delay={220}>
              <div className="xv-home-border mt-16 grid gap-px overflow-hidden rounded-[28px] border bg-[color:var(--site-ghost-bg)] shadow-[0_30px_120px_rgba(0,0,0,0.2)] md:grid-cols-3">
                {heroPillars.map((item) => (
                  <div className="xv-home-card px-6 py-5" key={item.label}>
                    <div className="xv-home-subtle text-[11px] font-medium uppercase tracking-[0.18em]">{item.label}</div>
                    <div className="xv-home-text mt-3 text-[15px] font-light leading-7">{item.value}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="xv-home-border relative border-y xv-home-panel py-4">
          <div className="overflow-hidden">
            <div className="xv-ticker-track flex min-w-max items-center gap-12 px-6">
              {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
                <div className="flex items-center gap-3" key={`${item}-${index}`}>
                  <span
                    className={cn(
                      "text-[13px] font-medium uppercase tracking-[0.22em]",
                      index % 2 === 0 ? "xv-home-accent" : "xv-home-subtle"
                    )}
                  >
                    {item}
                  </span>
                  <span className="xv-home-subtle opacity-60">·</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12">
          <section className="mx-auto max-w-[1180px]">
            <div className="xv-home-border grid gap-px overflow-hidden rounded-[30px] border bg-[color:var(--site-ghost-bg)] md:grid-cols-4">
              {stats.map((stat) => (
                <div className="xv-home-card px-6 py-8 text-center" key={stat.label}>
                  <div className="font-[Georgia,'Times New Roman',serif] text-[3rem] leading-none tracking-[-0.06em]" style={{ color: coral }}>
                    {stat.value}
                  </div>
                  <div className="xv-home-subtle mt-3 text-[13px] uppercase tracking-[0.22em]">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12" id="demo">
          <section className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div>
              <div className="xv-home-subtle mb-5 text-[12px] font-medium uppercase tracking-[0.24em]">Continue Project</div>
              <h2 className="xv-home-text font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.02] tracking-[-0.05em] sm:text-[3.5rem]">
                The screen that tells you where to resume
              </h2>
              <p className="xv-home-muted mt-6 max-w-[520px] text-[17px] font-light leading-8">
                Xeivora brings back the current state of the project, the decisions already made, the files that changed,
                and the next recommended step before you ask the AI anything else.
              </p>
              <Link
                className="xv-home-border-strong xv-home-text mt-8 inline-flex h-12 items-center justify-center rounded-full border px-6 text-[15px] font-medium transition hover:bg-[color:var(--site-accent-soft)]"
                href="/chat"
              >
                See the project resume flow
              </Link>
            </div>

            <TerminalWindow />
          </section>
        </RevealSection>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12" id="how-it-works">
          <section className="mx-auto max-w-[1180px]">
            <div className="mb-12 max-w-[700px]">
              <div className="xv-home-subtle text-[12px] font-medium uppercase tracking-[0.24em]">How it works</div>
              <h2 className="xv-home-text mt-4 font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">
                Designed to help a project survive every interruption
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {workflowSteps.map((step) => (
                <HowItWorksCard detail={step.detail} key={step.number} number={step.number} title={step.title} />
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12" id="models">
          <section className="mx-auto max-w-[1180px]">
            <div className="mb-12 max-w-[720px]">
              <div className="xv-home-subtle text-[12px] font-medium uppercase tracking-[0.24em]">Models</div>
              <h2 className="xv-home-text mt-4 font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">
                The model can change. The project stays intact.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {modelCards.map((card) => (
                <ModelCard card={card} key={card.title} />
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12" id="features">
          <section className="mx-auto max-w-[1180px]">
            <div className="mb-12 max-w-[760px]">
              <div className="xv-home-subtle text-[12px] font-medium uppercase tracking-[0.24em]">Features</div>
              <h2 className="xv-home-text mt-4 font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">
                Projects first. Continuity always.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => (
                <FeatureCard detail={feature.detail} icon={feature.icon} key={feature.title} title={feature.title} />
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12" id="pricing">
          <section className="mx-auto max-w-[1180px]">
            <div className="mb-12 max-w-[720px]">
              <div className="xv-home-subtle text-[12px] font-medium uppercase tracking-[0.24em]">Pricing</div>
              <h2 className="xv-home-text mt-4 font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">
                Start free. Keep every project moving.
              </h2>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              {pricingTiers.map((tier) => (
                <PricingCard key={tier.name} tier={tier} />
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection className="px-6 pb-16 pt-12 sm:px-8 lg:px-12">
          <section className="xv-home-border xv-home-card relative mx-auto overflow-hidden rounded-[36px] border px-6 py-16 shadow-[0_30px_120px_rgba(0,0,0,0.2)] sm:px-10">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-[Georgia,'Times New Roman',serif] text-[5rem] leading-none tracking-[-0.08em] text-[color:rgba(var(--site-accent-rgb),0.06)] sm:text-[9rem] lg:text-[13rem]">
                Xeivora
              </span>
            </div>

            <div className="relative z-10 mx-auto max-w-[760px] text-center">
              <div className="xv-home-subtle text-[12px] font-medium uppercase tracking-[0.24em]">Ready to enter</div>
              <h2 className="xv-home-text mt-5 font-[Georgia,'Times New Roman',serif] text-[3.1rem] leading-[1.02] tracking-[-0.06em] sm:text-[4rem]">
                The project shouldn&apos;t stop when the model does.
              </h2>
              <p className="mt-3 text-[1.8rem] italic leading-tight" style={{ color: coral }}>
                Continue Project.
              </p>
              <p className="xv-home-text mt-2 text-[1.35rem]">Never rebuild context.</p>
              <p className="xv-home-muted mx-auto mt-6 max-w-[620px] text-[17px] font-light leading-8">
                Bring your chats, files, decisions, and momentum into one workspace that remembers exactly where the work left off.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium text-white transition hover:-translate-y-0.5"
                  href="/signup"
                  style={{ backgroundColor: coral, boxShadow: "0 16px 48px var(--site-accent-glow)" }}
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className="xv-home-border xv-home-ghost xv-home-text inline-flex h-12 items-center justify-center rounded-full border px-6 text-[15px] font-medium transition hover:border-[color:var(--site-border-strong)]"
                  href="/login"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </section>
        </RevealSection>
      </main>

      <footer className="xv-home-border relative z-10 border-t px-6 py-8 sm:px-8 lg:px-12">
        <div className="xv-home-subtle mx-auto flex max-w-[1180px] flex-col gap-6 text-[13px] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <XeivoraWordmark />
            <span>Continuity · Memory · Momentum</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            {footerLinks.map((link) => (
              <Link className="transition hover:text-[color:var(--site-text)]" href={link.href} key={link.label}>
                {link.label}
              </Link>
            ))}
          </div>

          <div>© 2026 Xeivora</div>
        </div>
      </footer>
    </div>
  );
}

function MarketingNavbar({
  scrolled,
  mobileOpen,
  onMobileOpenChange
}: {
  scrolled: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (value: boolean) => void;
}) {
  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "xv-home-border border-b bg-[color:rgba(var(--site-accent-rgb),0.05)] backdrop-blur-2xl" : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6 sm:px-8 lg:px-12">
          <Link className="shrink-0" href="#top">
            <XeivoraWordmark />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((item) => (
              <Link
                className="xv-home-muted text-[14px] font-medium transition hover:text-[color:var(--site-text)]"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggleButton />
            <Link
              className="xv-home-border xv-home-ghost xv-home-text inline-flex h-11 items-center justify-center rounded-full border px-5 text-[14px] font-medium transition hover:border-[color:var(--site-border-strong)]"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-[14px] font-medium text-white transition hover:-translate-y-0.5"
              href="/signup"
              style={{ backgroundColor: coral, boxShadow: "0 16px 40px var(--site-accent-glow)" }}
            >
              Get started
            </Link>
          </div>

          <button
            aria-label="Open navigation"
            className="xv-home-border xv-home-ghost xv-home-text inline-flex h-11 w-11 items-center justify-center rounded-full border lg:hidden"
            onClick={() => onMobileOpenChange(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <Sheet onOpenChange={onMobileOpenChange} open={mobileOpen}>
        <SheetContent className="xv-home-border xv-home-panel p-0" side="right">
          <div className="flex h-full flex-col px-5 py-6">
            <XeivoraWordmark />
            <div className="mt-10 grid gap-2">
              {navLinks.map((item) => (
                <Link
                  className="xv-home-muted rounded-2xl border border-transparent px-4 py-3 text-[14px] font-medium transition hover:border-[color:var(--site-border)] hover:bg-[color:var(--site-ghost-bg)] hover:text-[color:var(--site-text)]"
                  href={item.href}
                  key={item.label}
                  onClick={() => onMobileOpenChange(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto grid gap-3">
              <ThemeToggleButton className="w-full rounded-[999px]" compact />
              <Link
                className="xv-home-border xv-home-ghost xv-home-text inline-flex h-11 items-center justify-center rounded-full border px-5 text-[14px] font-medium"
                href="/login"
                onClick={() => onMobileOpenChange(false)}
              >
                Sign in
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full px-5 text-[14px] font-medium text-white"
                href="/signup"
                onClick={() => onMobileOpenChange(false)}
                style={{ backgroundColor: coral }}
              >
                Get started
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function XeivoraWordmark() {
  return (
    <OrbitLogo
      iconSize={36}
      nameClassName="text-[24px] font-medium tracking-[-0.05em]"
      showTagline={false}
    />
  );
}

function Reveal({
  children,
  className,
  delay = 0
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -10%" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn("xv-section-reveal", visible && "is-visible", className)}
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function RevealSection({
  children,
  className,
  id
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={className} id={id}>
      <Reveal>{children}</Reveal>
    </section>
  );
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef(getParticlePalette("dark"));
  const { resolvedTheme } = useXeivoraTheme();

  useEffect(() => {
    paletteRef.current = getParticlePalette(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const canvasElement = canvas;

    const context = canvasElement.getContext("2d");
    if (!context) {
      return;
    }
    const drawingContext = context;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particleCount = reducedMotion ? 18 : 34;
    let raf = 0;
    let width = 0;
    let height = 0;

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.5 + 0.55,
      tone: Math.random() > 0.5 ? "accent" : "neutral",
      speedX: (Math.random() - 0.5) * 0.00035,
      speedY: (Math.random() - 0.5) * 0.00028
    }));

    function updateParticleColors() {
      paletteRef.current = getParticlePalette(resolveHomepageTheme());
    }

    function resize() {
      width = canvasElement.clientWidth;
      height = canvasElement.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvasElement.width = width * ratio;
      canvasElement.height = height * ratio;
      drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw() {
      const palette = paletteRef.current;
      drawingContext.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0 || particle.x > 1) {
          particle.speedX *= -1;
        }
        if (particle.y < 0 || particle.y > 1) {
          particle.speedY *= -1;
        }

        const px = particle.x * width;
        const py = particle.y * height;
        const isAccent = particle.tone === "accent";
        const fillRgb = isAccent ? palette.accentRgb : palette.neutralRgb;
        const alphaBase = isAccent ? palette.accentAlpha : palette.neutralAlpha;

        drawingContext.beginPath();
        drawingContext.shadowBlur = isAccent ? palette.glowBlur : 0;
        drawingContext.shadowColor = rgbaString(palette.accentRgb, palette.glowAlpha * particle.alpha);
        drawingContext.fillStyle = rgbaString(fillRgb, alphaBase * particle.alpha);
        drawingContext.arc(px, py, particle.radius, 0, Math.PI * 2);
        drawingContext.fill();
        drawingContext.shadowBlur = 0;

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const nx = next.x * width;
          const ny = next.y * height;
          const distance = Math.hypot(px - nx, py - ny);

          if (distance < 120) {
            const lineStrength = 1 - distance / 120;
            drawingContext.beginPath();
            drawingContext.strokeStyle = rgbaString(palette.lineRgb, palette.lineAlpha * lineStrength);
            drawingContext.lineWidth = 0.6;
            drawingContext.moveTo(px, py);
            drawingContext.lineTo(nx, ny);
            drawingContext.stroke();
          }
        }
      });

      raf = window.requestAnimationFrame(draw);
    }

    updateParticleColors();
    resize();
    draw();

    const observer = new MutationObserver(() => {
      updateParticleColors();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"]
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateParticleColors);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateParticleColors);
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      className="pointer-events-none fixed inset-0 z-0"
      ref={canvasRef}
      style={{ opacity: resolvedTheme === "light" ? 0.98 : 0.7 }}
    />
  );
}

type HomepageTheme = "dark" | "light";

function HeroOrbitField() {
  const { resolvedTheme } = useXeivoraTheme();
  const palette = getHeroOrbitPalette(resolvedTheme);

  return (
    <div
      className="xv-hero-orbit-field relative h-[260px] w-[260px] sm:h-[340px] sm:w-[340px] lg:h-[440px] lg:w-[440px]"
      style={{ opacity: palette.opacity }}
    >
      <div
        className="absolute inset-[20%] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, ${rgbaString(palette.glowRgb, palette.glowCoreAlpha)} 0%, ${rgbaString(palette.glowRgb, palette.glowOuterAlpha)} 46%, transparent 78%)`
        }}
      />
      <div
        className="xv-hero-orbit-spin absolute left-[4%] top-[20%] h-[58%] w-[92%] rounded-[999px] border"
        style={{
          borderColor: rgbaString(palette.accentRgb, palette.outerRingAlpha),
          boxShadow: `0 0 40px ${rgbaString(palette.accentRgb, palette.outerRingGlowAlpha)}`
        }}
      >
        <span
          className="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: rgbaString(palette.accentRgb, palette.dotAlpha), boxShadow: `0 0 18px ${rgbaString(palette.accentRgb, palette.dotGlowAlpha)}` }}
        />
        <span
          className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: rgbaString(palette.neutralRgb, palette.dotAlpha * 0.92), boxShadow: `0 0 14px ${rgbaString(palette.neutralRgb, palette.dotGlowAlpha * 0.72)}` }}
        />
      </div>
      <div
        className="xv-hero-orbit-spin-reverse absolute left-[14%] top-[8%] h-[80%] w-[72%] rounded-[999px] border"
        style={{ borderColor: rgbaString(palette.lineRgb, palette.innerRingAlpha) }}
      >
        <span
          className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: rgbaString(palette.accentRgb, palette.dotAlpha), boxShadow: `0 0 14px ${rgbaString(palette.accentRgb, palette.dotGlowAlpha)}` }}
        />
        <span
          className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full"
          style={{ backgroundColor: rgbaString(palette.neutralRgb, palette.dotAlpha * 0.9), boxShadow: `0 0 12px ${rgbaString(palette.neutralRgb, palette.dotGlowAlpha * 0.68)}` }}
        />
      </div>
      <div
        className="absolute inset-[31%] rounded-full border"
        style={{ borderColor: rgbaString(palette.centerRingRgb, palette.centerRingAlpha) }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{
          borderColor: rgbaString(palette.accentRgb, palette.coreBorderAlpha),
          background: `radial-gradient(circle, ${rgbaString(palette.glowRgb, palette.coreFillAlpha)} 0%, ${rgbaString(palette.glowRgb, palette.coreOuterFillAlpha)} 70%, transparent 100%)`,
          boxShadow: `0 0 26px ${rgbaString(palette.accentRgb, palette.outerRingGlowAlpha)}`
        }}
      />
      <span
        className="absolute left-[28%] top-[27%] h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: rgbaString(palette.accentRgb, palette.sparkAlpha), boxShadow: `0 0 12px ${rgbaString(palette.accentRgb, palette.sparkGlowAlpha)}` }}
      />
      <span
        className="absolute right-[21%] top-[31%] h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: rgbaString(palette.neutralRgb, palette.sparkAlpha * 0.86), boxShadow: `0 0 10px ${rgbaString(palette.neutralRgb, palette.sparkGlowAlpha * 0.7)}` }}
      />
      <span
        className="absolute bottom-[24%] left-[32%] h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: rgbaString(palette.neutralRgb, palette.sparkAlpha * 0.86), boxShadow: `0 0 10px ${rgbaString(palette.neutralRgb, palette.sparkGlowAlpha * 0.7)}` }}
      />
      <span
        className="absolute bottom-[28%] right-[26%] h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: rgbaString(palette.accentRgb, palette.sparkAlpha), boxShadow: `0 0 12px ${rgbaString(palette.accentRgb, palette.sparkGlowAlpha)}` }}
      />
    </div>
  );
}

type ParticlePalette = {
  accentRgb: readonly [number, number, number];
  neutralRgb: readonly [number, number, number];
  lineRgb: readonly [number, number, number];
  accentAlpha: number;
  neutralAlpha: number;
  lineAlpha: number;
  glowAlpha: number;
  glowBlur: number;
};

type HeroOrbitPalette = {
  accentRgb: readonly [number, number, number];
  neutralRgb: readonly [number, number, number];
  lineRgb: readonly [number, number, number];
  centerRingRgb: readonly [number, number, number];
  glowRgb: readonly [number, number, number];
  opacity: number;
  outerRingAlpha: number;
  innerRingAlpha: number;
  centerRingAlpha: number;
  coreBorderAlpha: number;
  coreFillAlpha: number;
  coreOuterFillAlpha: number;
  glowCoreAlpha: number;
  glowOuterAlpha: number;
  outerRingGlowAlpha: number;
  dotAlpha: number;
  dotGlowAlpha: number;
  sparkAlpha: number;
  sparkGlowAlpha: number;
};

function resolveHomepageTheme(): HomepageTheme {
  if (typeof document !== "undefined") {
    const datasetTheme = document.documentElement.dataset.theme;
    if (datasetTheme === "light" || datasetTheme === "dark") {
      return datasetTheme;
    }

    if (document.documentElement.classList.contains("dark")) {
      return "dark";
    }
  }

  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "dark";
}

function getParticlePalette(theme: HomepageTheme): ParticlePalette {
  if (theme === "light") {
    return {
      accentRgb: [201, 100, 66],
      neutralRgb: [14, 11, 8],
      lineRgb: [201, 100, 66],
      accentAlpha: 0.35,
      neutralAlpha: 0.2,
      lineAlpha: 0.25,
      glowAlpha: 0.15,
      glowBlur: 14
    };
  }

  return {
    accentRgb: [201, 100, 66],
    neutralRgb: [255, 255, 255],
    lineRgb: [201, 100, 66],
    accentAlpha: 0.25,
    neutralAlpha: 0.15,
    lineAlpha: 0.15,
    glowAlpha: 0.1,
    glowBlur: 10
  };
}

function getHeroOrbitPalette(theme: HomepageTheme): HeroOrbitPalette {
  if (theme === "light") {
    return {
      accentRgb: [191, 95, 63],
      neutralRgb: [58, 44, 37],
      lineRgb: [201, 100, 66],
      centerRingRgb: [125, 86, 69],
      glowRgb: [201, 100, 66],
      opacity: 0.92,
      outerRingAlpha: 0.28,
      innerRingAlpha: 0.18,
      centerRingAlpha: 0.22,
      coreBorderAlpha: 0.34,
      coreFillAlpha: 0.26,
      coreOuterFillAlpha: 0.08,
      glowCoreAlpha: 0.2,
      glowOuterAlpha: 0.1,
      outerRingGlowAlpha: 0.14,
      dotAlpha: 0.9,
      dotGlowAlpha: 0.22,
      sparkAlpha: 0.7,
      sparkGlowAlpha: 0.18
    };
  }

  return {
    accentRgb: [201, 100, 66],
    neutralRgb: [240, 234, 216],
    lineRgb: [201, 100, 66],
    centerRingRgb: [145, 87, 63],
    glowRgb: [201, 100, 66],
    opacity: 0.78,
    outerRingAlpha: 0.22,
    innerRingAlpha: 0.14,
    centerRingAlpha: 0.18,
    coreBorderAlpha: 0.28,
    coreFillAlpha: 0.18,
    coreOuterFillAlpha: 0.06,
    glowCoreAlpha: 0.15,
    glowOuterAlpha: 0.08,
    outerRingGlowAlpha: 0.1,
    dotAlpha: 0.82,
    dotGlowAlpha: 0.16,
    sparkAlpha: 0.58,
    sparkGlowAlpha: 0.12
  };
}

function rgbaString(rgb: readonly [number, number, number], alpha: number) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.max(0, Math.min(1, alpha))})`;
}

function ContinueProjectPreview() {
  return (
    <div className="relative flex w-full max-w-[400px] justify-center">
      <div className="pointer-events-none absolute right-[-8%] top-[-10%] scale-[0.7] opacity-70">
        <HeroOrbitField />
      </div>
      <div className="xv-home-border xv-home-card relative z-10 w-full overflow-hidden rounded-[32px] border p-6 shadow-[0_28px_120px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="xv-home-subtle text-[11px] font-medium uppercase tracking-[0.24em]">Continue Project</div>
            <h3 className="xv-home-text mt-3 font-[Georgia,'Times New Roman',serif] text-[2rem] tracking-[-0.05em]">
              AI Startup Platform
            </h3>
          </div>
          <span className="rounded-full bg-[color:var(--site-accent-soft)] px-3 py-1 text-[11px] font-medium text-[color:var(--site-accent)]">
            Last active 14 days ago
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Progress", value: "72%" },
            { label: "Files", value: "12" },
            { label: "Decisions", value: "8" }
          ].map((item) => (
            <div className="xv-home-border rounded-[20px] border bg-[color:var(--site-ghost-bg)] px-4 py-3" key={item.label}>
              <div className="xv-home-subtle text-[10px] font-medium uppercase tracking-[0.16em]">{item.label}</div>
              <div className="xv-home-text mt-2 text-[18px] font-medium">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <SnapshotGroup
            title="Completed"
            items={["Authentication", "PostgreSQL", "Dashboard shell"]}
            tone="success"
          />
          <SnapshotGroup title="Blocked" items={["OAuth callback issue"]} tone="warning" />
          <SnapshotGroup
            title="Recent Decisions"
            items={["Switched from MongoDB to PostgreSQL", "Committed to Next.js app router"]}
            tone="neutral"
          />
          <SnapshotGroup title="Files Updated" items={["auth.ts", "dashboard.tsx", "billing-route.ts"]} tone="neutral" />
        </div>

        <div className="xv-home-border mt-6 rounded-[22px] border bg-[color:var(--site-panel)] px-4 py-4">
          <div className="xv-home-subtle text-[10px] font-medium uppercase tracking-[0.16em]">Recommended Next Step</div>
          <p className="xv-home-muted mt-2 text-[14px] font-light leading-6">
            Fix token refresh flow before building billing so the continuity layer survives authentication handoffs.
          </p>
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-medium text-white transition hover:-translate-y-0.5"
            href="/chat"
            style={{ backgroundColor: coral, boxShadow: "0 12px 36px var(--site-accent-glow)" }}
          >
            Continue Project
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SnapshotGroup({
  items,
  title,
  tone
}: {
  items: readonly string[];
  title: string;
  tone: "neutral" | "success" | "warning";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-[rgba(34,197,94,0.10)] text-[#16a34a]"
      : tone === "warning"
        ? "bg-[rgba(245,158,11,0.12)] text-[#d97706]"
        : "bg-[color:var(--site-accent-soft)] text-[color:var(--site-accent)]";

  return (
    <div>
      <div className="xv-home-subtle text-[10px] font-medium uppercase tracking-[0.16em]">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span className={cn("rounded-full px-3 py-1 text-[12px] font-medium", toneClasses)} key={item}>
            {tone === "success" ? "✓ " : tone === "warning" ? "✗ " : ""}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function CursorFollower() {
  const [visible, setVisible] = useState(false);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;

    function move(event: MouseEvent) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      setVisible(true);
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }
    }

    function leave() {
      setVisible(false);
    }

    function animate() {
      ringX += (mouseX - ringX) * 0.14;
      ringY += (mouseY - ringY) * 0.14;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      raf = window.requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseleave", leave);
    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }
    animate();

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[70] hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--site-accent)] transition-opacity duration-300 lg:block",
          visible ? "opacity-100" : "opacity-0"
        )}
        ref={cursorRef}
      />
      <div
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[69] hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-opacity duration-300 lg:block",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ borderColor: "var(--site-border-strong)", backgroundColor: "rgba(var(--site-accent-rgb),0.08)" }}
        ref={ringRef}
      />
    </>
  );
}

function TerminalWindow() {
  return (
    <div className="xv-home-border xv-home-panel overflow-hidden rounded-[30px] border shadow-[0_28px_120px_rgba(0,0,0,0.2)]">
      <div className="xv-home-border flex items-center gap-2 border-b px-5 py-4">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>

      <div className="px-5 py-6">
        <div className="xv-home-subtle text-[11px] font-medium uppercase tracking-[0.22em]">Project timeline</div>
        <div className="mt-5 space-y-4">
          {[
            "Created Login Page",
            "Added Dashboard",
            "Updated Sidebar",
            "Fixed Authentication Bug",
            "Preview Version 12 Approved"
          ].map((item, index) => (
            <div className="flex items-start gap-3" key={item}>
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: index === 4 ? "rgba(34,197,94,0.95)" : "rgba(var(--site-accent-rgb),0.92)",
                  boxShadow: `0 0 18px ${index === 4 ? "rgba(34,197,94,0.22)" : "rgba(var(--site-accent-rgb),0.18)"}`
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="xv-home-text text-[15px] font-medium leading-6">✓ {item}</div>
                <div className="xv-home-muted mt-1 text-[13px] font-light leading-6">
                  {index === 0
                    ? "Authentication work started and captured in project history."
                    : index === 1
                      ? "Project shell and navigation became the next continuity checkpoint."
                      : index === 2
                        ? "The workspace structure changed and the new layout was preserved."
                        : index === 3
                          ? "A blocker was resolved and saved for future resume sessions."
                          : "The approved visual state is now part of the project memory."}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="xv-home-border mt-6 rounded-[22px] border bg-[color:var(--site-ghost-bg)] px-4 py-4">
          <div className="xv-home-subtle text-[10px] font-medium uppercase tracking-[0.16em]">Why this matters</div>
          <p className="xv-home-muted mt-2 text-[14px] font-light leading-6">
            When you return later, Xeivora shows the visual and decision history of the project before you continue the next step.
          </p>
        </div>
      </div>
    </div>
  );
}

function HowItWorksCard({
  detail,
  number,
  title
}: {
  detail: string;
  number: string;
  title: string;
}) {
  return (
    <div className="xv-home-border xv-home-card group relative overflow-hidden rounded-[28px] border p-6 shadow-[0_20px_80px_rgba(0,0,0,0.12)]">
      <span className="absolute left-0 top-0 h-[2px] w-full origin-left scale-x-0 bg-[color:var(--site-accent)] transition-transform duration-500 group-hover:scale-x-100" />
      <div className="xv-home-subtle text-[12px] font-medium uppercase tracking-[0.18em]">{number}</div>
      <h3 className="xv-home-text mt-5 font-[Georgia,'Times New Roman',serif] text-[1.8rem] tracking-[-0.04em]">
        {title}
      </h3>
      <p className="xv-home-muted mt-4 text-[15px] font-light leading-7">{detail}</p>
    </div>
  );
}

function ModelCard({
  card
}: {
  card: (typeof modelCards)[number];
}) {
  return (
    <div className="xv-home-border xv-home-card group relative overflow-hidden rounded-[28px] border p-6 transition hover:border-[color:var(--site-border-strong)] hover:shadow-[0_20px_80px_rgba(var(--site-accent-rgb),0.12)]">
      <div className="pointer-events-none absolute right-5 top-4 font-[Georgia,'Times New Roman',serif] text-[5rem] leading-none tracking-[-0.08em] text-[color:rgba(var(--site-accent-rgb),0.08)]">
        {card.letter}
      </div>
      <div className="relative z-10">
        <div className="xv-home-subtle inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em]">
          <span className="xv-status-pulse h-2 w-2 rounded-full bg-[#22c55e]" />
          {card.status}
        </div>
        <h3 className="xv-home-text mt-5 font-[Georgia,'Times New Roman',serif] text-[2rem] tracking-[-0.05em]">
          {card.title}
        </h3>
        <p className="xv-home-muted mt-4 text-[15px] font-light leading-7">{card.detail}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  detail,
  icon: Icon,
  title
}: {
  detail: string;
  icon: typeof BrainCircuit;
  title: string;
}) {
  return (
    <div className="xv-home-border xv-home-card group relative overflow-hidden rounded-[28px] border p-6 shadow-[0_18px_70px_rgba(0,0,0,0.12)]">
      <span className="absolute left-0 top-0 h-full w-[3px] origin-bottom scale-y-0 bg-[color:var(--site-accent)] transition-transform duration-400 group-hover:scale-y-100" />
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--site-accent-soft)] text-[color:var(--site-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="xv-home-text font-[Georgia,'Times New Roman',serif] text-[1.9rem] tracking-[-0.05em]">
        {title}
      </h3>
      <p className="xv-home-muted mt-4 text-[15px] font-light leading-7">{detail}</p>
    </div>
  );
}

function PricingCard({
  tier
}: {
  tier: (typeof pricingTiers)[number];
}) {
  const isProTier = tier.name === "Pro";
  const isStarterTier = tier.name === "Starter";
  const isEnterpriseTier = tier.name === "Enterprise";

  return (
    <div
      className={cn(
        "xv-home-border xv-home-card relative overflow-hidden rounded-[30px] border p-7 shadow-[0_22px_90px_rgba(0,0,0,0.12)]",
        tier.featured && "border-[color:var(--site-border-strong)] shadow-[0_26px_110px_rgba(var(--site-accent-rgb),0.14)]"
      )}
    >
      {tier.featured ? <span className="absolute inset-x-0 top-0 h-[3px] bg-[color:var(--site-accent)]" /> : null}
      <div className="xv-home-subtle text-[12px] font-medium uppercase tracking-[0.24em]">{tier.kicker}</div>
      <h3 className="xv-home-text mt-4 font-[Georgia,'Times New Roman',serif] text-[2rem] tracking-[-0.05em]">{tier.name}</h3>
      <div className="mt-8 flex items-end gap-2">
        <span className="font-[Georgia,'Times New Roman',serif] text-[3.4rem] leading-none tracking-[-0.07em]" style={{ color: coral }}>
          {tier.price}
        </span>
        <span className="xv-home-subtle pb-2 text-[14px]">{tier.period}</span>
      </div>
      <div className="mt-8 space-y-3">
        {tier.features.map((feature) => (
          <div className="xv-home-muted flex items-start gap-3 text-[14px] font-light leading-7" key={feature}>
            <Check className="mt-1 h-4 w-4 shrink-0 text-[color:var(--site-accent)]" />
            <span>{feature.replace(/^—\s*/, "")}</span>
          </div>
        ))}
      </div>
      {isProTier ? (
        <UpgradeButton label={tier.cta} planKey="pro" />
      ) : (
        <Link
          className={cn(
            "mt-9 inline-flex h-11 w-full items-center justify-center rounded-full border px-5 text-[14px] font-medium transition",
            tier.featured
              ? "border-transparent text-white hover:-translate-y-0.5"
              : "xv-home-border xv-home-ghost xv-home-text hover:border-[color:var(--site-border-strong)]"
          )}
          href={isEnterpriseTier ? "/contact" : isStarterTier ? "/signup" : "/pricing"}
          style={tier.featured ? { backgroundColor: coral, boxShadow: "0 14px 40px var(--site-accent-glow)" } : undefined}
        >
          {tier.cta}
        </Link>
      )}
    </div>
  );
}
