"use client";

import { FolderKanban, Plus, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
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
    return projects.filter((project) =>
      `${project.name} ${project.description}`.toLowerCase().includes(lower)
    );
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
        color: "#8b5cf6"
      })
    });
    const project = (await response.json()) as WorkspaceProject;
    setProjects((current) => [project, ...current]);
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WorkspaceSidebar statusLabel="Workspace" viewer={viewer} />
        <div className="space-y-4">
          <section className="glow-shell p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-kicker">Projects workspace</div>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Organize chats, files, memory, and workflows by project
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-white/56">
                  Xeivora projects keep related conversations, uploaded files, workspace memory, and tool activity together
                  so the AI operating system has durable context.
                </p>
              </div>

              <button
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
                onClick={() => void handleCreateProject()}
                type="button"
              >
                <Plus className="h-4 w-4" />
                <span>New project</span>
              </button>
            </div>
          </section>

          <section className="glass-panel p-5">
            <label className="flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-slate-950/70 px-4 py-3">
              <Search className="h-4 w-4 text-white/42" />
              <input
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/34"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search projects"
                value={query}
              />
            </label>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <section className="glow-shell p-5">
              <div className="section-kicker">Project registry</div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((project) => (
                  <article className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5" key={project.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl"
                          style={{ backgroundColor: `${project.color}22`, color: project.color }}
                        >
                          <FolderKanban className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-medium text-white">{project.name}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/38">
                            {project.status}
                          </div>
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100/74">
                        {project.chatCount} chats
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-white/56">{project.description}</p>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                      <Metric label="Chats" value={`${project.chatCount}`} />
                      <Metric label="Files" value={`${project.fileCount}`} />
                      <Metric label="Memory" value={`${project.memoryCount}`} />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="space-y-4">
              <section className="glass-panel p-5">
                <div className="section-kicker">Recent files</div>
                <div className="mt-4 space-y-3">
                  {files.slice(0, 8).map((file) => (
                    <div className="rounded-[1.3rem] border border-white/8 bg-slate-950/72 p-4" key={file.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white">{file.name}</div>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-white/36">{file.kind}</span>
                      </div>
                      <div className="mt-2 text-sm text-white/52">{file.summary || file.previewText || "Ready for analysis."}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-panel p-5">
                <div className="section-kicker">Workspace activity</div>
                <div className="mt-4 space-y-3">
                  {toolLogs.map((log) => (
                    <div className="rounded-[1.3rem] border border-white/8 bg-slate-950/72 p-4" key={log.id}>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/34">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{log.tool}</span>
                      </div>
                      <div className="mt-2 text-sm text-white/60">{log.summary}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/72 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
