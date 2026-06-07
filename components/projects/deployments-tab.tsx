"use client";

import { AlertCircle, ExternalLink, Plus, Rocket, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";

type VercelLink = {
  id: string;
  vercelProjectId: string;
  name: string;
  framework: string | null;
  gitRepo: { type: string; repo: string | null; repoId: number | string | null; productionBranch: string | null } | null;
};

type Deployment = { id: string; url: string | null; target: string; state: string; createdAt: number | string | null };
type DeploymentRecord = { id: string; vercelDeploymentId: string; url: string | null; target: string; state: string; createdAt: string };

type VercelProject = {
  id: string;
  name: string;
  framework: string | null;
  gitRepo: { type: string; repo: string | null } | null;
};

type DeploymentsState = {
  configured: boolean;
  link: VercelLink | null;
  deployments: Deployment[];
  records: DeploymentRecord[];
};

type Target = "preview" | "production";

function stateTone(state: string): "live" | "standby" | "learning" {
  const upper = state.toUpperCase();
  if (upper === "READY") return "live";
  if (upper === "ERROR" || upper === "CANCELED") return "standby";
  return "learning";
}

function formatDate(value?: number | string | null) {
  if (!value) return "";
  try {
    return new Date(typeof value === "number" ? value : value).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return "";
  }
}

export function DeploymentsTab({ projectId }: { projectId: string }) {
  const [state, setState] = useState<DeploymentsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<VercelProject[] | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target>("preview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/deployments`, { cache: "no-store" });
      setState((await response.json()) as DeploymentsState);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadProjects() {
    setProjectsLoading(true);
    try {
      const response = await fetch("/api/vercel/projects", { cache: "no-store" });
      const payload = await response.json();
      setProjects(Array.isArray(payload?.projects) ? payload.projects : []);
    } finally {
      setProjectsLoading(false);
    }
  }

  async function linkProject(project: VercelProject) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/vercel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vercelProjectId: project.id })
      });
      if (response.ok) {
        setProjects(null);
        setQuery("");
        await load();
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage(err?.error || "Unable to link the Vercel project.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function unlinkProject() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/vercel`, { method: "DELETE" });
      setProjects(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deploy() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
      if (response.ok) {
        await load();
      } else {
        const err = await response.json().catch(() => ({}));
        setMessage(err?.error || "Unable to trigger the deployment.");
      }
    } finally {
      setBusy(false);
    }
  }

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const lower = query.trim().toLowerCase();
    if (!lower) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(lower));
  }, [projects, query]);

  const history = useMemo(() => {
    if (!state) return [];
    if (state.deployments.length) return state.deployments;
    return state.records.map((record) => ({
      id: record.vercelDeploymentId,
      url: record.url,
      target: record.target,
      state: record.state,
      createdAt: record.createdAt
    }));
  }, [state]);

  const latest = history[0] || null;

  if (loading || !state) {
    return (
      <WorkspaceCard>
        <div className="text-sm text-[var(--site-subtle)]">Loading deployments…</div>
      </WorkspaceCard>
    );
  }

  if (!state.configured) {
    return (
      <WorkspaceCard>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <WorkspaceSectionTitle>Vercel isn&apos;t configured</WorkspaceSectionTitle>
            <p className="mt-2 max-w-[44rem] text-sm leading-7 text-[var(--site-subtle)]">
              Set <code className="rounded bg-[var(--site-ghost-bg)] px-1">VERCEL_TOKEN</code> on the server (optionally{" "}
              <code className="rounded bg-[var(--site-ghost-bg)] px-1">VERCEL_TEAM_ID</code>) to deploy projects through Vercel. The token stays server-side and is never exposed to the browser.
            </p>
          </div>
        </div>
      </WorkspaceCard>
    );
  }

  // Configured but no Vercel project linked -> picker
  if (!state.link) {
    return (
      <WorkspaceCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <WorkspaceSectionTitle>Link a Vercel project</WorkspaceSectionTitle>
            <p className="mt-2 max-w-[44rem] text-sm leading-7 text-[var(--site-subtle)]">
              Choose the Vercel project to deploy this Xeivora project to.
            </p>
          </div>
          {projects === null ? (
            <WorkspaceButton disabled={projectsLoading} onClick={() => void loadProjects()}>
              <Rocket className="h-4 w-4" />
              {projectsLoading ? "Loading…" : "Browse Vercel projects"}
            </WorkspaceButton>
          ) : null}
        </div>

        {message ? <p className="mt-3 text-[13px] text-[rgba(239,68,68,0.8)]">{message}</p> : null}

        {projects !== null ? (
          <div className="mt-5 space-y-4">
            <label className="flex h-11 items-center gap-3 rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4">
              <Search className="h-4 w-4 text-[var(--site-subtle)]" />
              <input
                className="w-full bg-transparent text-sm text-[var(--site-text)] outline-none placeholder:text-[var(--site-subtle)]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Vercel projects"
                value={query}
              />
            </label>

            {filteredProjects.length ? (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {filteredProjects.map((project) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-4"
                    key={project.id}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--site-text)]">{project.name}</div>
                      <div className="mt-1 text-[12px] text-[var(--site-subtle)]">
                        {project.framework || "project"}
                        {project.gitRepo?.repo ? ` · ${project.gitRepo.repo}` : ""}
                      </div>
                    </div>
                    <WorkspaceButton disabled={busy} onClick={() => void linkProject(project)} variant="secondary">
                      <Plus className="h-4 w-4" />
                      Link
                    </WorkspaceButton>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-[10px] border border-dashed border-[color:var(--site-border-strong)] px-4 py-6 text-center text-[13px] text-[var(--site-subtle)]">
                No Vercel projects match.
              </p>
            )}
          </div>
        ) : null}
      </WorkspaceCard>
    );
  }

  // Linked -> deploy controls + status + history
  const link = state.link;
  return (
    <div className="space-y-5">
      <WorkspaceCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-semibold text-[var(--site-text)]">{link.name}</h2>
                {link.framework ? <WorkspaceBadge tone="standby">{link.framework}</WorkspaceBadge> : null}
              </div>
              <div className="mt-1 text-[13px] text-[var(--site-subtle)]">
                Vercel project
                {link.gitRepo?.repo ? ` · ${link.gitRepo.repo}` : ""}
                {link.gitRepo?.productionBranch ? ` · ${link.gitRepo.productionBranch}` : ""}
              </div>
            </div>
          </div>
          <WorkspaceButton disabled={busy} onClick={() => void unlinkProject()} variant="danger">
            <Trash2 className="h-4 w-4" />
            Unlink
          </WorkspaceButton>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[color:var(--site-border)] pt-5">
          <div className="inline-flex items-center gap-1 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-1">
            {(["preview", "production"] as Target[]).map((value) => (
              <button
                className={`inline-flex h-8 items-center rounded-[8px] px-3 text-[12px] font-medium capitalize transition ${
                  target === value
                    ? "bg-[var(--site-accent-soft)] text-[var(--site-accent)]"
                    : "text-[var(--site-subtle)] hover:bg-[var(--site-ghost-bg)] hover:text-[var(--site-text)]"
                }`}
                key={value}
                onClick={() => setTarget(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
          <WorkspaceButton disabled={busy} onClick={() => void deploy()}>
            <Rocket className="h-4 w-4" />
            {busy ? "Deploying…" : `Deploy ${target}`}
          </WorkspaceButton>
          {latest ? (
            <div className="flex items-center gap-2 text-[13px] text-[var(--site-subtle)]">
              <span>Latest:</span>
              <WorkspaceBadge tone={stateTone(latest.state)}>{latest.state.toLowerCase()}</WorkspaceBadge>
              {latest.url ? (
                <a
                  className="inline-flex items-center gap-1 text-[var(--site-accent)] hover:underline"
                  href={latest.url}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {latest.url.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {message ? <p className="mt-3 text-[13px] text-[rgba(239,68,68,0.8)]">{message}</p> : null}
      </WorkspaceCard>

      <WorkspaceCard>
        <div className="flex items-center justify-between">
          <WorkspaceSectionTitle>Deployment history</WorkspaceSectionTitle>
          <WorkspaceBadge tone="standby">{history.length}</WorkspaceBadge>
        </div>
        <div className="mt-4 space-y-2">
          {history.length ? (
            history.map((dep) => (
              <div
                className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-3"
                key={dep.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <WorkspaceBadge tone={stateTone(dep.state)}>{dep.state.toLowerCase()}</WorkspaceBadge>
                  <span className="text-[12px] uppercase tracking-[0.06em] text-[var(--site-subtle)]">{dep.target}</span>
                  {dep.url ? (
                    <a
                      className="inline-flex items-center gap-1 truncate text-[13px] text-[var(--site-accent)] hover:underline"
                      href={dep.url}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {dep.url.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : null}
                </div>
                <span className="shrink-0 text-[12px] text-[var(--site-subtle)]">{formatDate(dep.createdAt)}</span>
              </div>
            ))
          ) : (
            <WorkspaceEmptyState
              description="Trigger a preview or production deployment to start recording deployment history here."
              title="No deployments yet"
            />
          )}
        </div>
      </WorkspaceCard>
    </div>
  );
}
