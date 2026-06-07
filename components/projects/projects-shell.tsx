"use client";

import { motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  BrainCircuit,
  Pencil,
  FileText,
  FolderKanban,
  GitBranch,
  MessageSquareText,
  Plus,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ContinueProjectBriefing } from "@/components/projects/continue-project-briefing";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { WorkspacePageShell } from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import type { UploadedFileSummary, WorkspaceProject } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

type ToolLog = {
  id: string;
  tool: string;
  status: string;
  summary: string;
  createdAt: string;
};

const pageCardClassName =
  "rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-5 py-5 transition-colors duration-150 hover:border-[color:var(--site-border-strong)] md:px-6";

export function ProjectsShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const router = useRouter();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [files, setFiles] = useState<UploadedFileSummary[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolLog[]>([]);
  const [query, setQuery] = useState("");
  const [briefing, setBriefing] = useState<{ id: string; name: string | null } | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/projects", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/files", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/tool-logs", { cache: "no-store" }).then((response) => response.json())
    ]).then(([nextProjects, nextFiles, nextLogs]) => {
      setProjects(Array.isArray(nextProjects) ? nextProjects : []);
      setFiles(Array.isArray(nextFiles) ? nextFiles : []);
      setToolLogs(Array.isArray(nextLogs) ? nextLogs : []);
    });
  }, []);

  const filteredProjects = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) {
      return projects;
    }

    return projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(lower));
  }, [projects, query]);

  const sortedFiles = useMemo(
    () =>
      [...files].sort(
        (left, right) => new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime()
      ),
    [files]
  );

  const stats = useMemo(
    () => [
      {
        label: "Saved projects",
        value: projects.length,
        icon: FolderKanban
      },
      {
        label: "Context threads",
        value: projects.reduce((sum, project) => sum + Number(project.chatCount || 0), 0),
        icon: MessageSquareText
      },
      {
        label: "Attached files",
        value: files.length,
        icon: FileText
      },
      {
        label: "Project Memory items",
        value: projects.reduce((sum, project) => sum + Number(project.memoryCount || 0), 0),
        icon: BrainCircuit
      }
    ],
    [projects, files]
  );

  const activitySeries = useMemo(() => buildActivitySeries(toolLogs), [toolLogs]);
  const activityFeed = useMemo(() => buildActivityFeed(toolLogs), [toolLogs]);
  const leadProject =
    filteredProjects.find((project) => project.status !== "archived") ||
    projects.find((project) => project.status !== "archived") ||
    filteredProjects[0] ||
    projects[0] ||
    null;
  const leadProjectFiles = useMemo(
    () => (leadProject ? sortedFiles.filter((file) => file.projectId === leadProject.id).slice(0, 3) : []),
    [leadProject, sortedFiles]
  );
  const leadProjectHighlights = useMemo(() => {
    if (!leadProject) {
      return [];
    }

    return [
      `${leadProject.chatCount} context threads preserved`,
      `${leadProject.memoryCount} Project Memory entries available`,
      `${leadProject.fileCount} files attached to the workspace`
    ];
  }, [leadProject]);

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
        description: "Workspace for chats, files, Project Memory, and continuity checkpoints.",
        color: "#c96442"
      })
    });

    const project = (await response.json()) as WorkspaceProject;
    setProjects((current) => [project, ...current]);
  }

  async function handleUpdateProject(projectId: string, updates: Partial<WorkspaceProject>) {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });

    const payload = (await response.json()) as { project?: WorkspaceProject | null; projects?: WorkspaceProject[] };
    if (Array.isArray(payload.projects)) {
      setProjects(payload.projects);
    } else if (payload.project) {
      setProjects((current) => current.map((project) => (project.id === payload.project?.id ? payload.project : project)));
    }
  }

  async function handleRenameProject(project: WorkspaceProject) {
    const nextName = window.prompt("Rename project", project.name);
    if (!nextName || !nextName.trim() || nextName.trim() === project.name) {
      return;
    }

    await handleUpdateProject(project.id, { name: nextName.trim() });
  }

  async function handleToggleArchiveProject(project: WorkspaceProject) {
    await handleUpdateProject(project.id, {
      status: project.status === "archived" ? "active" : "archived"
    });
  }

  async function handleDeleteProject(project: WorkspaceProject) {
    const confirmed = window.confirm(`Delete "${project.name}"? This removes the project workspace from Xeivora.`);
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as { projects?: WorkspaceProject[] };
    if (Array.isArray(payload.projects)) {
      setProjects(payload.projects);
    } else {
      setProjects((current) => current.filter((entry) => entry.id !== project.id));
    }
  }

  function handleContinueProject(projectId: string | null) {
    if (projectId) {
      const match = projects.find((project) => project.id === projectId) || null;
      setBriefing({ id: projectId, name: match?.name ?? null });
      return;
    }

    router.push("/chat");
  }

  function handleResumeInChat(projectId: string) {
    setBriefing(null);
    router.push(`/chat?project=${encodeURIComponent(projectId)}`);
  }

  function handleOpenProject(projectId: string) {
    router.push(`/dashboard/${encodeURIComponent(projectId)}`);
  }

  return (
    <WorkspacePageShell statusLabel="Projects" viewer={viewer}>
      <div className="space-y-6 md:space-y-7">
        <motion.header
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="text-[12px] font-medium tracking-[0.04em] text-[var(--site-subtle)]">Dashboard / Projects</div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--site-accent)] px-4 py-2.5 text-[13px] font-medium text-[var(--site-inverse)] transition duration-150 hover:scale-[1.02] hover:bg-[var(--site-accent-strong)]"
              onClick={() => handleContinueProject(leadProject?.id || null)}
              type="button"
            >
              <ArrowRight className="h-4 w-4" />
              Continue Project
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-[8px] border border-[color:var(--site-border-strong)] px-4 py-2.5 text-[13px] font-medium text-[var(--site-text)] transition duration-150 hover:bg-[var(--site-ghost-bg)]"
              onClick={() => void handleCreateProject()}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New project
            </button>
            <ThemeToggleButton compact />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[13px] font-medium text-[var(--site-accent)]">
              {getInitials(viewer?.name || "Xeivora")}
            </div>
          </div>
        </motion.header>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
          initial={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.38, ease: "easeOut", delay: 0.05 }}
        >
          <div className="max-w-[560px]">
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--site-accent)] opacity-80">
              Continuity workspace
            </div>
            <h1 className="mt-3 font-[Georgia,'Times New Roman',serif] text-[32px] font-normal leading-[1.05] tracking-[-0.02em] text-[var(--site-text)] md:text-[36px]">
              Continue your AI work across models without losing context.
            </h1>
            <p className="mt-4 max-w-[480px] text-[13px] font-light leading-6 text-[var(--site-subtle)]">
              Projects keep conversations, files, memory, and decisions attached so Xeivora can resume exactly where work stopped.
            </p>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--site-accent)] px-5 py-2.5 text-[13px] font-medium text-[var(--site-inverse)] transition duration-150 hover:scale-[1.02] hover:bg-[var(--site-accent-strong)]"
            onClick={() => handleContinueProject(leadProject?.id || null)}
            type="button"
          >
            <ArrowRight className="h-4 w-4" />
            Continue Project
          </button>
        </motion.section>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.38, ease: "easeOut", delay: 0.08 }}
        >
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[14px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-5 py-5 md:px-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-[520px]">
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--site-accent)] opacity-85">
                    Continue Recent Project
                  </div>
                  <h2 className="mt-3 font-[Georgia,'Times New Roman',serif] text-[28px] leading-[1.02] tracking-[-0.03em] text-[var(--site-text)]">
                    {leadProject?.name || "No project continuity saved yet"}
                  </h2>
                  <p className="mt-3 text-[13px] font-light leading-6 text-[var(--site-subtle)]">
                    {leadProject
                      ? `Last active ${formatRelativeTime(leadProject.updatedAt)}. Xeivora can resume this project with saved conversations, decisions, files, and momentum.`
                      : "Create a project once, then Xeivora will remember its conversations, files, decisions, and progress here."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--site-accent)] px-5 py-2.5 text-[13px] font-medium text-[var(--site-inverse)] transition duration-150 hover:scale-[1.02] hover:bg-[var(--site-accent-strong)]"
                    onClick={() => handleContinueProject(leadProject?.id || null)}
                    type="button"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Continue Project
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[color:var(--site-border-strong)] px-5 py-2.5 text-[13px] font-medium text-[var(--site-text)] transition duration-150 hover:bg-[var(--site-ghost-bg)]"
                    onClick={() => router.push("/memory")}
                    type="button"
                  >
                    <BrainCircuit className="h-4 w-4" />
                    Open Project Memory
                  </button>
                </div>
              </div>

              {leadProject ? (
                <>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Status", value: leadProject.status === "active" ? "Active" : leadProject.status },
                      { label: "Last active", value: formatRelativeTime(leadProject.updatedAt) },
                      { label: "Files saved", value: `${leadProject.fileCount}` }
                    ].map((item) => (
                      <div className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-3" key={item.label}>
                        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--site-subtle)]">{item.label}</div>
                        <div className="mt-2 text-[14px] font-medium text-[var(--site-text)]">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.88fr]">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--site-subtle)]">Saved continuity snapshot</div>
                      <div className="mt-3 space-y-2">
                        {leadProjectHighlights.map((item) => (
                          <div className="flex items-start gap-3 text-[13px] font-light text-[var(--site-text)]" key={item}>
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--site-accent)]" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-4">
                        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--site-subtle)]">Recommended next step</div>
                        <p className="mt-2 text-[13px] font-light leading-6 text-[var(--site-subtle)]">
                          Reopen the latest continuity thread, review the saved Project Memory decisions, and continue the next implementation step without rebuilding context.
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--site-subtle)]">Recently attached files</div>
                      <div className="mt-3 space-y-2">
                        {leadProjectFiles.length ? (
                          leadProjectFiles.map((file) => (
                            <div
                              className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-3"
                              key={file.id}
                            >
                              <div className="truncate text-[13px] font-medium text-[var(--site-text)]">{file.name}</div>
                              <div className="mt-1 text-[12px] font-light text-[var(--site-subtle)]">
                                {file.kind.toUpperCase()} · {formatRelativeTime(file.updatedAt || file.createdAt)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[12px] border border-dashed border-[color:var(--site-border)] px-4 py-4 text-[13px] font-light text-[var(--site-subtle)]">
                            No files are attached yet, but the project is ready to preserve them once you add them.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </section>

            <section className="rounded-[14px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-5 py-5 md:px-6">
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--site-accent)] opacity-85">
                Why Xeivora
              </div>
              <h2 className="mt-3 font-[Georgia,'Times New Roman',serif] text-[24px] leading-[1.06] tracking-[-0.02em] text-[var(--site-text)]">
                The project should not stop when the model does.
              </h2>
              <div className="mt-5 space-y-3 text-[13px] font-light leading-6 text-[var(--site-subtle)]">
                <p>Projects are the center of Xeivora. Chats, files, summaries, and decisions stay attached to the same work.</p>
                <p>Project Memory keeps the context you should never have to reconstruct: goals, technical choices, progress, and next steps.</p>
                <p>When you return later, the workspace tells you what happened, what changed, and where to continue.</p>
              </div>
            </section>
          </div>
        </motion.section>

        <motion.label
          animate={{ opacity: 1, y: 0 }}
          className="flex h-11 items-center gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4 transition-colors duration-150 focus-within:border-[var(--site-accent)]"
          initial={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.38, ease: "easeOut", delay: 0.1 }}
        >
          <Search className="h-4 w-4 text-[var(--site-accent)]" />
          <input
            className="w-full bg-transparent text-[13px] font-light text-[var(--site-text)] outline-none placeholder:text-[var(--site-subtle)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, context, and saved work..."
            value={query}
          />
        </motion.label>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <FadeCard delay={0.14 + index * 0.05} key={stat.label}>
              <div className={pageCardClassName}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <AnimatedNumber value={stat.value} />
                    <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--site-subtle)]">
                      {stat.label}
                    </div>
                  </div>
                  <div className="text-[var(--site-accent)] opacity-40">
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </FadeCard>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <FadeCard delay={0.36}>
            <section className={pageCardClassName}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[14px] font-medium text-[var(--site-text)]">Continue projects</h2>
                <button
                  className="text-[13px] font-medium text-[var(--site-accent)] transition hover:opacity-80"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  View all →
                </button>
              </div>

              <div className="mt-5">
                {filteredProjects.length ? (
                  <div className="divide-y divide-[color:var(--site-border)]">
                    {filteredProjects.map((project) => (
                      <button
                        className="group flex w-full items-start gap-4 rounded-[10px] px-2 py-4 text-left transition duration-150 hover:bg-[var(--site-ghost-bg)]"
                        key={project.id}
                        onClick={() => handleOpenProject(project.id)}
                        type="button"
                      >
                        <div
                          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-medium text-white"
                          style={{ backgroundColor: project.color || "var(--site-accent)" }}
                        >
                          {(project.name || "X").charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-[13px] font-medium text-[var(--site-text)]">{project.name}</div>
                                <StatusBadge status={project.status} />
                                <span className="rounded-full bg-[var(--site-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--site-accent)]">
                                  {project.chatCount} chats
                                </span>
                              </div>
                              <div className="mt-2 text-[11px] font-light text-[var(--site-subtle)]">
                                Last active {formatRelativeTime(project.updatedAt)}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                              <button
                                aria-label={`Rename ${project.name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--site-border)] text-[var(--site-subtle)] transition hover:border-[color:var(--site-border-strong)] hover:bg-[var(--site-card)] hover:text-[var(--site-text)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleRenameProject(project);
                                }}
                                type="button"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                aria-label={project.status === "archived" ? `Restore ${project.name}` : `Archive ${project.name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--site-border)] text-[var(--site-subtle)] transition hover:border-[color:var(--site-border-strong)] hover:bg-[var(--site-card)] hover:text-[var(--site-text)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleToggleArchiveProject(project);
                                }}
                                type="button"
                              >
                                {project.status === "archived" ? (
                                  <ArchiveRestore className="h-3.5 w-3.5" />
                                ) : (
                                  <Archive className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                aria-label={`Delete ${project.name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:rgba(239,68,68,0.28)] text-[#ef4444] transition hover:bg-[rgba(239,68,68,0.08)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleDeleteProject(project);
                                }}
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 line-clamp-2 text-[13px] font-light leading-6 text-[var(--site-subtle)]">
                            {project.description || "Workspace for durable context, memory checkpoints, files, and project continuity."}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-light text-[var(--site-subtle)]">
                            <span>
                              Chats <strong className="font-medium text-[var(--site-text)]">{project.chatCount}</strong>
                            </span>
                            <span>
                              Files <strong className="font-medium text-[var(--site-text)]">{project.fileCount}</strong>
                            </span>
                            <span>
                              Project Memory <strong className="font-medium text-[var(--site-text)]">{project.memoryCount}</strong>
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[10px] border border-dashed border-[color:var(--site-border)] px-5 py-10 text-center text-[13px] font-light text-[var(--site-subtle)]">
                    No matching project continuity yet.
                  </div>
                )}
              </div>
            </section>
          </FadeCard>

          <FadeCard delay={0.41}>
            <section className={pageCardClassName}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[14px] font-medium text-[var(--site-text)]">Saved context files</h2>
                <button
                  className="text-[13px] font-medium text-[var(--site-accent)] transition hover:opacity-80"
                  onClick={() => router.push("/chat")}
                  type="button"
                >
                  View all →
                </button>
              </div>

              <div className="mt-5 space-y-2">
                {sortedFiles.length ? (
                  sortedFiles.slice(0, 7).map((file) => (
                    <div
                      className="flex items-start gap-3 rounded-[10px] px-2 py-3 transition duration-150 hover:bg-[var(--site-ghost-bg)]"
                      key={file.id}
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[var(--site-text)]">{file.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[var(--site-accent-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--site-accent)]">
                            {file.kind}
                          </span>
                          <span className="text-[11px] font-light text-[var(--site-subtle)]">{formatRelativeTime(file.updatedAt || file.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[10px] border border-dashed border-[color:var(--site-border)] px-5 py-10 text-center text-[13px] font-light text-[var(--site-subtle)]">
                    No project files saved yet.
                  </div>
                )}
              </div>
            </section>
          </FadeCard>
        </div>

        <FadeCard delay={0.46}>
          <section className={pageCardClassName}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[14px] font-medium text-[var(--site-text)]">Continuity activity</h2>
              <button
                className="inline-flex items-center rounded-full border border-[color:var(--site-border)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--site-subtle)]"
                type="button"
              >
                Last 7 days ▾
              </button>
            </div>

            <div className="mt-6">
              <div className="grid h-[140px] grid-cols-7 items-end gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-4">
                {activitySeries.map((point) => (
                  <div className="flex h-full flex-col justify-end gap-2" key={point.label}>
                    <div className="flex-1 rounded-full bg-[color:var(--site-ghost-bg)] p-[1px]">
                      <div
                        className="w-full rounded-full bg-[var(--site-accent)] transition-all duration-500"
                        style={{ height: `${point.height}%`, minHeight: point.count ? "8px" : "2px", opacity: 0.92 }}
                      />
                    </div>
                    <div className="text-center text-[11px] font-light text-[var(--site-subtle)]">{point.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-0">
              {activityFeed.length ? (
                activityFeed.map((item, index) => (
                  <div
                    className="flex items-center gap-3 border-t border-[color:var(--site-border)] py-3 first:border-t-0 first:pt-0 last:pb-0"
                    key={`${item.title}-${item.timestamp}-${index}`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--site-accent)]" />
                    <div className="min-w-0 flex-1 text-[13px] font-light text-[var(--site-text)]">{item.title}</div>
                    <div className="shrink-0 text-[11px] font-light text-[var(--site-subtle)]">{item.timestamp}</div>
                  </div>
                ))
              ) : (
                <div className="text-[13px] font-light text-[var(--site-subtle)]">No continuity events recorded yet.</div>
              )}
            </div>
          </section>
        </FadeCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Continue Project",
              description: "Resume saved context",
              icon: FolderKanban,
              onClick: () => handleContinueProject(leadProject?.id || null)
            },
            {
              title: "Project Memory",
              description: "Review saved context",
              icon: BrainCircuit,
              onClick: () => router.push("/memory")
            },
            {
              title: "Summarise Previous Work",
              description: "Get the latest recap",
              icon: FileText,
              onClick: () => handleContinueProject(leadProject?.id || null)
            },
            {
              title: "Continue Coding Work",
              description: "Resume development context",
              icon: GitBranch,
              onClick: () => handleContinueProject(leadProject?.id || null)
            }
          ].map((action, index) => (
            <FadeCard delay={0.5 + index * 0.05} key={action.title}>
              <button
                className={cn(
                  pageCardClassName,
                  "flex w-full items-center gap-4 text-left hover:bg-[var(--site-ghost-bg)]"
                )}
                onClick={action.onClick}
                type="button"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
                  <action.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--site-text)]">{action.title}</div>
                  <div className="mt-1 text-[12px] font-light text-[var(--site-subtle)]">{action.description}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--site-accent)]" />
              </button>
            </FadeCard>
          ))}
        </div>
      </div>

      {briefing ? (
        <ContinueProjectBriefing
          onClose={() => setBriefing(null)}
          onResume={handleResumeInChat}
          projectId={briefing.id}
          projectName={briefing.name}
        />
      ) : null}
    </WorkspacePageShell>
  );
}

function FadeCard({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.32, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 600;
    const startedAt = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="font-[Georgia,'Times New Roman',serif] text-[28px] font-normal leading-none tracking-[-0.03em] text-[var(--site-accent)]">
      {displayValue}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = `${status || "active"}`.toLowerCase();
  const tone =
    normalized === "paused"
      ? {
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.24)",
          text: "#d97706",
          label: "PAUSED"
        }
      : normalized === "archived"
        ? {
            bg: "rgba(148, 163, 184, 0.12)",
            border: "rgba(148, 163, 184, 0.24)",
            text: "var(--site-subtle)",
            label: "ARCHIVED"
          }
        : {
            bg: "rgba(34, 197, 94, 0.12)",
            border: "rgba(34, 197, 94, 0.24)",
            text: "#16a34a",
            label: "ACTIVE"
          };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]"
      style={{ backgroundColor: tone.bg, borderColor: tone.border, color: tone.text }}
    >
      {tone.label}
    </span>
  );
}

function buildActivitySeries(toolLogs: ToolLog[]) {
  const formatter = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - (6 - index));
    return {
      date,
      key: date.toISOString().slice(0, 10),
      label: formatter.format(date),
      count: 0
    };
  });

  const counts = new Map(buckets.map((bucket) => [bucket.key, 0]));
  toolLogs.forEach((log) => {
    const key = new Date(log.createdAt).toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });

  const max = Math.max(...Array.from(counts.values()), 1);
  return buckets.map((bucket) => {
    const count = counts.get(bucket.key) || 0;
    return {
      label: bucket.label,
      count,
      height: count ? Math.max((count / max) * 100, 18) : 10
    };
  });
}

function buildActivityFeed(toolLogs: ToolLog[]) {
  return toolLogs
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5)
    .map((log) => ({
      title: normalizeActivityTitle(log.summary, log.tool),
      timestamp: formatRelativeTime(log.createdAt)
    }));
}

function normalizeActivityTitle(summary: string, tool: string) {
  const clean = `${summary || ""}`.trim();
  if (clean) {
    return clean;
  }

  const map: Record<string, string> = {
    file_analysis: "File uploaded",
    save_memory: "Project Memory updated",
    create_project: "New project created"
  };

  return map[tool] || "New workspace action";
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.round(diff / minute))} min ago`;
  }

  if (diff < day) {
    return `${Math.max(1, Math.round(diff / hour))} hours ago`;
  }

  return `${Math.max(1, Math.round(diff / day))} days ago`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}
