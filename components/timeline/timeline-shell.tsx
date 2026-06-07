"use client";

import { FileText, FolderKanban, MessageSquareText, Monitor, NotebookPen } from "lucide-react";
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
import type { WorkspaceProject } from "@/lib/chat-types";

type TimelineEventKind =
  | "project_created"
  | "chat_created"
  | "file_uploaded"
  | "preview_generated"
  | "memory_updated";

type TimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  title: string;
  detail: string;
  at: string;
};

const EVENT_META: Record<TimelineEventKind, { icon: typeof FileText; label: string }> = {
  project_created: { icon: FolderKanban, label: "Project" },
  chat_created: { icon: MessageSquareText, label: "Chat" },
  file_uploaded: { icon: FileText, label: "File" },
  preview_generated: { icon: Monitor, label: "Preview" },
  memory_updated: { icon: NotebookPen, label: "Memory" }
};

export function TimelineShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    void fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setProjects(Array.isArray(payload) ? payload : []));
  }, []);

  const projectId = searchParams.get("project") || projects[0]?.id || null;

  useEffect(() => {
    if (!projectId) {
      setEvents([]);
      return;
    }
    void fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => setEvents(Array.isArray(payload?.timeline) ? payload.timeline : []));
  }, [projectId]);

  const activeProject = projects.find((project) => project.id === projectId) || null;
  const counts = useMemo(() => {
    const map: Record<TimelineEventKind, number> = {
      project_created: 0,
      chat_created: 0,
      file_uploaded: 0,
      preview_generated: 0,
      memory_updated: 0
    };
    for (const event of events) {
      if (event.kind in map) {
        map[event.kind] += 1;
      }
    }
    return map;
  }, [events]);

  return (
    <WorkspacePageShell statusLabel="Timeline" viewer={viewer}>
      <div className="space-y-6 md:space-y-7">
        <WorkspacePageHero
          description="Every real project event — chats, files, previews, and memory updates — becomes part of the continuity record so you can resume later with the full history intact."
          eyebrow="Project workspace"
          title="The project's history, in order"
        />

        <ProjectWorkspaceTabs active="timeline" projectId={projectId} className="pt-1" />

        <WorkspaceCard className="p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <WorkspaceSectionTitle>{activeProject?.name || "Project timeline"}</WorkspaceSectionTitle>
              <p className="mt-2 max-w-[46rem] text-sm leading-7 text-[var(--site-subtle)]">
                These events are drawn from real project records — when the project was created, chats started, files uploaded, previews generated, and memory updated.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <WorkspaceBadge tone="learning">{events.length} events</WorkspaceBadge>
              <WorkspaceBadge tone="standby">{counts.chat_created} chats</WorkspaceBadge>
              <WorkspaceBadge tone="standby">{counts.preview_generated} previews</WorkspaceBadge>
            </div>
          </div>
        </WorkspaceCard>

        {events.length ? (
          <div className="space-y-3">
            {events.map((event) => {
              const meta = EVENT_META[event.kind] ?? EVENT_META.memory_updated;
              const Icon = meta.icon;
              return (
                <WorkspaceCard className="p-5" key={event.id}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-medium text-[var(--site-text)]">{event.title}</h2>
                        <WorkspaceBadge tone="standby">{meta.label}</WorkspaceBadge>
                      </div>
                      {event.detail ? (
                        <p className="mt-2 truncate text-sm leading-7 text-[var(--site-subtle)]">{event.detail}</p>
                      ) : null}
                      <div className="mt-2 text-[12px] text-[var(--site-subtle)]">
                        {new Date(event.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                  </div>
                </WorkspaceCard>
              );
            })}
          </div>
        ) : (
          <WorkspaceEmptyState
            description="Start a chat, attach a file, or generate a preview in this project and the timeline will begin recording real events automatically."
            title="No project events yet"
          />
        )}
      </div>
    </WorkspacePageShell>
  );
}
