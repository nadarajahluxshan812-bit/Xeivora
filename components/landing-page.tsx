import Link from "next/link";

import { MarketingCard, MarketingPageShell } from "@/components/marketing/marketing-shell";

const sections = [
  {
    title: "The problem",
    body: "AI tools are powerful but disconnected. Users jump between ChatGPT, Codex/OpenAI, Claude, Gemini, APIs, automation tools, and productivity apps while context, files, decisions, and workflow state disappear between handoffs."
  },
  {
    title: "The solution",
    body: "Xeivora acts as the central nervous system for AI workflows: one prompt can route across models, tools, agents, and workflows while preserving memory, context, file state, and the working format."
  },
  {
    title: "AI Continuity Engine",
    body: "If a provider hits a token limit, rate limit, timeout, or API error, Xeivora saves a checkpoint, compresses context, chooses a fallback provider, and continues from the same point."
  }
];

const useCases = [
  "Multi-model coding continuation",
  "Research to final report",
  "Business idea to pitch",
  "Workflow automation planning",
  "Content to campaign assets",
  "Provider failover recovery"
];

export function LandingPage() {
  return (
    <MarketingPageShell>
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:px-6 lg:grid-cols-[1.03fr_.97fr] lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Unified AI Intelligence</p>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-7xl">
            One prompt. Multiple AI systems. Zero context loss.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/64">
            Xeivora connects AI models, tools, agents, and workflows into one continuous intelligent system.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-slate-950" href="/chat">
              Launch workspace
            </Link>
            <Link className="rounded-full border border-white/12 px-6 py-3 text-center text-sm font-semibold text-white/80" href="/product">
              Explore product
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["0%", "target context loss"],
              ["4", "provider chain"],
              ["24/7", "continuity layer"]
            ].map(([value, label]) => (
              <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-950" key={label}>
                <div className="text-3xl font-semibold">{value}</div>
                <div className="mt-2 text-sm text-slate-600">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2.2rem] border border-white/10 bg-white p-5 text-slate-950 shadow-[0_40px_140px_rgba(14,165,233,0.18)]">
          <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/80 p-5 text-white">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/45">
              <span>Continuity run</span>
              <span>active</span>
            </div>
            <div className="mt-7 space-y-4">
              {[
                ["Prompt received", "Task starts in OpenAI/Codex"],
                ["Provider issue detected", "Token limit, rate limit, timeout, or API error"],
                ["Checkpoint saved", "Context, files, progress, and format preserved"],
                ["Fallback continuation", "Claude or Gemini continues the same workflow"],
                ["Unified response", "One stitched final answer for the user"]
              ].map(([title, body], index) => (
                <div className="grid grid-cols-[36px_1fr] gap-4" key={title}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300/12 text-sm text-cyan-100">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-white/52">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-10 md:grid-cols-3 md:px-6">
        {sections.map((section) => (
          <MarketingCard body={section.body} key={section.title} title={section.title} />
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="rounded-[2rem] border border-white/10 bg-white p-8 text-slate-950 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-200/80">How Xeivora works</p>
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {["Detect intent", "Plan workflow", "Route providers", "Preserve continuity"].map((item) => (
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 text-white" key={item}>
                <h3 className="font-semibold">{item}</h3>
                <p className="mt-3 text-sm leading-6 text-white/52">
                  Xeivora keeps the task state alive while models, tools, and agents do their part.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-6 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Use cases</p>
          <h2 className="mt-4 text-4xl font-semibold">Built for real AI workflow continuity.</h2>
          <p className="mt-5 text-white/58">
            The MVP demonstrates unified chat, orchestration routing, persistent memory, provider failover,
            workflow management, and multi-agent structure.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {useCases.map((item) => (
            <div className="rounded-2xl border border-white/10 bg-white p-5 text-sm font-medium text-slate-950" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.08] p-8 text-center md:p-12">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/75">Founder vision</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-semibold">
            Xeivora is designed to become the continuity layer between every AI system a team depends on.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-white/60">
            The goal is not another chatbot. It is a persistent, provider-agnostic intelligence layer
            where work survives model limits, tool switches, and fragmented context.
          </p>
          <Link className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950" href="/chat">
            Try the MVP
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}
