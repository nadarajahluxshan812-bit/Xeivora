"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  Code2,
  FileCode2,
  Files,
  Globe,
  HeartPulse,
  Menu,
  Moon,
  Search,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const bg = "#0e0b08";
const coral = "#c96442";
const cream = "#f0ead8";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Models", href: "#models" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" }
] as const;

const tickerItems = [
  "Context preserved",
  "Auto model routing",
  "Zero restarts",
  "Workflow memory",
  "Local file access",
  "Travel planning",
  "AI education",
  "Health module"
] as const;

const heroPillars = [
  {
    label: "Core function",
    value: "Unified AI operating system"
  },
  {
    label: "Connected models",
    value: "Claude · GPT-4o · Gemini · Cursor"
  },
  {
    label: "Core promise",
    value: "Context preserved. Momentum protected."
  }
] as const;

const stats = [
  { value: "6+", label: "Models" },
  { value: "0ms", label: "Transfer" },
  { value: "100%", label: "Context" },
  { value: "∞", label: "Continuity" }
] as const;

const workflowSteps = [
  {
    number: "01",
    title: "Start",
    detail: "Initialize workflow"
  },
  {
    number: "02",
    title: "Store",
    detail: "Context is preserved"
  },
  {
    number: "03",
    title: "Switch",
    detail: "Auto model transfer"
  },
  {
    number: "04",
    title: "Continue",
    detail: "Work never stops"
  }
] as const;

const modelCards = [
  {
    letter: "C",
    title: "Claude 3.5",
    detail: "Long-form reasoning, strategic writing, and deep continuity-aware analysis.",
    status: "Live"
  },
  {
    letter: "G",
    title: "GPT-4o",
    detail: "Implementation, coding, multimodal execution, and fast conversational turns.",
    status: "Live"
  },
  {
    letter: "G",
    title: "Gemini 2.5",
    detail: "Search-oriented thinking, high-speed summarization, and broad information recall.",
    status: "Live"
  },
  {
    letter: "C",
    title: "Cursor",
    detail: "Local development context, structured code operations, and execution-side assistance.",
    status: "Connected"
  }
] as const;

const featureCards = [
  {
    title: "Workflow continuity",
    detail: "Keep the same thread alive across long work sessions, model transfers, and retries.",
    icon: BrainCircuit
  },
  {
    title: "Persistent memory",
    detail: "Preserve facts, project decisions, and momentum so the workspace keeps learning with you.",
    icon: Sparkles
  },
  {
    title: "Website builder",
    detail: "Generate landing pages, product surfaces, and production-ready frontend scaffolds faster.",
    icon: FileCode2
  },
  {
    title: "Travel companion",
    detail: "Plan itineraries, compare routes, and keep your travel research stitched into one system.",
    icon: Globe
  },
  {
    title: "AI education",
    detail: "Turn complex topics into structured learning flows with memory and contextual recall.",
    icon: BriefcaseBusiness
  },
  {
    title: "Local file access",
    detail: "Bring PDFs, markdown, spreadsheets, and working documents directly into the same thread.",
    icon: Files
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

export function PremiumHomepage() {
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

        .xv-marketing-home {
          background: #0e0b08;
          color: #f0ead8;
          overflow-x: hidden;
          scrollbar-color: #c96442 transparent;
          scrollbar-width: thin;
        }

        .xv-marketing-home *::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }

        .xv-marketing-home *::-webkit-scrollbar-thumb {
          background: #c96442;
          border: 0;
          border-radius: 999px;
        }

        .xv-marketing-home *::-webkit-scrollbar-track {
          background: transparent;
        }

        .xv-outline-text {
          color: transparent;
          -webkit-text-stroke: 1px rgba(240, 234, 216, 0.4);
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
      `}</style>
      <ParticleCanvas />
      <CursorFollower />

      <MarketingNavbar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} scrolled={scrolled} />

      <main className="relative z-10">
        <section className="relative flex min-h-screen items-center overflow-hidden pt-28">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(201,100,66,0.18),transparent_34%),radial-gradient(circle_at_18%_24%,rgba(240,234,216,0.04),transparent_22%),radial-gradient(circle_at_82%_16%,rgba(201,100,66,0.08),transparent_16%)]" />
          </div>

          <div className="relative mx-auto flex w-full max-w-[1280px] flex-col px-6 pb-14 sm:px-8 lg:px-12">
            <Reveal>
              <div className="mb-12 flex flex-col gap-4 text-[12px] font-medium uppercase tracking-[0.24em] text-[#d7ceb8] md:flex-row md:items-center md:justify-between">
                <span>XVR — 2026</span>
                <span className="inline-flex items-center gap-3">
                  <span className="xv-status-pulse h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                  All systems operational
                </span>
              </div>
            </Reveal>

            <Reveal delay={70}>
              <div className="max-w-[860px]">
                <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.3em] text-[#c9b8a4]">
                  Continuity · Memory · Momentum
                </p>
                <h1
                  className="font-[Georgia,'Times New Roman',serif] text-[3.9rem] leading-[0.88] tracking-[-0.06em] sm:text-[5.4rem] lg:text-[7.1rem]"
                  style={{ color: cream }}
                >
                  <span className="block">One</span>
                  <span className="block italic" style={{ color: coral }}>
                    continuous
                  </span>
                  <span className="xv-outline-text block">workspace.</span>
                </h1>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-8 max-w-[620px] text-balance text-[18px] font-light leading-[1.9] text-[#d0c6b3]">
                Switch between Claude, GPT-4o, Gemini without losing a single byte of context, memory, or momentum.
              </p>
            </Reveal>

            <Reveal delay={170}>
              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium text-white shadow-[0_16px_48px_rgba(201,100,66,0.35)] transition hover:-translate-y-0.5"
                  href="/chat"
                  style={{ backgroundColor: coral }}
                >
                  Enter Xeivora
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[#f0ead81a] bg-white/[0.02] px-6 text-[15px] font-medium text-[#f0ead8] transition hover:border-[#f0ead833] hover:bg-white/[0.04]"
                  href="#how-it-works"
                >
                  See how it works
                </Link>
              </div>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-16 grid gap-px overflow-hidden rounded-[28px] border border-[#f0ead818] bg-[#f0ead80a] shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:grid-cols-3">
                {heroPillars.map((item) => (
                  <div className="bg-[#14100d]/92 px-6 py-5" key={item.label}>
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#b8ae9b]">{item.label}</div>
                    <div className="mt-3 text-[15px] font-light leading-7 text-[#f0ead8]">{item.value}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="relative border-y border-[#f0ead812] bg-[#120e0b]/92 py-4">
          <div className="overflow-hidden">
            <div className="xv-ticker-track flex min-w-max items-center gap-12 px-6">
              {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
                <div className="flex items-center gap-3" key={`${item}-${index}`}>
                  <span
                    className={cn(
                      "text-[13px] font-medium uppercase tracking-[0.22em]",
                      index % 2 === 0 ? "text-[#c96442]" : "text-[#b8ae9b]"
                    )}
                  >
                    {item}
                  </span>
                  <span className="text-[#6a5c4f]">·</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12">
          <section className="mx-auto max-w-[1180px]">
            <div className="grid gap-px overflow-hidden rounded-[30px] border border-[#f0ead814] bg-[#f0ead809] md:grid-cols-4">
              {stats.map((stat) => (
                <div className="bg-[#15110e] px-6 py-8 text-center" key={stat.label}>
                  <div className="font-[Georgia,'Times New Roman',serif] text-[3rem] leading-none tracking-[-0.06em]" style={{ color: coral }}>
                    {stat.value}
                  </div>
                  <div className="mt-3 text-[13px] uppercase tracking-[0.22em] text-[#b8ae9b]">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>
        </RevealSection>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12" id="demo">
          <section className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div>
              <div className="mb-5 text-[12px] font-medium uppercase tracking-[0.24em] text-[#c9b8a4]">
                Continuity demo
              </div>
              <h2 className="font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.02] tracking-[-0.05em] text-[#f0ead8] sm:text-[3.5rem]">
                Context never dies
              </h2>
              <p className="mt-6 max-w-[520px] text-[17px] font-light leading-8 text-[#cfc5b1]">
                Xeivora tracks the shape of the work, preserves the state of the conversation, and continues the exact
                same thread when one model reaches a boundary. No reset. No copy-paste. No re-explaining the task.
              </p>
              <Link
                className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-[#c9644266] px-6 text-[15px] font-medium text-[#f0ead8] transition hover:bg-[#c9644214]"
                href="/chat"
              >
                Watch continuity in action
              </Link>
            </div>

            <TerminalWindow />
          </section>
        </RevealSection>

        <RevealSection className="px-6 py-20 sm:px-8 lg:px-12" id="how-it-works">
          <section className="mx-auto max-w-[1180px]">
            <div className="mb-12 max-w-[700px]">
              <div className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#c9b8a4]">How it works</div>
              <h2 className="mt-4 font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.04] tracking-[-0.05em] text-[#f0ead8] sm:text-[3.5rem]">
                The workspace that protects momentum
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
              <div className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#c9b8a4]">Models</div>
              <h2 className="mt-4 font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.04] tracking-[-0.05em] text-[#f0ead8] sm:text-[3.5rem]">
                Every model. One brain.
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
              <div className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#c9b8a4]">Features</div>
              <h2 className="mt-4 font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.04] tracking-[-0.05em] text-[#f0ead8] sm:text-[3.5rem]">
                Built to keep work alive
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
              <div className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#c9b8a4]">Pricing</div>
              <h2 className="mt-4 font-[Georgia,'Times New Roman',serif] text-[3rem] leading-[1.04] tracking-[-0.05em] text-[#f0ead8] sm:text-[3.5rem]">
                Start free. Scale without losing continuity.
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
          <section className="relative mx-auto overflow-hidden rounded-[36px] border border-[#f0ead812] bg-[#15110e] px-6 py-16 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:px-10">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-[Georgia,'Times New Roman',serif] text-[5rem] leading-none tracking-[-0.08em] text-white/[0.03] sm:text-[9rem] lg:text-[13rem]">
                Xeivora
              </span>
            </div>

            <div className="relative z-10 mx-auto max-w-[760px] text-center">
              <div className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#c9b8a4]">Ready to enter</div>
              <h2 className="mt-5 font-[Georgia,'Times New Roman',serif] text-[3.1rem] leading-[1.02] tracking-[-0.06em] text-[#f0ead8] sm:text-[4rem]">
                Stop starting over.
              </h2>
              <p className="mt-3 text-[1.8rem] italic leading-tight" style={{ color: coral }}>
                Never lose context.
              </p>
              <p className="mt-2 text-[1.35rem] text-[#f0ead8]">Never restart.</p>
              <p className="mx-auto mt-6 max-w-[620px] text-[17px] font-light leading-8 text-[#cfc5b1]">
                Bring your thinking, files, and workflows into one environment that remembers what matters and keeps
                moving when the model changes.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium text-white shadow-[0_16px_48px_rgba(201,100,66,0.35)] transition hover:-translate-y-0.5"
                  href="/signup"
                  style={{ backgroundColor: coral }}
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[#f0ead81a] bg-white/[0.02] px-6 text-[15px] font-medium text-[#f0ead8] transition hover:border-[#f0ead833] hover:bg-white/[0.04]"
                  href="/login"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </section>
        </RevealSection>
      </main>

      <footer className="relative z-10 border-t border-[#f0ead812] px-6 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 text-[13px] text-[#c9b8a4] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <XeivoraWordmark />
            <span>Continuity · Memory · Momentum</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            {footerLinks.map((link) => (
              <Link className="transition hover:text-[#f0ead8]" href={link.href} key={link.label}>
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
          scrolled ? "border-b border-[#f0ead812] bg-[#120f0d]/74 backdrop-blur-2xl" : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6 sm:px-8 lg:px-12">
          <Link className="shrink-0" href="#top">
            <XeivoraWordmark />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((item) => (
              <Link
                className="text-[14px] font-medium text-[#d9ceb9] transition hover:text-[#f0ead8]"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              aria-label="Dark mode active"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f0ead81a] bg-white/[0.02] text-[#f0ead8] transition hover:border-[#f0ead833] hover:bg-white/[0.04]"
              type="button"
            >
              <Moon className="h-4 w-4" />
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#f0ead81a] bg-white/[0.02] px-5 text-[14px] font-medium text-[#f0ead8] transition hover:border-[#f0ead833] hover:bg-white/[0.04]"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-[14px] font-medium text-white shadow-[0_16px_40px_rgba(201,100,66,0.35)] transition hover:-translate-y-0.5"
              href="/signup"
              style={{ backgroundColor: coral }}
            >
              Get started
            </Link>
          </div>

          <button
            aria-label="Open navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f0ead81a] bg-white/[0.02] text-[#f0ead8] lg:hidden"
            onClick={() => onMobileOpenChange(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <Sheet onOpenChange={onMobileOpenChange} open={mobileOpen}>
        <SheetContent className="border-[#f0ead812] bg-[#110e0b] p-0" side="right">
          <div className="flex h-full flex-col px-5 py-6">
            <XeivoraWordmark />
            <div className="mt-10 grid gap-2">
              {navLinks.map((item) => (
                <Link
                  className="rounded-2xl border border-transparent px-4 py-3 text-[14px] font-medium text-[#d9ceb9] transition hover:border-[#f0ead812] hover:bg-white/[0.03] hover:text-[#f0ead8]"
                  href={item.href}
                  key={item.label}
                  onClick={() => onMobileOpenChange(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto grid gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#f0ead81a] bg-white/[0.02] px-5 text-[14px] font-medium text-[#f0ead8]"
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
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f0ead81a] bg-white/[0.02]">
        <X className="h-4 w-4" style={{ color: coral }} />
      </div>
      <div className="text-[24px] font-medium tracking-[-0.05em] text-[#f0ead8]">
        Xei<span className="italic" style={{ color: coral }}>vora</span>
      </div>
    </div>
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
      alpha: Math.random() * 0.26 + 0.08,
      speedX: (Math.random() - 0.5) * 0.00035,
      speedY: (Math.random() - 0.5) * 0.00028
    }));

    function resize() {
      width = canvasElement.clientWidth;
      height = canvasElement.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvasElement.width = width * ratio;
      canvasElement.height = height * ratio;
      drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw() {
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

        drawingContext.beginPath();
        drawingContext.fillStyle = `rgba(201, 100, 66, ${particle.alpha})`;
        drawingContext.arc(px, py, particle.radius, 0, Math.PI * 2);
        drawingContext.fill();

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const nx = next.x * width;
          const ny = next.y * height;
          const distance = Math.hypot(px - nx, py - ny);

          if (distance < 120) {
            drawingContext.beginPath();
            drawingContext.strokeStyle = `rgba(240, 234, 216, ${0.06 - distance / 2400})`;
            drawingContext.lineWidth = 0.6;
            drawingContext.moveTo(px, py);
            drawingContext.lineTo(nx, ny);
            drawingContext.stroke();
          }
        }
      });

      raf = window.requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas className="pointer-events-none fixed inset-0 z-0 opacity-70" ref={canvasRef} />;
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
          "pointer-events-none fixed left-0 top-0 z-[70] hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c96442] transition-opacity duration-300 lg:block",
          visible ? "opacity-100" : "opacity-0"
        )}
        ref={cursorRef}
      />
      <div
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[69] hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c9644266] bg-[#c9644208] transition-opacity duration-300 lg:block",
          visible ? "opacity-100" : "opacity-0"
        )}
        ref={ringRef}
      />
    </>
  );
}

function TerminalWindow() {
  return (
    <div className="overflow-hidden rounded-[30px] border border-[#f0ead814] bg-[#11100d] shadow-[0_28px_120px_rgba(0,0,0,0.36)]">
      <div className="flex items-center gap-2 border-b border-[#f0ead810] px-5 py-4">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>

      <div className="space-y-3 px-5 py-6 font-mono text-[14px] leading-7 text-[#f0ead8]">
        <div>
          <span className="text-[#8b7f71]">$</span> xvr session --model claude-3.5
        </div>
        <div className="text-[#d7ceb8]">→ Session initialized</div>
        <div className="text-[#d7ceb8]">→ Memory layer active</div>
        <div className="text-[#ffbe85]">⚠ Token limit: 199k / 200k</div>
        <div className="text-[#ffbe85]">⚠ Initiating context transfer...</div>
        <div className="text-[#c96442]">⇄ claude-3.5 → gpt-4o</div>
        <div className="text-[#9fe3c1]">✓ Context compressed and restored</div>
        <div className="text-[#d7ceb8]">
          gpt-4o: Continuing...
          <span className="xv-terminal-cursor ml-1 inline-block text-[#c96442]">|</span>
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
    <div className="group relative overflow-hidden rounded-[28px] border border-[#f0ead812] bg-[#14110d] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
      <span className="absolute left-0 top-0 h-[2px] w-full origin-left scale-x-0 bg-[#c96442] transition-transform duration-500 group-hover:scale-x-100" />
      <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#b8ae9b]">{number}</div>
      <h3 className="mt-5 font-[Georgia,'Times New Roman',serif] text-[1.8rem] tracking-[-0.04em] text-[#f0ead8]">
        {title}
      </h3>
      <p className="mt-4 text-[15px] font-light leading-7 text-[#cfc5b1]">{detail}</p>
    </div>
  );
}

function ModelCard({
  card
}: {
  card: (typeof modelCards)[number];
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-[#f0ead812] bg-[#14110d] p-6 transition hover:border-[#c9644233] hover:shadow-[0_20px_80px_rgba(201,100,66,0.12)]">
      <div className="pointer-events-none absolute right-5 top-4 font-[Georgia,'Times New Roman',serif] text-[5rem] leading-none tracking-[-0.08em] text-white/[0.04]">
        {card.letter}
      </div>
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[#b8ae9b]">
          <span className="xv-status-pulse h-2 w-2 rounded-full bg-[#22c55e]" />
          {card.status}
        </div>
        <h3 className="mt-5 font-[Georgia,'Times New Roman',serif] text-[2rem] tracking-[-0.05em] text-[#f0ead8]">
          {card.title}
        </h3>
        <p className="mt-4 text-[15px] font-light leading-7 text-[#cfc5b1]">{card.detail}</p>
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
    <div className="group relative overflow-hidden rounded-[28px] border border-[#f0ead812] bg-[#14110d] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.18)]">
      <span className="absolute left-0 top-0 h-full w-[3px] origin-bottom scale-y-0 bg-[#c96442] transition-transform duration-400 group-hover:scale-y-100" />
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c9644212] text-[#c96442]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-[Georgia,'Times New Roman',serif] text-[1.9rem] tracking-[-0.05em] text-[#f0ead8]">
        {title}
      </h3>
      <p className="mt-4 text-[15px] font-light leading-7 text-[#cfc5b1]">{detail}</p>
    </div>
  );
}

function PricingCard({
  tier
}: {
  tier: (typeof pricingTiers)[number];
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[30px] border border-[#f0ead812] bg-[#14110d] p-7 shadow-[0_22px_90px_rgba(0,0,0,0.2)]",
        tier.featured && "border-[#c964423d] shadow-[0_26px_110px_rgba(201,100,66,0.14)]"
      )}
    >
      {tier.featured ? <span className="absolute inset-x-0 top-0 h-[3px] bg-[#c96442]" /> : null}
      <div className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#b8ae9b]">{tier.kicker}</div>
      <h3 className="mt-4 font-[Georgia,'Times New Roman',serif] text-[2rem] tracking-[-0.05em] text-[#f0ead8]">{tier.name}</h3>
      <div className="mt-8 flex items-end gap-2">
        <span className="font-[Georgia,'Times New Roman',serif] text-[3.4rem] leading-none tracking-[-0.07em]" style={{ color: coral }}>
          {tier.price}
        </span>
        <span className="pb-2 text-[14px] text-[#b8ae9b]">{tier.period}</span>
      </div>
      <div className="mt-8 space-y-3">
        {tier.features.map((feature) => (
          <div className="flex items-start gap-3 text-[14px] font-light leading-7 text-[#d3c9b6]" key={feature}>
            <Check className="mt-1 h-4 w-4 shrink-0 text-[#c96442]" />
            <span>{feature.replace(/^—\s*/, "")}</span>
          </div>
        ))}
      </div>
      <Link
        className={cn(
          "mt-9 inline-flex h-11 w-full items-center justify-center rounded-full border px-5 text-[14px] font-medium transition",
          tier.featured
            ? "border-transparent text-white shadow-[0_14px_40px_rgba(201,100,66,0.32)] hover:-translate-y-0.5"
            : "border-[#f0ead81a] bg-white/[0.02] text-[#f0ead8] hover:border-[#f0ead833] hover:bg-white/[0.04]"
        )}
        href="/signup"
        style={tier.featured ? { backgroundColor: coral } : undefined}
      >
        {tier.cta}
      </Link>
    </div>
  );
}
