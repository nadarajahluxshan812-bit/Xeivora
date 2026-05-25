"use client";

import { motion } from "framer-motion";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import type { AuthUser } from "@/lib/auth-types";
import { useOrbitOverview } from "@/lib/use-orbit-overview";

export function AgentsShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const { overview, connectionState } = useOrbitOverview();

  if (!overview) {
    return <WorkspaceLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WorkspaceSidebar statusLabel={connectionState} viewer={viewer} />
        <div className="space-y-4">
          <section className="glow-shell p-6">
            <div className="section-kicker">Agent runtime</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Specialist agent registry
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/56">
              Monitor specialist AI workers, model load, memory alignment, and execution focus
              across the Xeivora operating layer.
            </p>
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            {overview.agents.map((agent, index) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-5"
                initial={{ opacity: 0, y: 18 }}
                key={agent.name}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-medium text-white">{agent.name}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                      {agent.specialty}
                    </div>
                  </div>
                  <div className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                    {agent.status}
                  </div>
                </div>
                <div className="mt-5 rounded-[1.4rem] border border-white/8 bg-slate-950/74 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/38">Model</div>
                  <div className="mt-2 text-lg font-medium text-white">{agent.model}</div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300"
                      style={{ width: `${agent.load}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-white/58">{agent.load}% active load</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1fr_1fr]">
            <div className="glow-shell p-5">
              <div className="section-kicker">Memory lanes</div>
              <div className="mt-4 space-y-3">
                {overview.memoryLanes.map((lane) => (
                  <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-4" key={lane.name}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-medium text-white">{lane.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/72">
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
            </div>

            <div className="glass-panel p-5">
              <div className="section-kicker">Execution posture</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ["Active agents", `${overview.summary.activeAgents}`],
                  ["Context retention", `${overview.summary.contextRetention.toFixed(1)}%`],
                  ["Average latency", `${overview.summary.avgLatencyMs}ms`],
                  ["SLA", `${overview.summary.sla.toFixed(2)}%`]
                ].map(([label, value]) => (
                  <div className="rounded-[1.3rem] border border-white/8 bg-slate-950/74 px-4 py-4" key={label}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">{label}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceLoading() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 md:px-6">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="glass-panel h-[calc(100vh-2rem)] animate-pulse" />
        <div className="space-y-4">
          <div className="glass-panel h-40 animate-pulse" />
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="glass-panel h-64 animate-pulse" />
            <div className="glass-panel h-64 animate-pulse" />
            <div className="glass-panel h-64 animate-pulse" />
          </div>
          <div className="grid gap-4 2xl:grid-cols-2">
            <div className="glass-panel h-80 animate-pulse" />
            <div className="glass-panel h-80 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
