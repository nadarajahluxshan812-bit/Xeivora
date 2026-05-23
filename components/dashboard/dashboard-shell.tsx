"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { formatClock, formatCompactNumber, formatLatency, formatPercent } from "@/lib/format";
import { useOrbitOverview } from "@/lib/use-orbit-overview";

export function DashboardShell() {
  const { overview, connectionState } = useOrbitOverview();

  if (!overview) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WorkspaceSidebar statusLabel={connectionState} />

        <div className="space-y-4">
          <section className="glow-shell p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-kicker">Realtime dashboard</div>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  OrbitAI workspace command center
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-white/56">
                  Monitor workflow orchestration, memory retention, agent health, and provider
                  routing across the OrbitAI operating system.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72">
                  Last event: {formatClock(overview.timestamp)}
                </div>
                <Link
                  className="rounded-full bg-cyan-300 px-4 py-3 text-sm font-medium text-slate-950 transition hover:-translate-y-0.5"
                  href="/chat"
                >
                  Open OrbitAI Copilot
                </Link>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {[
              ["Tasks routed today", formatCompactNumber(overview.summary.tasksRoutedToday), `${overview.summary.modelSwitches} model switches`],
              ["Active agents", `${overview.summary.activeAgents}`, `${overview.summary.automations} automations live`],
              ["Context retention", formatPercent(overview.summary.contextRetention), `${overview.summary.queueDepth} items in queue`],
              ["Average latency", formatLatency(overview.summary.avgLatencyMs), `${overview.summary.sla.toFixed(2)}% SLA`]
            ].map(([label, value, detail]) => (
              <div className="glass-panel p-5" key={label}>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/36">{label}</div>
                <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
                <div className="mt-2 text-sm text-cyan-100/70">{detail}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1.2fr_.8fr]">
            <section className="glow-shell p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="section-kicker">Workflows</div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Live orchestration map</h2>
                </div>
                <Link
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 transition hover:border-cyan-300/30 hover:text-white"
                  href="/workflows"
                >
                  View workflows
                </Link>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {overview.workflows.map((workflow, index) => (
                  <motion.article
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5"
                    initial={{ opacity: 0, y: 16 }}
                    key={workflow.id}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-medium text-white">{workflow.name}</div>
                        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
                          {workflow.trigger}
                        </div>
                      </div>
                      <div className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                        {workflow.status}
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-white/56">{workflow.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {workflow.tools.map((tool) => (
                        <span
                          className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50"
                          key={tool}
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </motion.article>
                ))}
              </div>
            </section>

            <section className="glass-panel p-5">
              <div className="section-kicker">Activity</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">System events</h2>
              <div className="mt-6 space-y-3">
                {overview.activityLogs.map((log, index) => (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-[1.3rem] border border-white/8 bg-slate-950/72 p-4"
                    initial={{ opacity: 0, x: 18 }}
                    key={log.id}
                    transition={{ delay: index * 0.04 }}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-white/34">
                      <span>{log.actor}</span>
                      <span>{formatClock(log.timestamp)}</span>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-white/58">{log.message}</div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1fr_1fr]">
            <section className="glow-shell p-5">
              <div className="section-kicker">Memory lanes</div>
              <div className="mt-5 space-y-3">
                {overview.memoryLanes.map((lane) => (
                  <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4" key={lane.name}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-medium text-white">{lane.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/72">
                        {lane.items}
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-white/56">{lane.detail}</div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300"
                        style={{ width: `${lane.coverage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel p-5">
              <div className="section-kicker">Integrations</div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {overview.integrations.map((integration) => (
                  <div className="rounded-[1.3rem] border border-white/8 bg-slate-950/72 p-4" key={integration.name}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-medium text-white">{integration.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                        {integration.status}
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-white/56">{integration.usage}</div>
                    <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-cyan-100/72">
                      Avg latency {integration.latency}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 md:px-6">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="glass-panel h-[calc(100vh-2rem)] animate-pulse" />
        <div className="space-y-4">
          <div className="glass-panel h-36 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <div className="glass-panel h-28 animate-pulse" />
            <div className="glass-panel h-28 animate-pulse" />
            <div className="glass-panel h-28 animate-pulse" />
            <div className="glass-panel h-28 animate-pulse" />
          </div>
          <div className="grid gap-4 2xl:grid-cols-[1.2fr_.8fr]">
            <div className="glass-panel h-96 animate-pulse" />
            <div className="glass-panel h-96 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
