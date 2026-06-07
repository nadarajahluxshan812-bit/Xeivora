"use client";

import {
  AlertCircle,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  GitGraph,
  History,
  Plus,
  Search,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";

type RepoLink = {
  id: string;
  projectId: string;
  owner: string;
  repo: string;
  fullName: string;
  url?: string | null;
  defaultBranch?: string;
  private?: boolean;
};

type Branch = { name: string; protected: boolean; sha: string | null };
type Commit = { sha: string; shortSha: string; message: string; author: string; date: string | null; url: string };
type Pull = {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  author: string;
  branch: string | null;
  base: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
};
type RepoOption = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string;
  defaultBranch: string;
  url: string;
  language: string | null;
  updatedAt: string;
};

type GitHubState = {
  configured: boolean;
  connected: boolean;
  accountLabel: string | null;
  repo: RepoLink | null;
  branches: Branch[];
  commits: Commit[];
  pulls: Pull[];
};

type SubTab = "branches" | "commits" | "pulls";

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function GitHubTab({ projectId }: { projectId: string }) {
  const [state, setState] = useState<GitHubState | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>("commits");
  const [repos, setRepos] = useState<RepoOption[] | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoQuery, setRepoQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/github`, { cache: "no-store" });
      const payload = (await response.json()) as GitHubState;
      setState(payload);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadRepos() {
    setReposLoading(true);
    try {
      const response = await fetch("/api/github/repos", { cache: "no-store" });
      const payload = await response.json();
      setRepos(Array.isArray(payload?.repos) ? payload.repos : []);
    } finally {
      setReposLoading(false);
    }
  }

  async function connectRepo(repo: RepoOption) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: repo.owner, repo: repo.name })
      });
      if (response.ok) {
        setRepos(null);
        setRepoQuery("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function disconnectRepo() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/github`, { method: "DELETE" });
      setRepos(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const filteredRepos = useMemo(() => {
    if (!repos) return [];
    const lower = repoQuery.trim().toLowerCase();
    if (!lower) return repos;
    return repos.filter((repo) => `${repo.fullName} ${repo.description}`.toLowerCase().includes(lower));
  }, [repos, repoQuery]);

  if (loading || !state) {
    return (
      <WorkspaceCard>
        <div className="text-sm text-[var(--site-subtle)]">Loading GitHub…</div>
      </WorkspaceCard>
    );
  }

  // Not configured on this server
  if (!state.configured) {
    return (
      <WorkspaceCard>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <WorkspaceSectionTitle>GitHub isn&apos;t configured</WorkspaceSectionTitle>
            <p className="mt-2 max-w-[44rem] text-sm leading-7 text-[var(--site-subtle)]">
              Set <code className="rounded bg-[var(--site-ghost-bg)] px-1">GITHUB_CLIENT_ID</code> and{" "}
              <code className="rounded bg-[var(--site-ghost-bg)] px-1">GITHUB_CLIENT_SECRET</code> on the server to enable connecting GitHub repositories to projects.
            </p>
          </div>
        </div>
      </WorkspaceCard>
    );
  }

  // GitHub account not connected
  if (!state.connected) {
    return (
      <WorkspaceCard>
        <div className="flex flex-col items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
            <GitGraph className="h-5 w-5" />
          </div>
          <div>
            <WorkspaceSectionTitle>Connect your GitHub account</WorkspaceSectionTitle>
            <p className="mt-2 max-w-[44rem] text-sm leading-7 text-[var(--site-subtle)]">
              Authorize GitHub once to browse your repositories, then attach a repository to this project to track branches, commits, and pull requests.
            </p>
          </div>
          <WorkspaceButton onClick={() => { window.location.href = "/api/integrations/github/auth"; }}>
            <GitGraph className="h-4 w-4" />
            Connect GitHub
          </WorkspaceButton>
        </div>
      </WorkspaceCard>
    );
  }

  // Connected, but no repository attached -> repository picker
  if (!state.repo) {
    return (
      <div className="space-y-5">
        <WorkspaceCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <WorkspaceSectionTitle>Select a repository</WorkspaceSectionTitle>
              <p className="mt-2 max-w-[44rem] text-sm leading-7 text-[var(--site-subtle)]">
                Connected as <span className="text-[var(--site-text)]">{state.accountLabel || "GitHub"}</span>. Choose a repository to attach to this project.
              </p>
            </div>
            {repos === null ? (
              <WorkspaceButton disabled={reposLoading} onClick={() => void loadRepos()}>
                <GitGraph className="h-4 w-4" />
                {reposLoading ? "Loading…" : "Browse repositories"}
              </WorkspaceButton>
            ) : null}
          </div>

          {repos !== null ? (
            <div className="mt-5 space-y-4">
              <label className="flex h-11 items-center gap-3 rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4">
                <Search className="h-4 w-4 text-[var(--site-subtle)]" />
                <input
                  className="w-full bg-transparent text-sm text-[var(--site-text)] outline-none placeholder:text-[var(--site-subtle)]"
                  onChange={(event) => setRepoQuery(event.target.value)}
                  placeholder="Search your repositories"
                  value={repoQuery}
                />
              </label>

              {filteredRepos.length ? (
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredRepos.map((repo) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-4"
                      key={repo.id}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-[var(--site-text)]">{repo.fullName}</span>
                          {repo.private ? <WorkspaceBadge tone="standby">private</WorkspaceBadge> : null}
                        </div>
                        {repo.description ? (
                          <p className="mt-1 truncate text-[13px] text-[var(--site-subtle)]">{repo.description}</p>
                        ) : null}
                      </div>
                      <WorkspaceButton disabled={busy} onClick={() => void connectRepo(repo)} variant="secondary">
                        <Plus className="h-4 w-4" />
                        Connect
                      </WorkspaceButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-[10px] border border-dashed border-[color:var(--site-border-strong)] px-4 py-6 text-center text-[13px] text-[var(--site-subtle)]">
                  No repositories match.
                </p>
              )}
            </div>
          ) : null}
        </WorkspaceCard>
      </div>
    );
  }

  // Repository attached -> branches / commits / pull requests
  const repo = state.repo;
  const subTabs: Array<{ key: SubTab; label: string; count: number; icon: typeof GitBranch }> = [
    { key: "commits", label: "Commits", count: state.commits.length, icon: History },
    { key: "branches", label: "Branches", count: state.branches.length, icon: GitBranch },
    { key: "pulls", label: "Pull Requests", count: state.pulls.length, icon: GitPullRequest }
  ];

  return (
    <div className="space-y-5">
      <WorkspaceCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
              <GitGraph className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-semibold text-[var(--site-text)]">{repo.fullName}</h2>
                {repo.private ? <WorkspaceBadge tone="standby">private</WorkspaceBadge> : null}
                <WorkspaceBadge tone="learning">{repo.defaultBranch || "main"}</WorkspaceBadge>
              </div>
              {repo.url ? (
                <a
                  className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-[var(--site-accent)] hover:underline"
                  href={repo.url}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Open on GitHub
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>
          <WorkspaceButton disabled={busy} onClick={() => void disconnectRepo()} variant="danger">
            <Trash2 className="h-4 w-4" />
            Disconnect
          </WorkspaceButton>
        </div>
      </WorkspaceCard>

      <div className="inline-flex items-center gap-1 rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-1">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={`inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-[12px] font-medium transition ${
                subTab === tab.key
                  ? "bg-[var(--site-accent-soft)] text-[var(--site-accent)]"
                  : "text-[var(--site-subtle)] hover:bg-[var(--site-ghost-bg)] hover:text-[var(--site-text)]"
              }`}
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              type="button"
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className="rounded-full bg-[var(--site-ghost-bg)] px-1.5 text-[11px]">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {subTab === "commits" ? (
        <WorkspaceCard>
          {state.commits.length ? (
            <div className="space-y-3">
              {state.commits.map((commit) => (
                <a
                  className="flex items-start gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-3 transition hover:border-[color:var(--site-border-strong)]"
                  href={commit.url}
                  key={commit.sha}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <code className="mt-0.5 rounded bg-[var(--site-ghost-bg)] px-1.5 py-0.5 text-[11px] text-[var(--site-subtle)]">
                    {commit.shortSha}
                  </code>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-[var(--site-text)]">{commit.message}</div>
                    <div className="mt-1 text-[12px] text-[var(--site-subtle)]">
                      {commit.author} · {formatDate(commit.date)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState description="No commits found on this repository yet." title="No commits" />
          )}
        </WorkspaceCard>
      ) : null}

      {subTab === "branches" ? (
        <WorkspaceCard>
          {state.branches.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {state.branches.map((branch) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-3"
                  key={branch.name}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <GitBranch className="h-4 w-4 shrink-0 text-[var(--site-accent)]" />
                    <span className="truncate text-sm text-[var(--site-text)]">{branch.name}</span>
                  </div>
                  {branch.protected ? <WorkspaceBadge tone="standby">protected</WorkspaceBadge> : null}
                </div>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState description="No branches found." title="No branches" />
          )}
        </WorkspaceCard>
      ) : null}

      {subTab === "pulls" ? (
        <WorkspaceCard>
          {state.pulls.length ? (
            <div className="space-y-3">
              {state.pulls.map((pull) => (
                <a
                  className="flex items-start gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-3 transition hover:border-[color:var(--site-border-strong)]"
                  href={pull.url}
                  key={pull.number}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <GitPullRequest
                    className={`mt-0.5 h-4 w-4 shrink-0 ${pull.state === "open" ? "text-[#22c55e]" : "text-[var(--site-subtle)]"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm text-[var(--site-text)]">
                        #{pull.number} {pull.title}
                      </span>
                      <WorkspaceBadge tone={pull.state === "open" ? "live" : "standby"}>
                        {pull.draft ? "draft" : pull.state}
                      </WorkspaceBadge>
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--site-subtle)]">
                      {pull.author} · {pull.branch} → {pull.base} · {formatDate(pull.updatedAt)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState description="No pull requests found." title="No pull requests" />
          )}
        </WorkspaceCard>
      ) : null}
    </div>
  );
}
