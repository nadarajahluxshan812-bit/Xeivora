"use client";

import { motion } from "framer-motion";

import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceProgressBar,
  WorkspaceSectionTitle,
  WorkspaceStatCard
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import type { OrbitOverview } from "@/lib/types";
import { useOrbitOverview } from "@/lib/use-orbit-overview";

export function WorkflowsShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const { overview, connectionState } = useOrbitOverview();

  if (!overview) {
    return <WorkspaceLoading viewer={viewer} />;
  }

  return (
    <WorkspacePageShell statusLabel={connectionState} viewer={viewer}>
      <div className="space-y-10">
        <WorkspacePageHero
          description="Design multi-step orchestration paths, route prompts across models, and keep continuity alive even when providers switch under load."
          eyebrow="Workflow control"
          title="Visual orchestration builder"
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceStatCard label="LIVE WORKFLOWS" value={`${overview.workflows.length}`} />
          <WorkspaceStatCard label="AUTOMATIONS" value={`${overview.summary.automations}`} />
          <WorkspaceStatCard label="QUEUE DEPTH" value={`${overview.summary.queueDepth}`} />
          <WorkspaceStatCard label="MODEL SWITCHES" value={`${overview.summary.modelSwitches}`} />
        </div>

        <div className="grid gap-10 2xl:grid-cols-[1.1fr_.9fr]">
          <WorkflowCanvas overview={overview} />

          <WorkspaceCard>
            <WorkspaceSectionTitle>Live execution feed</WorkspaceSectionTitle>
            <div className="mt-6 space-y-3">
              {overview.activityLogs.map((log, index) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-4"
                  initial={{ opacity: 0, y: 10 }}
                  key={log.id}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--site-subtle)]">
                    <span>{log.actor}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--site-subtle)]">{log.message}</p>
                </motion.div>
              ))}
            </div>
          </WorkspaceCard>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {overview.workflows.map((workflow) => (
            <WorkspaceCard className="p-5" key={workflow.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-medium text-[var(--site-text)]">{workflow.name}</div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--site-subtle)]">
                    {workflow.trigger}
                  </div>
                </div>
                <WorkspaceBadge tone={workflow.status === "Live" ? "live" : workflow.status === "Optimizing" ? "learning" : "standby"}>
                  {workflow.status}
                </WorkspaceBadge>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--site-subtle)]">{workflow.description}</p>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-[var(--site-subtle)]">
                    <span>Success rate</span>
                    <span>{workflow.successRate.toFixed(1)}%</span>
                  </div>
                  <WorkspaceProgressBar value={workflow.successRate} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Latency" value={`${workflow.latencyMs}ms`} />
                  <Metric label="Tools" value={`${workflow.tools.length}`} />
                </div>
              </div>
            </WorkspaceCard>
          ))}
        </div>
      </div>
    </WorkspacePageShell>
  );
}

function WorkflowCanvas({ overview }: { overview: OrbitOverview }) {
  return (
    <WorkspaceCard className="p-6">
      <WorkspaceSectionTitle>Builder canvas</WorkspaceSectionTitle>
      <div className="mt-6 grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-3">
          {overview.builder.palette.map((item) => (
            <div
              className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4 py-3 text-sm text-[var(--site-muted)] transition-colors hover:border-[var(--site-accent)] hover:text-[var(--site-text)]"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="relative min-h-[460px] overflow-hidden rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-bg)] p-5">
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
                <path
                  d={`M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`}
                  key={`${connection.from}-${connection.to}`}
                  opacity="0.5"
                  stroke="var(--site-accent)"
                  strokeWidth="0.55"
                />
              );
            })}
          </svg>

          {overview.builder.nodes.map((node, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className={nodeClassName(node.kind)}
              initial={{ opacity: 0, y: 10 }}
              key={node.id}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              transition={{ delay: index * 0.04 }}
            >
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--site-subtle)]">{node.kind}</div>
              <div className="mt-2 text-sm font-medium text-[var(--site-text)]">{node.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </WorkspaceCard>
  );
}

function nodeClassName(kind: string) {
  const base =
    "absolute w-36 rounded-[8px] bg-[var(--site-card)] px-4 py-3 backdrop-blur-xl";
  switch (kind.toUpperCase()) {
    case "TRIGGER":
      return `${base} border border-[color:var(--site-border-strong)]`;
    case "CORE":
      return `${base} border border-[color:var(--site-accent)]`;
    case "MODEL":
      return `${base} border border-[color:var(--site-border)]`;
    case "STATE":
      return `${base} border border-[color:var(--site-border)]`;
    case "HUMAN":
      return `${base} border border-[color:var(--site-border)]`;
    default:
      return `${base} border border-[color:var(--site-border)]`;
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--site-subtle)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[var(--site-text)]">{value}</div>
    </div>
  );
}

function WorkspaceLoading({ viewer = null }: { viewer?: AuthUser | null }) {
  return (
    <WorkspacePageShell statusLabel="Connecting" viewer={viewer}>
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)]" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-28 animate-pulse rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)]" key={index} />
          ))}
        </div>
        <div className="grid gap-5 2xl:grid-cols-[1.1fr_.9fr]">
          <div className="h-[520px] animate-pulse rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)]" />
          <div className="h-[520px] animate-pulse rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)]" />
        </div>
      </div>
    </WorkspacePageShell>
  );
}
