"use client";

import { motion } from "framer-motion";

import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceProgressBar,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import { useOrbitOverview } from "@/lib/use-orbit-overview";

export function AgentsShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const { overview, connectionState } = useOrbitOverview();

  if (!overview) {
    return <WorkspaceLoading viewer={viewer} />;
  }

  return (
    <WorkspacePageShell statusLabel={connectionState} viewer={viewer}>
      <div className="space-y-10">
        <WorkspacePageHero
          description="Monitor specialist agents, current model load, memory coverage, and the continuity lanes that keep every objective moving."
          eyebrow="Agent runtime"
          title="Specialist agent registry"
        />

        <div className="grid gap-5 xl:grid-cols-3">
          {overview.agents.map((agent, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 16 }}
              key={agent.name}
              transition={{ delay: index * 0.05 }}
            >
              <WorkspaceCard className="h-full p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-white">{agent.name}</div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.3)]">
                      {agent.specialty}
                    </div>
                  </div>
                  <WorkspaceBadge tone={agent.status === "Live" ? "live" : agent.status === "Learning" ? "learning" : "standby"}>
                    {agent.status}
                  </WorkspaceBadge>
                </div>

                <div className="mt-5 rounded-[8px] border border-[rgba(201,100,66,0.1)] bg-[rgba(255,255,255,0.04)] p-4">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.25)]">MODEL</div>
                  <div className="mt-2 text-lg font-medium text-white">{agent.model}</div>
                </div>

                <div className="mt-5">
                  <WorkspaceProgressBar value={agent.load} />
                  <div className="mt-3 text-xs text-[rgba(255,255,255,0.35)]">{agent.load}% active load</div>
                </div>
              </WorkspaceCard>
            </motion.div>
          ))}
        </div>

        <WorkspaceCard>
          <WorkspaceSectionTitle>Memory lanes</WorkspaceSectionTitle>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {overview.memoryLanes.map((lane) => (
              <div
                className="rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#120e0a] p-5 transition-colors hover:border-[rgba(201,100,66,0.35)]"
                key={lane.name}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-medium text-white">{lane.name}</div>
                    <p className="mt-3 text-sm leading-7 text-[rgba(255,255,255,0.5)]">{lane.detail}</p>
                  </div>
                  <WorkspaceBadge tone="learning">LIVE OBJECTIVE</WorkspaceBadge>
                </div>
                <div className="mt-5">
                  <WorkspaceProgressBar value={lane.coverage} />
                </div>
                <div className="mt-3 text-xs text-[rgba(255,255,255,0.35)]">{lane.items}</div>
              </div>
            ))}
          </div>
        </WorkspaceCard>
      </div>
    </WorkspacePageShell>
  );
}

function WorkspaceLoading({ viewer = null }: { viewer?: AuthUser | null }) {
  return (
    <WorkspacePageShell statusLabel="Connecting" viewer={viewer}>
      <div className="space-y-5">
        <div className="h-36 animate-pulse rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#1a1410]" />
        <div className="grid gap-5 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="h-80 animate-pulse rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#1a1410]" key={index} />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#1a1410]" />
      </div>
    </WorkspacePageShell>
  );
}
