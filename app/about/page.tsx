import { MarketingCard, MarketingHero, MarketingPageShell } from "@/components/marketing/marketing-shell";

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="About Xeivora"
        title="Built for the next era of continuous AI work."
        subtitle="Xeivora exists because AI work increasingly spans many models and tools, but users still need one memory, one workflow, and one reliable thread of progress."
      />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-24 md:grid-cols-3 md:px-6">
        <MarketingCard
          title="Mission"
          body="Make AI workflows durable, portable, and provider-agnostic so work can continue even when one model or tool fails."
        />
        <MarketingCard
          title="Principle"
          body="No context loss. Xeivora preserves the task state, decisions, file context, output style, and workflow history."
        />
        <MarketingCard
          title="Vision"
          body="A central nervous system where AI models, agents, tools, automations, and human approvals operate as one continuous system."
        />
      </section>
    </MarketingPageShell>
  );
}
