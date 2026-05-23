import Link from "next/link";

import { MarketingCard, MarketingHero, MarketingPageShell } from "@/components/marketing/marketing-shell";

const features = [
  ["AI orchestration engine", "Receives a prompt, loads memory, detects intent, plans the workflow, selects providers, executes steps, and saves checkpoints."],
  ["AI Continuity Engine", "Detects token limits, rate limits, context limits, API errors, timeouts, and incomplete responses, then continues with a fallback provider."],
  ["Workflow memory", "Persists conversation memory, user preferences, project notes, provider history, reusable context, and coding state checkpoints."],
  ["Trace visibility", "Shows prompt intake, intent detection, provider selection, tools used, memory loaded, checkpoint saved, fallback events, and final response generation."]
];

export default function ProductPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Product"
        title="The continuity layer for AI work."
        subtitle="Xeivora turns disconnected AI tools into one intelligent workflow where memory, context, files, and output format stay intact."
      />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 md:grid-cols-2 md:px-6">
        {features.map(([title, body]) => (
          <MarketingCard body={body} key={title} title={title} />
        ))}
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <h2 className="text-3xl font-semibold">Provider failover example</h2>
          <p className="mt-4 max-w-3xl text-slate-600">
            A coding task begins with OpenAI/Codex. If it hits a token limit, Xeivora saves the workflow state,
            compresses context, transfers the task to Claude, preserves the same output format, and continues.
            If Claude fails, Gemini or local simulation can continue.
          </p>
          <Link className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950" href="/chat">
            Open product workspace
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}
