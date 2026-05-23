"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Agent = {
  id: string;
  name: string;
  role: string;
  modelPreference: string;
  description: string;
  status: string;
  sampleTask: string;
  assignedWorkflowType: string;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    void fetch("/api/agents", { cache: "no-store" })
      .then((response) => response.json())
      .then(setAgents);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto max-w-6xl">
        <Link className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70" href="/chat">
          Back to chat
        </Link>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white p-7 text-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Agents</p>
          <h1 className="mt-3 text-4xl font-semibold">Specialist agent registry</h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Default agents for research, coding, writing, business strategy, workflow planning, and continuity recovery.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <article className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 text-white" key={agent.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{agent.name}</h2>
                  <span className="rounded-full border border-cyan-300/20 px-3 py-1 text-xs text-cyan-100">{agent.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{agent.description}</p>
                <div className="mt-5 text-xs uppercase tracking-[0.18em] text-white/40">{agent.modelPreference}</div>
                <p className="mt-3 text-sm text-white/62">{agent.sampleTask}</p>
                <p className="mt-3 text-xs text-cyan-100/70">{agent.assignedWorkflowType}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
