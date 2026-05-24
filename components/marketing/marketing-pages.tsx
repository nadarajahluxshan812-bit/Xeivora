"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Globe, ImageIcon, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  capabilityCards,
  homeFeatureColumns,
  homeStats,
  pricingPlans,
  productCards,
  productTabs,
  resourceCards,
  resourceTabs,
  solutionTabs,
  solutionsByTab,
  trustedLogos
} from "@/lib/marketing-site-data";
import {
  CapabilityCard,
  FeatureCard,
  GradientHeading,
  HeroBadge,
  PricingCard,
  ProductCard,
  PromptBar,
  ResourceCard,
  SectionTabs,
  SolutionCard,
  TrustedLogos,
  renderMarketingIcon
} from "./reference-ui";
import { MarketingSiteShell } from "./site-shell";

const pageReveal = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.34, ease: "easeOut" }
} as const;

function tabsInclude(tabs: readonly string[], activeTab: string) {
  return tabs.includes(activeTab);
}

export function HomeMarketingPage() {
  return (
    <MarketingSiteShell>
      <section className="relative min-h-screen overflow-x-hidden bg-[#030305]">
        <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col items-center px-6 pb-10 pt-[34px] sm:px-10 lg:px-12">
          <div className="relative flex w-full flex-col items-center text-center">
            <motion.div {...pageReveal}>
              <HeroBadge>Unified AI Intelligence Platform</HeroBadge>
            </motion.div>

            <motion.h1
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.04 }}
              className="mx-auto mt-7 max-w-[900px] text-balance text-[3.35rem] font-bold leading-[0.95] tracking-[-0.055em] text-white sm:text-[4.4rem] lg:text-[72px]"
            >
              <span className="block">One Intelligence.</span>
              <GradientHeading className="mt-1 block">Infinite Possibilities.</GradientHeading>
            </motion.h1>

            <motion.p
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.08 }}
              className="mx-auto mt-6 max-w-[680px] text-balance text-[18px] leading-[1.7] text-white/60"
            >
              Xeivora unifies the world&apos;s best AI models, memory, tools, and real-world capabilities into a
              single, seamless intelligence layer.
            </motion.p>

            <motion.div
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.12 }}
              className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                className="inline-flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-[#5b34f7] via-[#7c3aed] to-[#cf63ff] px-8 text-base font-semibold text-white shadow-[0_18px_48px_rgba(124,58,237,0.3)] transition hover:brightness-110"
                href="/chat"
              >
                Start Chatting
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <Link
                className="inline-flex h-14 items-center gap-2 rounded-full border border-white/[0.1] bg-[#0f1013] px-8 text-base font-semibold text-white/86 transition hover:bg-white/[0.05]"
                href="/products"
              >
                Explore Platform
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </motion.div>

            <div className="relative mt-10 h-auto w-full max-w-[1360px] xl:-mt-[92px] xl:h-[580px]">
              <div className="hidden h-full w-full xl:block">
                <HomeStageConnectors />

                <div className="absolute left-0 top-[-132px] z-10 flex flex-col items-start gap-6">
                  {homeFeatureColumns.left.map((item) => (
                    <FeatureCard description={item.description} icon={item.icon} key={item.title} title={item.title} />
                  ))}
                </div>

                <div className="relative z-10 flex h-full flex-col items-center pt-[188px]">
                  <HomeOrbitBackground />
                  <div className="relative z-10 flex flex-col items-center">
                    <PromptBar />

                    <div className="mt-[18px] flex flex-wrap items-center justify-center gap-3">
                      {[
                        { label: "Create an image", icon: ImageIcon },
                        { label: "Write or edit", icon: Sparkles },
                        { label: "Look something up", icon: Globe }
                      ].map((item) => (
                        <button
                          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.1] bg-transparent px-5 text-sm text-white/76 transition hover:bg-white/[0.05] hover:text-white"
                          key={item.label}
                          type="button"
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="absolute right-0 top-[-132px] z-10 flex flex-col items-end gap-6">
                  {homeFeatureColumns.right.map((item) => (
                    <FeatureCard description={item.description} icon={item.icon} key={item.title} title={item.title} />
                  ))}
                </div>
              </div>

              <div className="relative z-10 xl:hidden">
                <div className="relative mx-auto flex max-w-[720px] flex-col items-center">
                  <HomeOrbitBackground mobile />
                  <PromptBar className="max-w-full" />
                  <div className="mt-[18px] flex flex-wrap items-center justify-center gap-3">
                    {[
                      { label: "Create an image", icon: ImageIcon },
                      { label: "Write or edit", icon: Sparkles },
                      { label: "Look something up", icon: Globe }
                    ].map((item) => (
                      <button
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.1] bg-transparent px-5 text-sm text-white/76 transition hover:bg-white/[0.05] hover:text-white"
                        key={item.label}
                        type="button"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {[...homeFeatureColumns.left, ...homeFeatureColumns.right].map((item) => (
                    <FeatureCard
                      className="w-full"
                      description={item.description}
                      icon={item.icon}
                      key={item.title}
                      title={item.title}
                    />
                  ))}
                </div>
              </div>
            </div>

            <motion.div
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.16 }}
              className="mt-4 w-full max-w-[1040px] rounded-[24px] border border-[#8b5cf6]/35 bg-[rgba(255,255,255,0.045)] px-5 py-5 shadow-[0_24px_110px_rgba(76,29,149,0.24)] sm:px-7 lg:px-9 xl:-mt-[110px]"
            >
              <div className="grid gap-6 lg:grid-cols-5 lg:gap-0">
                {homeStats.map((stat, index) => (
                  <div
                    className={`flex items-center gap-4 ${index < homeStats.length - 1 ? "lg:border-r lg:border-white/[0.08] lg:pr-5 xl:pr-7" : ""} ${index > 0 ? "lg:pl-5 xl:pl-7" : ""}`}
                    key={stat.label}
                  >
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2a1550] to-[#4f46e5]/56 text-white">
                      {renderMarketingIcon(stat.icon, "h-5 w-5")}
                    </div>
                    <div className="text-left">
                      <div className="text-[1.95rem] font-semibold leading-none tracking-[-0.04em] text-white">{stat.value}</div>
                      <div className="mt-1 text-sm text-white/56">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.2 }}
              className="mt-7 text-center"
            >
              <p className="text-sm text-white/58">Trusted by students, professionals, and teams worldwide</p>
              <div className="mt-6">
                <TrustedLogos logos={trustedLogos} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </MarketingSiteShell>
  );
}

export function ProductsMarketingPage() {
  const [activeTab, setActiveTab] = useState<(typeof productTabs)[number]>("All Products");
  const filteredProducts = useMemo(
    () => productCards.filter((item) => tabsInclude(item.tabs, activeTab)),
    [activeTab]
  );

  return (
    <MarketingSiteShell>
      <PageHero
        badge="Products"
        subtitle="Everything you need to build, scale, and automate with AI."
        title={
          <>
            Powerful products.
            <br />
            One <GradientHeading>unified</GradientHeading> platform.
          </>
        }
      />

      <section className="mx-auto max-w-[1180px] px-4 pb-24 sm:px-6">
        <SectionTabs active={activeTab} items={productTabs} onChange={setActiveTab} />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard description={product.description} icon={product.icon} key={product.title} title={product.title} />
          ))}
        </div>
      </section>
    </MarketingSiteShell>
  );
}

export function CapabilitiesMarketingPage() {
  return (
    <MarketingSiteShell>
      <PageHero
        badge="Capabilities"
        subtitle="A comprehensive suite of AI capabilities to accelerate your work and creativity."
        title={<>Everything Xeivora can do.</>}
      />

      <section className="mx-auto max-w-[1180px] px-4 pb-24 sm:px-6">
        <div className="mx-auto grid max-w-[840px] gap-4 md:grid-cols-2">
          {capabilityCards.map((capability) => (
            <CapabilityCard
              description={capability.description}
              icon={capability.icon}
              key={capability.title}
              title={capability.title}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <CenteredOutlineButton href="/chat">Explore all capabilities</CenteredOutlineButton>
        </div>
      </section>
    </MarketingSiteShell>
  );
}

export function SolutionsMarketingPage() {
  const [activeTab, setActiveTab] = useState<(typeof solutionTabs)[number]>("By Industry");
  const activeCards = solutionsByTab[activeTab];

  return (
    <MarketingSiteShell>
      <PageHero
        badge="Solutions"
        subtitle="Xeivora adapts to your workflow, your data, and your goals."
        title={
          <>
            Built for every <GradientHeading>industry</GradientHeading>
            <br />
            and team.
          </>
        }
      />

      <section className="mx-auto max-w-[1180px] px-4 pb-24 sm:px-6">
        <SectionTabs active={activeTab} items={solutionTabs} onChange={setActiveTab} compact />
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {activeCards.map((item) => (
            <SolutionCard description={item.description} icon={item.icon} key={item.title} title={item.title} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <CenteredOutlineButton href="/resources">View all solutions</CenteredOutlineButton>
        </div>
      </section>
    </MarketingSiteShell>
  );
}

export function ResourcesMarketingPage() {
  const [activeTab, setActiveTab] = useState<(typeof resourceTabs)[number]>("All Resources");
  const filteredResources = useMemo(
    () => resourceCards.filter((item) => tabsInclude(item.tabs, activeTab)),
    [activeTab]
  );

  return (
    <MarketingSiteShell>
      <PageHero
        badge="Resources"
        subtitle="Guides, tutorials, and insights to help you get the most out of Xeivora."
        title={<>Learn, explore, and get inspired.</>}
      />

      <section className="mx-auto max-w-[1180px] px-4 pb-24 sm:px-6">
        <SectionTabs active={activeTab} items={resourceTabs} onChange={setActiveTab} compact />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((resource) => (
            <ResourceCard
              art={resource.art}
              description={resource.description}
              key={resource.title}
              label={resource.label}
              title={resource.title}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <CenteredOutlineButton href="/resources">View all resources</CenteredOutlineButton>
        </div>
      </section>
    </MarketingSiteShell>
  );
}

export function PricingMarketingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <MarketingSiteShell>
      <PageHero
        badge={null}
        subtitle="Choose the plan that fits your needs. Upgrade or downgrade anytime."
        title={
          <>
            Simple pricing. <GradientHeading>Powerful</GradientHeading> platform.
          </>
        }
      />

      <section className="mx-auto max-w-[1180px] px-4 pb-24 sm:px-6">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.03] p-1.5">
            {[
              { label: "Monthly", value: "monthly" },
              { label: "Yearly", value: "yearly" }
            ].map((option) => (
              <button
                className={`rounded-full px-5 py-2 text-sm transition ${
                  billing === option.value ? "bg-[#221246] text-white" : "text-white/54 hover:text-white"
                }`}
                key={option.value}
                onClick={() => setBilling(option.value as "monthly" | "yearly")}
                type="button"
              >
                {option.label}
              </button>
            ))}
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-white/72">
              Save 20%
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-5 xl:grid-cols-4">
          {pricingPlans.map((plan) => (
            <PricingCard billing={billing} key={plan.name} plan={plan} />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-white/42">
          All plans include a 7-day free trial. No credit card required.
        </p>
      </section>
    </MarketingSiteShell>
  );
}

function PageHero({
  badge,
  title,
  subtitle
}: {
  badge: string | null;
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <section className="mx-auto max-w-[1180px] px-4 pb-12 pt-[72px] text-center sm:px-6 lg:pb-14 lg:pt-24">
      {badge ? <HeroBadge>{badge}</HeroBadge> : null}
      <motion.h1
        {...pageReveal}
        className="mx-auto mt-7 max-w-[760px] text-balance text-[3.15rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white lg:text-[56px]"
      >
        {title}
      </motion.h1>
      <motion.p
        {...pageReveal}
        transition={{ ...pageReveal.transition, delay: 0.05 }}
        className="mx-auto mt-5 max-w-[620px] text-balance text-[16px] leading-7 text-white/56"
      >
        {subtitle}
      </motion.p>
    </section>
  );
}

function CenteredOutlineButton({
  children,
  href
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.02] px-6 text-sm font-medium text-white/88 transition hover:bg-white/[0.05]"
      href={href}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function HomeOrbitBackground({ mobile = false }: { mobile?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-[1] -translate-x-1/2 ${mobile ? "bottom-2 h-[300px] w-[680px] max-w-[115%]" : "bottom-[8px] h-[360px] w-[920px]"}`}
    >
      <div className="absolute inset-x-[8%] bottom-0 h-[250px] rounded-[100%] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.34),rgba(124,58,237,0.14)_36%,transparent_72%)] blur-[18px]" />
      <div className="absolute inset-x-[7%] bottom-0 h-[248px] rounded-[100%] border border-[#8b5cf6]/20 bg-[radial-gradient(circle_at_top,rgba(147,51,234,0.12),transparent_54%)]" />
      <div className="absolute inset-x-[13%] bottom-[16px] h-[220px] rounded-[100%] border-t border-[#d8b4fe]/38" />
      <div className="absolute inset-x-[18%] bottom-[28px] h-[188px] rounded-[100%] border-t border-white/[0.1]" />
      <div className="absolute inset-x-[22%] bottom-[42px] h-[150px] rounded-[100%] border-t border-white/[0.08]" />
      <div className="absolute left-1/2 bottom-[44px] h-[170px] w-[520px] -translate-x-1/2 rounded-[100%] opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:34px_34px]" />
      {[
        "left-[15%] bottom-[112px]",
        "left-[28%] bottom-[144px]",
        "right-[28%] bottom-[144px]",
        "right-[15%] bottom-[112px]"
      ].map((position) => (
        <span
          className={`absolute h-3 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(192,132,252,0.95)] ${position}`}
          key={position}
        >
          <span className="absolute inset-[3px] rounded-full bg-[#c084fc]" />
        </span>
      ))}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 860 360"
      >
        <path d="M122 138C188 164 214 196 214 236" fill="none" stroke="rgba(167,139,250,0.75)" strokeWidth="1.2" />
        <path d="M214 236H270" fill="none" stroke="rgba(167,139,250,0.75)" strokeWidth="1.2" />
        <path d="M738 138C672 164 646 196 646 236" fill="none" stroke="rgba(167,139,250,0.75)" strokeWidth="1.2" />
        <path d="M646 236H590" fill="none" stroke="rgba(167,139,250,0.75)" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

function HomeStageConnectors() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2] hidden xl:block"
      preserveAspectRatio="none"
      viewBox="0 0 1360 580"
    >
      <defs>
        <filter id="xeivora-stage-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <g fill="none" stroke="rgba(167,139,250,0.72)" strokeWidth="1.4">
        <path d="M260 164C342 192 374 234 374 304" />
        <path d="M260 272H352" />
        <path d="M260 400H388" />
        <path d="M1100 164C1018 192 986 234 986 304" />
        <path d="M1008 272H1100" />
        <path d="M972 400H1100" />
      </g>

      {[
        [352, 272],
        [388, 400],
        [1008, 272],
        [972, 400]
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} fill="rgba(255,255,255,0.94)" filter="url(#xeivora-stage-glow)" r="7" />
          <circle cx={x} cy={y} fill="#c084fc" r="2.75" />
        </g>
      ))}
    </svg>
  );
}
