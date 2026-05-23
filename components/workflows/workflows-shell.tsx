"use client";

import { motion } from "framer-motion";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { formatClock, formatPercent } from "@/lib/format";
import type { OrbitOverview } from "@/lib/types";
import { useOrbitOverview } from "@/lib/use-orbit-overview";

export function WorkflowsShell() {
  const { overview, connectionState } = useOrbitOverview();

  if (!overview) {
    return <WorkspaceLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WorkspaceSidebar statusLabel={connectionState} />
        <div className="space-y-4">
          <section className="glow-shell p-6">
            <div className="section-kicker">Workflow control</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Visual orchestration builder
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/56">
              Design multi-step AI automations, route tasks between providers, and track every
              execution branch from one control surface.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {[
                ["Live workflows", `${overview.workflows.length}`],
                ["Automations", `${overview.summary.automations}`],
                ["Queue depth", `${overview.summary.queueDepth}`],
                ["Model switches", `${overview.summary.modelSwitches}`]
              ].map(([label, value]) => (
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4" key={label}>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 2xl:grid-cols-[1.15fr_.85fr]">
            <WorkflowCanvas overview={overview} />
            <div className="glass-panel p-5">
              <div className="section-kicker">Execution log</div>
              <div className="mt-4 space-y-3">
                {overview.activityLogs.map((log, index) => (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-[1.3rem] border border-white/8 bg-slate-950/74 p-4"
                    initial={{ opacity: 0, x: 16 }}
                    key={log.id}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-white/36">
                      <span>{log.actor}</span>
                      <span>{formatClock(log.timestamp)}</span>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-white/58">{log.message}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {overview.workflows.map((workflow) => (
              <div className="glass-panel p-5" key={workflow.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-medium text-white">{workflow.name}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
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
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/52"
                      key={tool}
                    >
                      {tool}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MetricCard label="Success" value={formatPercent(workflow.successRate)} />
                  <MetricCard label="Latency" value={`${workflow.latencyMs}ms`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowCanvas({ overview }: { overview: OrbitOverview }) {
  return (
    <section className="glow-shell p-5">
      <div className="section-kicker">Builder canvas</div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="text-sm font-medium text-white">Palette</div>
          <div className="mt-4 space-y-3">
            {overview.builder.palette.map((item) => (
              <div className="rounded-2xl border border-white/8 bg-slate-950/70 px-4 py-3 text-sm text-white/70" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-[1.8rem] border border-white/8 bg-slate-950/76 p-5">
          <div className="orbital-grid absolute inset-0 opacity-60" />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" fill="none" viewBox="0 0 100 100">
            {overview.builder.connections.map((connection) => {
              const from = overview.builder.nodes.find((node) => node.id === connection.from);
              const to = overview.builder.nodes.find((node) => node.id === connection.to);
              if (!from || !to) {
                return null;
              }

              const startX = from.x + 9;
              const startY = from.y + 6;
              const endX = to.x + 9;
              const endY = to.y + 6;

              return (
                <g key={`${connection.from}-${connection.to}`}>
                  <path
                    d={`M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`}
                    stroke="rgba(103,232,249,0.55)"
                    strokeWidth="0.55"
                  />
                </g>
              );
            })}
          </svg>

          {overview.builder.nodes.map((node, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="absolute w-36 rounded-2xl border border-cyan-300/14 bg-cyan-300/10 px-4 py-3 backdrop-blur-xl"
              initial={{ opacity: 0, y: 14 }}
              key={node.id}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/42">{node.kind}</div>
              <div className="mt-2 text-sm font-medium text-white">{node.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/72 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
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
          <div className="glass-panel h-80 animate-pulse" />
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="glass-panel h-72 animate-pulse" />
            <div className="glass-panel h-72 animate-pulse" />
            <div className="glass-panel h-72 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
