"use client";

import { FileText, FolderKanban, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSearchInput,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import type { UploadedFileSummary, WorkspaceProject } from "@/lib/chat-types";

type ToolLog = {
  id: string;
  tool: string;
  status: string;
  summary: string;
  createdAt: string;
};

export function ProjectsShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [files, setFiles] = useState<UploadedFileSummary[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolLog[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void Promise.all([
      fetch("/api/projects", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/files", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/tool-logs", { cache: "no-store" }).then((response) => response.json())
    ]).then(([nextProjects, nextFiles, nextLogs]) => {
      setProjects(nextProjects || []);
      setFiles(nextFiles || []);
      setToolLogs((nextLogs || []).slice(0, 6));
    });
  }, []);

  const filteredProjects = useMemo(() => {
    const lower = query.toLowerCase();
    return projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(lower));
  }, [projects, query]);

  async function handleCreateProject() {
    const name = window.prompt("Project name", "New Xeivora project");
    if (!name?.trim()) {
      return;
    }

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: "Workspace for chats, files, memories, and orchestrated tasks.",
        color: "#c96442"
      })
    });

    const project = (await response.json()) as WorkspaceProject;
    setProjects((current) => [project, ...current]);
  }

  return (
    <WorkspacePageShell statusLabel="Projects" viewer={viewer}>
      <div className="space-y-10">
        <WorkspacePageHero
          actions={
            <WorkspaceButton onClick={() => void handleCreateProject()}>
              <Plus className="h-4 w-4" />
              New project
            </WorkspaceButton>
          }
          description="Create persistent workspaces for chats, files, memory, and orchestration traces so Xeivora can maintain continuity around every initiative."
          eyebrow="Projects workspace"
          title="Organize work around durable context"
        />

        <WorkspaceSearchInput onChange={setQuery} placeholder="Search projects" value={query} />

        <div className="grid gap-10 xl:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-10">
            <WorkspaceCard>
              <WorkspaceSectionTitle>Project registry</WorkspaceSectionTitle>
              {filteredProjects.length ? (
                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <article
                      className="rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#120e0a] p-5 transition-colors hover:border-[rgba(201,100,66,0.35)]"
                      key={project.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-[8px]"
                            style={{ backgroundColor: `${project.color}22`, color: project.color }}
                          >
                            <FolderKanban className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-base font-medium text-white">{project.name}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.35)]">
                              {project.status}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-[rgba(255,255,255,0.35)]">{project.chatCount} chats</span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-[rgba(255,255,255,0.55)]">{project.description}</p>

                      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[rgba(201,100,66,0.1)] pt-4">
                        <Metric label="Chats" value={`${project.chatCount}`} />
                        <Metric label="Files" value={`${project.fileCount}`} />
                        <Metric label="Memory" value={`${project.memoryCount}`} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6">
                  <WorkspaceEmptyState
                    action={
                      <WorkspaceButton onClick={() => void handleCreateProject()}>
                        <Plus className="h-4 w-4" />
                        {projects.length ? "Create another project" : "Create project"}
                      </WorkspaceButton>
                    }
                    description={
                      projects.length
                        ? "Try a different search term or create another project to expand your workspace."
                        : "Create your first project to organise chats, files, and memory"
                    }
                    title={projects.length ? "No matching projects" : "No projects yet"}
                  />
                </div>
              )}
            </WorkspaceCard>

            <WorkspaceCard>
              <WorkspaceSectionTitle>Workspace activity</WorkspaceSectionTitle>
              <div className="mt-6 space-y-3">
                {toolLogs.length ? (
                  toolLogs.map((log) => (
                    <div
                      className="rounded-[8px] border border-[rgba(201,100,66,0.12)] bg-[#120e0a] px-4 py-4"
                      key={log.id}
                    >
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.35)]">
                        <Sparkles className="h-3.5 w-3.5 text-[#c96442]" />
                        <span>{log.tool}</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[rgba(255,255,255,0.55)]">{log.summary}</p>
                    </div>
                  ))
                ) : (
                  <WorkspaceEmptyState
                    description="Execution traces, file analysis jobs, and orchestration actions will appear here once your workspace starts running."
                    title="No activity yet"
                  />
                )}
              </div>
            </WorkspaceCard>
          </div>

          <WorkspaceCard>
            <WorkspaceSectionTitle>Recent files</WorkspaceSectionTitle>
            <div className="mt-6 space-y-3">
              {files.length ? (
                files.slice(0, 8).map((file) => (
                  <div
                    className="rounded-[8px] border border-[rgba(201,100,66,0.12)] bg-[#120e0a] px-4 py-4 transition-colors hover:border-[rgba(201,100,66,0.25)]"
                    key={file.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[rgba(201,100,66,0.08)] text-[#c96442]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{file.name}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.35)]">
                            {file.kind}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[rgba(255,255,255,0.55)]">
                      {file.summary || file.previewText || "Ready for analysis."}
                    </p>
                  </div>
                ))
              ) : (
                <WorkspaceEmptyState
                  description="Uploaded files, parsed documents, and extracted insights will show up here once you attach them to a project."
                  title="No files yet"
                />
              )}
            </div>
          </WorkspaceCard>
        </div>
      </div>
    </WorkspacePageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[rgba(201,100,66,0.1)] bg-[#1a1410] px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.35)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
