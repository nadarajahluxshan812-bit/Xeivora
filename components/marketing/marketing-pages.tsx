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

export function HomeMarketingPage() {
  return (
    <MarketingSiteShell>
      <section className="relative overflow-hidden pb-20 pt-10 sm:pt-14 lg:pb-28">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="relative text-center">
            <motion.div {...pageReveal}>
              <HeroBadge>Unified AI Intelligence Platform</HeroBadge>
            </motion.div>

            <motion.h1
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.04 }}
              className="mx-auto mt-8 max-w-[760px] text-balance text-[3rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-[4rem] lg:text-[5.6rem]"
            >
              <span className="block">One Intelligence.</span>
              <GradientHeading className="mt-2 block">Infinite Possibilities.</GradientHeading>
            </motion.h1>

            <motion.p
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.08 }}
              className="mx-auto mt-6 max-w-[700px] text-balance text-[17px] leading-8 text-white/62"
            >
              Xeivora unifies the world&apos;s best AI models, memory, tools, and real-world capabilities into a
              single, seamless intelligence layer.
            </motion.p>

            <motion.div
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.12 }}
              className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link
                className="inline-flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-[#5b34f7] via-[#7c3aed] to-[#cf63ff] px-8 text-base font-semibold text-white shadow-[0_18px_48px_rgba(124,58,237,0.3)] transition hover:brightness-110"
                href="/chat"
              >
                Start Chatting
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
              <Link
                className="inline-flex h-14 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.02] px-8 text-base font-semibold text-white/86 transition hover:bg-white/[0.05]"
                href="/products"
              >
                Explore Platform
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </motion.div>

            <div className="relative mt-16 min-h-[520px]">
              <HeroOrbitLines />

              <div className="hidden xl:block">
                <div className="absolute left-0 top-2 z-10 w-[250px] space-y-8">
                  {homeFeatureColumns.left.map((item) => (
                    <FeatureCard description={item.description} icon={item.icon} key={item.title} title={item.title} />
                  ))}
                </div>

                <div className="absolute right-0 top-2 z-10 w-[250px] space-y-8">
                  {homeFeatureColumns.right.map((item) => (
                    <FeatureCard description={item.description} icon={item.icon} key={item.title} title={item.title} />
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-[98px] z-0">
                <HeroGlobe />
              </div>

              <div className="relative z-10 mx-auto max-w-[790px] pt-[230px]">
                <PromptBar />

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
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

              <div className="relative z-10 mt-14 xl:hidden">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[...homeFeatureColumns.left, ...homeFeatureColumns.right].map((item) => (
                    <FeatureCard description={item.description} icon={item.icon} key={item.title} title={item.title} />
                  ))}
                </div>
              </div>
            </div>

            <motion.div
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.16 }}
              className="rounded-[28px] border border-[#8b5cf6]/24 bg-[linear-gradient(180deg,rgba(33,26,53,0.88),rgba(18,18,30,0.88))] p-[1px] shadow-[0_24px_110px_rgba(76,29,149,0.22)]"
            >
              <div className="grid gap-6 rounded-[27px] bg-[rgba(20,18,31,0.88)] px-6 py-6 lg:grid-cols-5 lg:gap-0">
                {homeStats.map((stat, index) => (
                  <div
                    className={`flex items-center gap-4 ${index < homeStats.length - 1 ? "lg:border-r lg:border-white/[0.08] lg:px-5" : "lg:px-5"}`}
                    key={stat.label}
                  >
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2a1550] to-[#4f46e5]/56 text-white">
                      {renderMarketingIcon(stat.icon, "h-5 w-5")}
                    </div>
                    <div className="text-left">
                      <div className="text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white">{stat.value}</div>
                      <div className="mt-1 text-sm text-white/56">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...pageReveal}
              transition={{ ...pageReveal.transition, delay: 0.2 }}
              className="mt-10 text-center"
            >
              <p className="text-sm text-white/58">Trusted by students, professionals, and teams worldwide</p>
              <div className="mt-7">
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
    () => productCards.filter((item) => item.tabs.includes(activeTab)),
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
    () => resourceCards.filter((item) => item.tabs.includes(activeTab)),
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

function HeroGlobe() {
  return (
    <div className="relative mx-auto h-[340px] max-w-[930px]">
      <div className="absolute inset-x-[3%] top-0 h-[278px] rounded-[100%] border border-[#8b5cf6]/20 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.42),transparent_44%),linear-gradient(180deg,rgba(76,29,149,0.16),transparent_80%)] shadow-[0_0_120px_rgba(76,29,149,0.18)]" />
      <div className="absolute inset-x-[10%] top-[38px] h-[236px] rounded-[100%] border-t border-[#d8b4fe]/42 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.16),transparent_64%)]" />
      <div className="absolute inset-x-[19%] top-[66px] h-[176px] rounded-[100%] border-t border-white/[0.08]" />
      <div className="absolute inset-x-[26%] top-[96px] h-[112px] rounded-[100%] bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.12),transparent_64%)]" />
      <div className="absolute left-1/2 top-[40px] h-[220px] w-[600px] -translate-x-1/2 rounded-[100%] opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:38px_38px]" />
    </div>
  );
}

function HeroOrbitLines() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden h-full w-full xl:block"
      preserveAspectRatio="none"
      viewBox="0 0 1180 760"
    >
      <defs>
        <filter id="xeivora-home-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <g fill="none" stroke="rgba(167,139,250,0.68)" strokeWidth="1.4">
        <path d="M250 182C334 220 362 286 362 376" />
        <path d="M362 376H408" />
        <path d="M250 312C332 348 364 418 364 516" />
        <path d="M364 516H418" />
        <path d="M930 182C846 220 818 286 818 376" />
        <path d="M818 376H772" />
        <path d="M930 312C848 348 816 418 816 516" />
        <path d="M816 516H762" />
      </g>

      {[
        [362, 376],
        [364, 516],
        [818, 376],
        [816, 516]
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} fill="rgba(255,255,255,0.92)" filter="url(#xeivora-home-glow)" r="7" />
          <circle cx={x} cy={y} fill="#c084fc" r="2.75" />
        </g>
      ))}
    </svg>
  );
}
