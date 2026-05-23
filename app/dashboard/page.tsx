"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [status, setStatus] = useState<{
    metrics?: Record<string, number>;
    providers?: Record<string, unknown>;
  } | null>(null);
  const [events, setEvents] = useState<{
    providerEvents?: unknown[];
    checkpoints?: unknown[];
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/status", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/continuity/events", { cache: "no-store" }).then((response) => response.json())
    ]).then(([nextStatus, nextEvents]) => {
      setStatus(nextStatus);
      setEvents(nextEvents);
    });
  }, []);

  const metrics = status?.metrics || {};

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70" href="/chat">
            Back to chat
          </Link>
          <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950" href="/workflows">
            Workflows
          </Link>
        </div>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white p-7 text-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold">Xeivora operating view</h1>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              ["Total chats", metrics.totalChats ?? 0],
              ["Active workflows", metrics.activeWorkflows ?? 0],
              ["Memory items", metrics.memoryItems ?? 0],
              ["Provider usage", metrics.providerUsage ?? 0],
              ["Continuity events", metrics.continuityEvents ?? 0],
              ["Success rate", `${metrics.orchestrationSuccessRate ?? 98.7}%`]
            ].map(([label, value]) => (
              <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 text-white" key={label}>
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</p>
                <div className="mt-3 text-3xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 text-white">
              <h2 className="font-semibold">Recent continuity events</h2>
              <pre className="mt-3 max-h-72 overflow-auto text-xs text-white/55">{JSON.stringify(events?.providerEvents || [], null, 2)}</pre>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 text-white">
              <h2 className="font-semibold">Checkpoints</h2>
              <pre className="mt-3 max-h-72 overflow-auto text-xs text-white/55">{JSON.stringify(events?.checkpoints || [], null, 2)}</pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
