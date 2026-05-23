import Link from "next/link";

import { MarketingHero, MarketingPageShell } from "@/components/marketing/marketing-shell";

const plans = [
  ["MVP", "Free local", "Run Xeivora locally with simulation mode, memory, workflows, agents, and provider status."],
  ["Pro", "$29/user", "Bring provider API keys, persistent database storage, advanced continuity traces, and export/import."],
  ["Team", "Custom", "Shared workspaces, governance, audit trails, private tools, and managed provider routing."]
];

export default function PricingPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Pricing"
        title="Start local. Scale into a continuity platform."
        subtitle="The MVP works without provider keys. Add API keys and database storage when you are ready for live orchestration."
      />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-24 md:grid-cols-3 md:px-6">
        {plans.map(([name, price, body]) => (
          <article className="rounded-[1.8rem] border border-white/10 bg-white p-7 text-slate-950" key={name}>
            <h2 className="text-2xl font-semibold">{name}</h2>
            <div className="mt-5 text-4xl font-semibold">{price}</div>
            <p className="mt-5 text-sm leading-7 text-slate-600">{body}</p>
            <Link className="mt-8 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/chat">
              Get started
            </Link>
          </article>
        ))}
      </section>
    </MarketingPageShell>
  );
}
