"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

export type PreviewSideTabKey = "files" | "timeline" | "memory" | "deployments";

type FileItem = { id: string; name: string; kind: string; summary?: string | null };
type MemoryItem = { id: string; title: string; content?: string; section?: string };
type TimelineEvent = { id: string; kind: string; title: string; detail: string; at: string };
type DeploymentRecord = { id: string; vercelDeploymentId: string; url: string | null; target: string; state: string; createdAt: string };
type LiveDeployment = { id: string; url: string | null; target: string; state: string; createdAt: number | string | null };
type VercelLink = { name: string; framework?: string | null } | null;

function relativeTime(value?: string | number | null) {
  if (!value) return "";
  const then = new Date(typeof value === "number" ? value : value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const rowClass =
  "rounded-[12px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-3 py-2.5";

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--xv-chat-border)] px-4 py-8 text-center text-[13px] text-[var(--xv-chat-muted)]">
      {label}
    </div>
  );
}

export function PreviewSideTab({ projectId, tab }: { projectId: string | null; tab: PreviewSideTabKey }) {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [deployments, setDeployments] = useState<LiveDeployment[]>([]);
  const [deployRecords, setDeployRecords] = useState<DeploymentRecord[]>([]);
  const [vercelLink, setVercelLink] = useState<VercelLink>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const url =
      tab === "files"
        ? `/api/files?projectId=${encodeURIComponent(projectId)}`
        : tab === "memory"
          ? `/api/memory?projectId=${encodeURIComponent(projectId)}`
          : tab === "deployments"
            ? `/api/projects/${encodeURIComponent(projectId)}/deployments`
            : `/api/projects/${encodeURIComponent(projectId)}`;

    void fetch(url, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        if (tab === "files") {
          setFiles(Array.isArray(payload) ? payload : []);
        } else if (tab === "memory") {
          setMemory(Array.isArray(payload) ? payload : []);
        } else if (tab === "timeline") {
          setTimeline(Array.isArray(payload?.timeline) ? payload.timeline : []);
        } else if (tab === "deployments") {
          setDeployments(Array.isArray(payload?.deployments) ? payload.deployments : []);
          setDeployRecords(Array.isArray(payload?.records) ? payload.records : []);
          setVercelLink(payload?.link || null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, tab]);

  if (!projectId) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <Empty label="Attach this chat to a project to see its files, timeline, memory, and deployments here." />
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 text-[13px] text-[var(--xv-chat-muted)]">Loading…</div>;
  }

  if (tab === "files") {
    return (
      <div className="h-full space-y-2 overflow-y-auto p-4">
        {files.length ? (
          files.map((file) => (
            <div className={rowClass} key={file.id}>
              <div className="truncate text-[13px] font-medium text-[var(--xv-chat-text)]">{file.name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.06em] text-[var(--xv-chat-muted)]">{file.kind}</div>
            </div>
          ))
        ) : (
          <Empty label="No files attached to this project yet." />
        )}
      </div>
    );
  }

  if (tab === "memory") {
    return (
      <div className="h-full space-y-2 overflow-y-auto p-4">
        {memory.length ? (
          memory.map((item) => (
            <div className={rowClass} key={item.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[13px] font-medium text-[var(--xv-chat-text)]">{item.title}</div>
                {item.section ? (
                  <span className="shrink-0 rounded-full bg-[var(--xv-chat-ghost-bg)] px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--xv-chat-muted)]">
                    {item.section}
                  </span>
                ) : null}
              </div>
              {item.content ? (
                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--xv-chat-muted)]">{item.content}</p>
              ) : null}
            </div>
          ))
        ) : (
          <Empty label="No project memory yet." />
        )}
      </div>
    );
  }

  if (tab === "timeline") {
    return (
      <div className="h-full space-y-2 overflow-y-auto p-4">
        {timeline.length ? (
          timeline.map((event) => (
            <div className={rowClass} key={event.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[13px] font-medium text-[var(--xv-chat-text)]">{event.title}</div>
                <span className="shrink-0 text-[11px] text-[var(--xv-chat-muted)]">{relativeTime(event.at)}</span>
              </div>
              {event.detail ? (
                <div className="mt-0.5 truncate text-[12px] text-[var(--xv-chat-muted)]">{event.detail}</div>
              ) : null}
            </div>
          ))
        ) : (
          <Empty label="No project events yet." />
        )}
      </div>
    );
  }

  // deployments
  const history = deployments.length
    ? deployments
    : deployRecords.map((record) => ({
        id: record.vercelDeploymentId,
        url: record.url,
        target: record.target,
        state: record.state,
        createdAt: record.createdAt
      }));
  const latest = history[0] || null;

  return (
    <div className="h-full space-y-3 overflow-y-auto p-4">
      {vercelLink ? (
        <div className={rowClass}>
          <div className="text-[13px] font-medium text-[var(--xv-chat-text)]">{vercelLink.name}</div>
          <div className="mt-0.5 text-[11px] text-[var(--xv-chat-muted)]">
            Vercel project{vercelLink.framework ? ` · ${vercelLink.framework}` : ""}
          </div>
          {latest ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[var(--xv-chat-muted)]">
              <span className="rounded-full bg-[var(--xv-chat-ghost-bg)] px-2 py-0.5 text-[11px] text-[var(--xv-chat-text)]">
                {latest.state.toLowerCase()}
              </span>
              <span>{latest.target}</span>
              {latest.url ? (
                <a
                  className="inline-flex items-center gap-1 text-[var(--xv-chat-accent)] hover:underline"
                  href={latest.url}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {latest.url.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 text-[12px] text-[var(--xv-chat-muted)]">No deployments yet.</div>
          )}
        </div>
      ) : (
        <Empty label="No Vercel project linked. Link one from the Deployments tab in the project workspace." />
      )}

      {history.slice(0, 12).map((dep) => (
        <div className={rowClass} key={dep.id}>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-[var(--xv-chat-ghost-bg)] px-2 py-0.5 text-[11px] text-[var(--xv-chat-text)]">
              {dep.state.toLowerCase()}
            </span>
            <span className="text-[11px] text-[var(--xv-chat-muted)]">{relativeTime(dep.createdAt)}</span>
          </div>
          {dep.url ? (
            <a
              className="mt-1 inline-flex items-center gap-1 truncate text-[12px] text-[var(--xv-chat-accent)] hover:underline"
              href={dep.url}
              rel="noreferrer noopener"
              target="_blank"
            >
              {dep.url.replace(/^https?:\/\//, "")}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}
