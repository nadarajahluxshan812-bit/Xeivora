import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  AudioLines,
  Bot,
  Brain,
  BriefcaseBusiness,
  ChartColumnBig,
  Check,
  ChevronDown,
  Code2,
  Cog,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  ImageIcon,
  Layers3,
  Lock,
  Megaphone,
  MessageCircleMore,
  Mic,
  MoonStar,
  Network,
  Plus,
  Rocket,
  Shield,
  Sparkles,
  Users,
  Workflow,
  Wrench,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { OrbitLogo } from "@/components/orbit-logo";
import UpgradeButton from "@/components/payments/UpgradeButton";
import type {
  MarketingIconKey,
  MarketingPricingPlan,
  MarketingResourceCard
} from "@/lib/marketing-site-data";
import { cn } from "@/lib/utils";

const iconMap = {
  messages: MessageCircleMore,
  brain: Brain,
  code: Code2,
  globe: Globe,
  shield: Shield,
  users: Users,
  file: FileText,
  rocket: Rocket,
  layers: Layers3,
  zap: Zap,
  lock: Lock,
  bot: Bot,
  knowledge: Network,
  workflow: Workflow,
  integrations: Wrench,
  spark: Sparkles,
  chart: ChartColumnBig,
  image: ImageIcon,
  briefcase: BriefcaseBusiness,
  heart: Heart,
  graduation: GraduationCap,
  megaphone: Megaphone,
  cog: Cog
} as const;

export function MarketingBrand({ className = "" }: { className?: string }) {
  return (
    <OrbitLogo className={className} iconSize={32} nameClassName="text-[19px] font-semibold tracking-[-0.03em]" showTagline={false} />
  );
}

export function NavbarActionButton({
  children,
  href,
  primary = false
}: {
  children: ReactNode;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition",
        primary
          ? "bg-gradient-to-r from-[#5b34f7] via-[#7c3aed] to-[#cf63ff] text-white shadow-[0_12px_36px_rgba(124,58,237,0.32)] hover:brightness-110"
          : "border border-white/[0.1] bg-white/[0.02] text-white/88 hover:bg-white/[0.05]"
      )}
      href={href}
    >
      {children}
    </Link>
  );
}

export function ThemeButton() {
  return (
    <button
      aria-label="Dark mode active"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.02] text-white/88 transition hover:bg-white/[0.05]"
      type="button"
    >
      <MoonStar className="h-[18px] w-[18px]" />
    </button>
  );
}

export function HeroBadge({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/78 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,#c084fc_0%,#8b5cf6_100%)]">
        <Sparkles className="h-3 w-3 text-white" />
      </span>
      {children}
      <span className="h-2 w-2 rounded-full bg-[#8b5cf6] shadow-[0_0_14px_rgba(139,92,246,0.9)]" />
    </div>
  );
}

export function GradientHeading({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#e9a8ff] bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionTabs<T extends string>({
  items,
  active,
  onChange,
  compact = false
}: {
  items: readonly T[];
  active: T;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.03] p-1.5">
        {items.map((item) => (
          <button
            className={cn(
              "rounded-full px-4 text-sm transition",
              compact ? "py-2" : "py-2.5",
              active === item
                ? "bg-[#221246] text-white shadow-[0_10px_28px_rgba(91,52,247,0.24)]"
                : "text-white/54 hover:text-white"
            )}
            key={item}
            onClick={() => onChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeatureCard({
  title,
  description,
  icon,
  className = ""
}: {
  title: string;
  description: string;
  icon: MarketingIconKey;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[260px] min-h-[92px] rounded-[20px] border border-white/[0.1] bg-[rgba(255,255,255,0.045)] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <IconBubble className="h-11 w-11">{renderMarketingIcon(icon, "h-[18px] w-[18px]")}</IconBubble>
        <div className="text-left">
          <h3 className="text-[1rem] font-semibold tracking-[-0.02em] text-white">{title}</h3>
          <p className="mt-1.5 text-sm leading-[1.35rem] text-white/58">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon: MarketingIconKey;
}) {
  return (
    <article className="rounded-[20px] border border-white/[0.1] bg-[rgba(255,255,255,0.035)] p-6 shadow-[0_16px_70px_rgba(0,0,0,0.26)] transition hover:border-[#8b5cf6]/32 hover:bg-[rgba(255,255,255,0.045)]">
      <IconBubble className="h-12 w-12">{renderMarketingIcon(icon, "h-5 w-5")}</IconBubble>
      <h3 className="mt-5 text-[1.14rem] font-semibold tracking-[-0.02em] text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/56">{description}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/78">
        Learn more
        <ArrowRight className="h-4 w-4" />
      </div>
    </article>
  );
}

export function CapabilityCard({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon: MarketingIconKey;
}) {
  return (
    <article className="rounded-[20px] border border-white/[0.1] bg-[rgba(255,255,255,0.035)] px-5 py-4 shadow-[0_16px_60px_rgba(0,0,0,0.2)]">
      <div className="flex items-start gap-4">
        <IconBubble className="h-10 w-10 rounded-[14px]">{renderMarketingIcon(icon, "h-[18px] w-[18px]")}</IconBubble>
        <div className="text-left">
          <h3 className="text-[1rem] font-semibold tracking-[-0.02em] text-white">{title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-white/52">{description}</p>
        </div>
      </div>
    </article>
  );
}

export function SolutionCard({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon: MarketingIconKey;
}) {
  return (
    <article className="rounded-[20px] border border-white/[0.1] bg-[rgba(255,255,255,0.035)] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.2)] transition hover:border-[#8b5cf6]/30">
      <IconBubble className="h-11 w-11">{renderMarketingIcon(icon, "h-[18px] w-[18px]")}</IconBubble>
      <h3 className="mt-5 text-[1.02rem] font-semibold tracking-[-0.02em] text-white">{title}</h3>
      <p className="mt-2.5 text-sm leading-6 text-white/52">{description}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/78">
        Learn more
        <ArrowRight className="h-4 w-4" />
      </div>
    </article>
  );
}

export function ResourceCard({
  title,
  description,
  label,
  art
}: {
  title: string;
  description: string;
  label: string;
  art: MarketingResourceCard["art"];
}) {
  return (
    <article className="overflow-hidden rounded-[20px] border border-white/[0.1] bg-[rgba(255,255,255,0.035)] shadow-[0_18px_70px_rgba(0,0,0,0.22)] transition hover:border-[#8b5cf6]/28">
      <div className="p-4">
        <ResourceArt art={art} />
      </div>
      <div className="px-5 pb-5">
        <span className="inline-flex rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/68">
          {label}
        </span>
        <h3 className="mt-4 text-[1.1rem] font-semibold tracking-[-0.02em] text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/54">{description}</p>
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/78">
          Read more
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}

export function PricingCard({
  plan,
  billing
}: {
  plan: MarketingPricingPlan;
  billing: "monthly" | "yearly";
}) {
  const price = billing === "monthly" ? plan.monthly : plan.yearlyMonthlyEquivalent;
  const isCreditsPlan = plan.name === "Starter Credits";
  const isStripeProPlan = plan.name === "Pro";

  return (
    <article
      className={cn(
        "relative rounded-[20px] border bg-[rgba(255,255,255,0.035)] p-7 shadow-[0_18px_80px_rgba(0,0,0,0.24)]",
        plan.highlight
          ? "border-[#8b5cf6] shadow-[0_0_0_1px_rgba(139,92,246,0.16),0_24px_100px_rgba(76,29,149,0.34)]"
          : "border-white/[0.1]"
      )}
    >
      {plan.badge ? (
        <span className="absolute right-6 top-6 rounded-full border border-[#c084fc]/30 bg-[#28124d] px-3 py-1 text-[11px] font-medium text-white/84">
          {plan.badge}
        </span>
      ) : null}

      <h3 className="text-[2rem] font-semibold tracking-[-0.04em] text-white">{plan.name}</h3>
      <p className="mt-3 max-w-[17rem] text-sm leading-6 text-white/54">{plan.description}</p>

      <div className="mt-8">
        {typeof price === "number" ? (
          <div className="flex items-end gap-2">
            <span className="text-[3rem] font-semibold leading-none tracking-[-0.05em] text-white">£{price}</span>
            <span className="pb-1 text-sm text-white/54">{isCreditsPlan ? "one-time" : "/month"}</span>
          </div>
        ) : (
          <div className="text-[2.65rem] font-semibold tracking-[-0.05em] text-white">Custom</div>
        )}
      </div>

      <div className="mt-8 grid gap-4">
        {plan.features.map((feature) => (
          <div className="flex items-start gap-3 text-sm text-white/58" key={feature}>
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-white/72" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {isStripeProPlan ? (
        <UpgradeButton label={plan.cta} planKey="pro" />
      ) : isCreditsPlan ? (
        <UpgradeButton label={plan.cta} planKey="starter_credits" variant="secondary" />
      ) : (
        <Link
          className={cn(
            "mt-9 inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition",
            plan.highlight
              ? "bg-gradient-to-r from-[#5b34f7] via-[#7c3aed] to-[#cf63ff] text-white hover:brightness-110"
              : "border border-white/[0.1] bg-transparent text-white/88 hover:bg-white/[0.05]"
          )}
          href={plan.name === "Enterprise" ? "/contact" : "/chat"}
        >
          {plan.cta}
        </Link>
      )}
    </article>
  );
}

export function TrustedLogos({ logos }: { logos: readonly string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[1.05rem] font-semibold tracking-[-0.03em] text-white/80 sm:gap-x-10 sm:text-[1.55rem]">
      {logos.map((logo) => (
        <span className="text-base sm:text-[1.85rem]" key={logo}>
          {logo}
        </span>
      ))}
    </div>
  );
}

export function PromptBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative z-10 mx-auto flex h-[72px] w-full max-w-[720px] items-center rounded-full border border-white/[0.16] bg-[#242428] px-[18px] shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl",
        className
      )}
    >
      <div className="flex w-full items-center gap-3">
        <button
          aria-label="Add prompt context"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-black/18 text-white/88"
          type="button"
        >
          <Plus className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-left text-[18px] text-white/56">Ask Xeivora anything...</div>
        <div className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm text-white/82 sm:inline-flex">
          Instant
          <ChevronDown className="h-4 w-4 text-white/46" />
        </div>
        <button
          aria-label="Voice input"
          className="hidden h-10 w-10 items-center justify-center rounded-full text-white/82 transition hover:bg-white/[0.06] sm:inline-flex"
          type="button"
        >
          <Mic className="h-[18px] w-[18px]" />
        </button>
        <button
          aria-label="Start voice mode"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.28)]"
          type="button"
        >
          <AudioLines className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function renderMarketingIcon(icon: MarketingIconKey, className = "h-5 w-5") {
  const Icon = iconMap[icon];
  return <Icon className={className} />;
}

function IconBubble({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#26124d] via-[#5b34f7]/82 to-[#8b5cf6] text-white shadow-[0_0_26px_rgba(124,58,237,0.25)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function ResourceArt({ art }: { art: MarketingResourceCard["art"] }) {
  return (
    <div className="relative h-[188px] overflow-hidden rounded-[16px] border border-white/[0.06] bg-[#0a0a12]">
      {art === "planet" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.96),transparent_8%),linear-gradient(135deg,#090b17_10%,#21124c_48%,#7c3aed_100%)]" />
          <div className="absolute -bottom-10 left-[-8%] h-36 w-[116%] rounded-[100%] border-t border-[#d8b4fe]/40 bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.24),transparent_60%)]" />
        </>
      ) : null}
      {art === "panel" ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0b0c12_0%,#12131f_100%)]" />
          <div className="absolute left-5 right-5 top-5 rounded-[14px] border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="grid gap-2">
              <div className="h-2 rounded-full bg-white/10" />
              <div className="h-2 w-3/4 rounded-full bg-white/8" />
            </div>
          </div>
          <div className="absolute bottom-5 left-5 right-12 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="grid gap-2">
              <div className="h-2 rounded-full bg-white/10" />
              <div className="h-2 w-2/3 rounded-full bg-white/8" />
            </div>
          </div>
        </>
      ) : null}
      {art === "wave" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.22),transparent_40%),linear-gradient(180deg,#090910_0%,#1a113a_45%,#0a0a10_100%)]" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-[#8b5cf6]/40" />
          <div className="absolute inset-x-5 top-1/2 h-20 -translate-y-1/2 rounded-[100%] border border-[#a855f7]/40" />
          <div className="absolute inset-x-16 top-1/2 h-20 -translate-y-1/2 rounded-[100%] border border-[#8b5cf6]/30" />
        </>
      ) : null}
      {art === "city" ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0d0d15_0%,#181229_34%,#4c1d95_100%)]" />
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              className="absolute bottom-0 w-8 rounded-t-[6px] bg-[linear-gradient(180deg,rgba(216,180,254,0.1),rgba(139,92,246,0.8))]"
              key={index}
              style={{
                left: `${10 + index * 9}%`,
                height: `${40 + ((index * 17) % 70)}%`
              }}
            />
          ))}
        </>
      ) : null}
      {art === "mesh" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(192,132,252,0.22),transparent_28%),linear-gradient(160deg,#08090f_0%,#151121_44%,#29124d_100%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
        </>
      ) : null}
      {art === "beams" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(192,132,252,0.34),transparent_32%),linear-gradient(180deg,#0a0b10_0%,#15101f_40%,#31145a_100%)]" />
          <div className="absolute left-[20%] top-0 h-full w-px bg-white/24" />
          <div className="absolute left-[46%] top-0 h-full w-px bg-white/16" />
          <div className="absolute left-[72%] top-0 h-full w-px bg-white/22" />
        </>
      ) : null}
    </div>
  );
}
