"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  FileText,
  FolderKanban,
  GitGraph,
  MessageSquareText,
  Monitor,
  Plus,
  Rocket
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DeploymentsTab } from "@/components/projects/deployments-tab";
import { GitHubTab } from "@/components/projects/github-tab";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePageShell,
  WorkspaceProgressBar,
  WorkspaceSectionTitle,
  WorkspaceStatCard
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import type {
  ChatSessionSummary,
  UploadedFileSummary,
  WorkspacePreviewVersion,
  WorkspaceProject
} from "@/lib/chat-types";

type MemoryItem = {
  id: string;
  type: string;
  title: string;
  content: string;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
  projectId?: string | null;
};

type TimelineEvent = {
  id: string;
  kind:
    | "project_created"
    | "chat_created"
    | "file_uploaded"
    | "preview_generated"
    | "memory_updated"
    | "github_connected"
    | "vercel_linked"
    | "deployment_started"
    | "build_running"
    | "deployment_succeeded"
    | "deployment_failed"
    | "production_url_created";
  title: string;
  detail: string;
  at: string;
};

type ProjectWorkspaceData = {
  project: WorkspaceProject;
  chats: ChatSessionSummary[];
  files: UploadedFileSummary[];
  previews: WorkspacePreviewVersion[];
  memory: MemoryItem[];
  timeline: TimelineEvent[];
  lastActivity: string;
};

const STATUS_TONE: Record<WorkspaceProject["status"], "live" | "standby" | "learning"> = {
  active: "live",
  paused: "learning",
  archived: "standby"
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }
  try {
    return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function formatRelative(value?: string | null) {
  if (!value) {
    return "no activity yet";
  }
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return "no activity yet";
  }
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const TIMELINE_ICON: Record<TimelineEvent["kind"], typeof Clock> = {
  project_created: FolderKanban,
  chat_created: MessageSquareText,
  file_uploaded: FileText,
  preview_generated: Monitor,
  memory_updated: Clock,
  github_connected: GitGraph,
  vercel_linked: Rocket,
  deployment_started: Rocket,
  build_running: Clock,
  deployment_succeeded: Rocket,
  deployment_failed: Rocket,
  production_url_created: Rocket
};

export function ProjectWorkspaceShell({
  projectId,
  viewer = null
}: {
  projectId: string;
  viewer?: AuthUser | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab = rawTab === "deployments" ? "deployments" : rawTab === "github" ? "github" : "overview";

  const [data, setData] = useState<ProjectWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then((response) => {
        if (response.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        return response.json();
      })
      .then((payload: ProjectWorkspaceData | null) => {
        if (!cancelled && payload) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const project = data?.project ?? null;
  const chats = useMemo(() => data?.chats ?? [], [data]);
  const files = useMemo(() => data?.files ?? [], [data]);
  const previews = useMemo(() => data?.previews ?? [], [data]);
  const memory = useMemo(() => data?.memory ?? [], [data]);
  const timeline = useMemo(() => data?.timeline ?? [], [data]);

  // Progress is derived from real preview deploy-readiness (no stored field).
  const progress = useMemo(() => {
    if (!previews.length) return 0;
    const ready = previews.filter((p) => p.status === "approved" || p.status === "deploy_ready").length;
    return Math.round((ready / previews.length) * 100);
  }, [previews]);

  const latestPreview = previews[0] ?? null;
  const deployReadyCount = previews.filter((p) => p.status === "deploy_ready").length;

  async function handleNewChat() {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const payload = await response.json();
      router.push(payload?.session?.id ? `/chat?session=${encodeURIComponent(payload.session.id)}` : `/chat?project=${projectId}`);
    } finally {
      setCreatingChat(false);
    }
  }

  if (notFound) {
    return (
      <WorkspacePageShell statusLabel="Project workspace" viewer={viewer}>
        <div className="space-y-6">
          <BackLink />
          <WorkspaceEmptyState
            action={
              <Link href="/dashboard">
                <WorkspaceButton>Back to projects</WorkspaceButton>
              </Link>
            }
            description="This project may have been deleted or never existed."
            title="Project not found"
          />
        </div>
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell statusLabel="Project workspace" viewer={viewer}>
      <div className="space-y-6 md:space-y-7">
        <BackLink />

        {loading || !project ? (
          <WorkspaceCard>
            <div className="text-sm text-[var(--site-subtle)]">Loading project workspace…</div>
          </WorkspaceCard>
        ) : (
          <>
            {/* Header */}
            <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] text-[18px] font-semibold text-white"
                  style={{ backgroundColor: project.color || "var(--site-accent)" }}
                >
                  {(project.name || "X").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="truncate text-[clamp(26px,3vw,32px)] font-bold tracking-[-0.02em] text-[var(--site-text)]">
                      {project.name}
                    </h1>
                    <WorkspaceBadge tone={STATUS_TONE[project.status]}>{project.status}</WorkspaceBadge>
                  </div>
                  <p className="mt-2 max-w-[640px] text-sm leading-7 text-[var(--site-subtle)]">
                    {project.description || "No project goal set yet."}
                  </p>
                  <div className="mt-4 max-w-[420px]">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[var(--site-subtle)]">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <WorkspaceProgressBar value={progress} />
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--site-subtle)]">
                      <Clock className="h-3.5 w-3.5" />
                      Last activity {formatRelative(data?.lastActivity)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <WorkspaceButton disabled={creatingChat} onClick={() => void handleNewChat()}>
                  <Plus className="h-4 w-4" />
                  New chat in project
                </WorkspaceButton>
              </div>
            </header>

            {tab === "github" ? (
              <GitHubTab projectId={projectId} />
            ) : tab === "deployments" ? (
              <DeploymentsTab projectId={projectId} />
            ) : (
              <OverviewTab
                chats={chats}
                files={files}
                latestPreview={latestPreview}
                memory={memory}
                onNewChat={() => void handleNewChat()}
                project={project}
                projectId={projectId}
                deployReadyCount={deployReadyCount}
                timeline={timeline}
              />
            )}
          </>
        )}
      </div>
    </WorkspacePageShell>
  );
}

function OverviewTab({
  chats,
  files,
  latestPreview,
  memory,
  onNewChat,
  project,
  projectId,
  deployReadyCount,
  timeline
}: {
  chats: ChatSessionSummary[];
  files: UploadedFileSummary[];
  latestPreview: WorkspacePreviewVersion | null;
  memory: MemoryItem[];
  onNewChat: () => void;
  project: WorkspaceProject;
  projectId: string;
  deployReadyCount: number;
  timeline: TimelineEvent[];
}) {
  return (
    <div className="space-y-6">
      {/* Project statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceStatCard label="Chats" value={`${chats.length}`} />
        <WorkspaceStatCard label="Files" value={`${files.length}`} />
        <WorkspaceStatCard label="Memory Items" value={`${memory.length}`} />
        <WorkspaceStatCard label="Timeline Events" value={`${timeline.length}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-6">
          {/* Project goal */}
          <WorkspaceCard>
            <WorkspaceSectionTitle>Project goal</WorkspaceSectionTitle>
            <p className="mt-3 text-sm leading-7 text-[var(--site-subtle)]">
              {project.description || "No project goal set yet. Open the projects list to add one."}
            </p>
          </WorkspaceCard>

          {/* Recent activity (timeline) */}
          <WorkspaceCard>
            <div className="flex items-center justify-between">
              <WorkspaceSectionTitle>Recent activity</WorkspaceSectionTitle>
              <Link
                className="text-[12px] font-medium text-[var(--site-accent)] hover:underline"
                href={`/timeline?project=${projectId}`}
              >
                View timeline
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {timeline.length ? (
                timeline.slice(0, 8).map((event) => {
                  const Icon = TIMELINE_ICON[event.kind];
                  return (
                    <div className="flex items-start gap-3" key={event.id}>
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-[var(--site-text)]">{event.title}</span>
                          <span className="shrink-0 text-[11px] text-[var(--site-subtle)]">{formatRelative(event.at)}</span>
                        </div>
                        <p className="truncate text-[13px] text-[var(--site-subtle)]">{event.detail}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <WorkspaceEmptyState
                  description="Activity from chats, files, and previews in this project will appear here."
                  title="No activity yet"
                />
              )}
            </div>
          </WorkspaceCard>

          {/* Recent files */}
          <WorkspaceCard>
            <div className="flex items-center justify-between">
              <WorkspaceSectionTitle>Recent files</WorkspaceSectionTitle>
              <Link
                className="text-[12px] font-medium text-[var(--site-accent)] hover:underline"
                href={`/files?project=${projectId}`}
              >
                View files
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {files.length ? (
                files.slice(0, 5).map((file) => (
                  <div className="flex items-center gap-3" key={file.id}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[var(--site-text)]">{file.name}</div>
                      <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--site-subtle)]">{file.kind}</div>
                    </div>
                  </div>
                ))
              ) : (
                <WorkspaceEmptyState
                  description="Files attached to chats in this project will be collected here."
                  title="No files yet"
                />
              )}
            </div>
          </WorkspaceCard>
        </div>

        <div className="space-y-6">
          {/* Latest preview */}
          <WorkspaceCard>
            <div className="flex items-center justify-between">
              <WorkspaceSectionTitle>Latest preview</WorkspaceSectionTitle>
              <Link
                className="text-[12px] font-medium text-[var(--site-accent)] hover:underline"
                href={`/preview?project=${projectId}`}
              >
                Open preview
              </Link>
            </div>
            {latestPreview ? (
              <div className="mt-4 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-[var(--site-text)]">
                    v{latestPreview.versionNumber} · {latestPreview.title}
                  </span>
                  <WorkspaceBadge tone={latestPreview.status === "live" ? "standby" : "learning"}>
                    {latestPreview.status.replace("_", "-")}
                  </WorkspaceBadge>
                </div>
                <p className="mt-2 text-[13px] leading-6 text-[var(--site-subtle)]">
                  {latestPreview.summary || "Preview checkpoint."}
                </p>
                <div className="mt-2 text-[11px] text-[var(--site-subtle)]">Route {latestPreview.routePath}</div>
              </div>
            ) : (
              <div className="mt-4">
                <WorkspaceEmptyState
                  description="Ask Xeivora to build something in this project and preview versions will appear here."
                  title="No previews yet"
                />
              </div>
            )}
          </WorkspaceCard>

          {/* Deployment status */}
          <WorkspaceCard>
            <WorkspaceSectionTitle>Deployment status</WorkspaceSectionTitle>
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                <Rocket className="h-4 w-4" />
              </div>
              <div className="text-sm leading-7 text-[var(--site-subtle)]">
                {deployReadyCount > 0
                  ? `${deployReadyCount} version${deployReadyCount === 1 ? "" : "s"} marked deploy-ready. No live deployment yet.`
                  : "No deployments yet."}
              </div>
            </div>
          </WorkspaceCard>

          {/* Recent memory */}
          <WorkspaceCard>
            <div className="flex items-center justify-between">
              <WorkspaceSectionTitle>Recent memory</WorkspaceSectionTitle>
              <Link
                className="text-[12px] font-medium text-[var(--site-accent)] hover:underline"
                href={`/memory?project=${projectId}`}
              >
                View memory
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {memory.length ? (
                memory.slice(0, 5).map((item) => (
                  <div className="rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-3" key={item.id}>
                    <div className="truncate text-sm font-medium text-[var(--site-text)]">{item.title}</div>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-[var(--site-subtle)]">{item.content}</p>
                  </div>
                ))
              ) : (
                <WorkspaceEmptyState
                  description="Decisions, requirements, and facts saved to this project will appear here."
                  title="No project memory yet"
                />
              )}
            </div>
          </WorkspaceCard>

          {/* Quick action */}
          <WorkspaceCard>
            <WorkspaceSectionTitle>Continue the work</WorkspaceSectionTitle>
            <p className="mt-2 text-[13px] leading-6 text-[var(--site-subtle)]">
              Start a new chat already attached to this project so context stays together.
            </p>
            <div className="mt-4">
              <WorkspaceButton onClick={onNewChat}>
                <Plus className="h-4 w-4" />
                New chat in project
              </WorkspaceButton>
            </div>
          </WorkspaceCard>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      className="inline-flex items-center gap-2 text-sm text-[var(--site-subtle)] transition-colors hover:text-[var(--site-text)]"
      href="/dashboard"
    >
      <ArrowLeft className="h-4 w-4" />
      All projects
    </Link>
  );
}
