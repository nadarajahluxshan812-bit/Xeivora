"use client";

import { CheckCircle2, Clock3, GitBranch, Rocket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  WorkspaceBadge,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";
import { ProjectWorkspaceTabs } from "@/components/workspace/project-workspace-tabs";
import type { AuthUser } from "@/lib/auth-types";
import type { WorkspacePreviewVersion, WorkspaceProject } from "@/lib/chat-types";

type ToolLog = {
  id: string;
  tool: string;
  status: string;
  summary: string;
  createdAt: string;
  payload?: Record<string, unknown>;
};

type TimelineEntry = {
  id: string;
  kind: "tool" | "preview";
  label: string;
  detail: string;
  createdAt: string;
  state: "live" | "approved" | "deployed";
};

function buildTimelineEntries(previews: WorkspacePreviewVersion[], logs: ToolLog[]) {
  const previewEntries: TimelineEntry[] = previews.map((preview) => ({
    id: `preview-${preview.id}`,
    kind: "preview",
    label:
      preview.status === "approved"
        ? `Preview Version ${preview.versionNumber} Approved`
        : preview.status === "deployed"
          ? `Preview Version ${preview.versionNumber} Deployed`
          : preview.title || `Preview Version ${preview.versionNumber}`,
    detail: preview.summary,
    createdAt: preview.updatedAt || preview.createdAt,
    state: preview.status
  }));

  const toolEntries: TimelineEntry[] = logs.map((log) => ({
    id: `tool-${log.id}`,
    kind: "tool",
    label: log.summary,
    detail:
      typeof log.payload?.routePath === "string"
        ? `Tracked on ${log.payload.routePath}`
        : log.tool === "code_assistant"
          ? "Coding continuity checkpoint logged"
          : "Workspace activity tracked for continuity",
    createdAt: log.createdAt,
    state: "live"
  }));

  return [...previewEntries, ...toolEntries].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function TimelineShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [previews, setPreviews] = useState<WorkspacePreviewVersion[]>([]);
  const [logs, setLogs] = useState<ToolLog[]>([]);

  useEffect(() => {
    void fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setProjects(Array.isArray(payload) ? payload : []));
  }, []);

  const projectId = searchParams.get("project") || projects[0]?.id || null;

  useEffect(() => {
    const params = new URLSearchParams();
    if (projectId) {
      params.set("projectId", projectId);
    }
    params.set("limit", "60");

    void Promise.all([
      fetch(`/api/previews?${params}`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`/api/tool-logs?${params}`, { cache: "no-store" }).then((response) => response.json())
    ]).then(([nextPreviews, nextLogs]) => {
      setPreviews(Array.isArray(nextPreviews) ? nextPreviews : []);
      setLogs(Array.isArray(nextLogs) ? nextLogs : []);
    });
  }, [projectId]);

  const activeProject = projects.find((project) => project.id === projectId) || null;
  const timelineEntries = useMemo(() => buildTimelineEntries(previews, logs), [previews, logs]);

  return (
    <WorkspacePageShell statusLabel="Timeline" viewer={viewer}>
      <div className="space-y-6 md:space-y-7">
        <WorkspacePageHero
          description="Every coding checkpoint, preview version, approval, and deploy note becomes part of the project memory so you can resume later with the full visual history intact."
          eyebrow="Project workspace"
          title="Visual progress is part of the continuity record"
        />

        <ProjectWorkspaceTabs active="timeline" projectId={projectId} className="pt-1" />

        <WorkspaceCard className="p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <WorkspaceSectionTitle>{activeProject?.name || "Project timeline"}</WorkspaceSectionTitle>
              <p className="mt-2 max-w-[46rem] text-sm leading-7 text-[var(--site-subtle)]">
                Watch your project evolve in real time. Xeivora remembers not only conversations and files, but also the sequence of visual and technical progress.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <WorkspaceBadge tone="learning">{previews.length} preview versions</WorkspaceBadge>
              <WorkspaceBadge tone="standby">{logs.length} tracked continuity events</WorkspaceBadge>
            </div>
          </div>
        </WorkspaceCard>

        {timelineEntries.length ? (
          <div className="space-y-4">
            {timelineEntries.map((entry) => (
              <WorkspaceCard className="p-5" key={entry.id}>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                    {entry.state === "deployed" ? (
                      <Rocket className="h-4 w-4" />
                    ) : entry.state === "approved" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : entry.kind === "preview" ? (
                      <GitBranch className="h-4 w-4" />
                    ) : (
                      <Clock3 className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-medium text-[var(--site-text)]">{entry.label}</h2>
                      <WorkspaceBadge tone={entry.state === "approved" || entry.state === "deployed" ? "learning" : "standby"}>
                        {entry.state}
                      </WorkspaceBadge>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--site-subtle)]">{entry.detail}</p>
                    <div className="mt-3 text-[12px] text-[var(--site-subtle)]">
                      {new Date(entry.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                </div>
              </WorkspaceCard>
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            description="Ask Xeivora to continue coding work and the project timeline will begin tracking checkpoints, previews, and approval history automatically."
            title="No visual progress history yet"
          />
        )}
      </div>
    </WorkspacePageShell>
  );
}
