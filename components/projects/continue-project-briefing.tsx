"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Lightbulb, Package, X } from "lucide-react";
import { useEffect, useState } from "react";

type BriefItem = { title: string; at?: string; href?: string };
type MemoryEntry = { title: string; content?: string };

type ProjectBrief = {
  summary: string;
  completed: BriefItem[];
  pending: BriefItem[];
  blockers: BriefItem[];
  nextActions: BriefItem[];
  contextPackage: {
    goals: MemoryEntry[];
    requirements: MemoryEntry[];
    decisions: MemoryEntry[];
    constraints: MemoryEntry[];
    architecture: MemoryEntry[];
    facts: MemoryEntry[];
    repo: string | null;
    production: string | null;
    recentFiles: string[];
    recentChats: string[];
    lastActivity: string | null;
  };
  generatedAt: string;
};

const CONTEXT_GROUPS: Array<{ key: keyof ProjectBrief["contextPackage"]; label: string }> = [
  { key: "goals", label: "Goals" },
  { key: "requirements", label: "Requirements" },
  { key: "decisions", label: "Decisions" },
  { key: "constraints", label: "Constraints" },
  { key: "architecture", label: "Architecture" },
  { key: "facts", label: "Facts" }
];

function Section({
  icon: Icon,
  title,
  count,
  tone,
  children
}: {
  icon: typeof CheckCircle2;
  title: string;
  count: number;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: tone }} />
        <h3 className="text-[13px] font-medium text-[var(--site-text)]">{title}</h3>
        <span className="ml-auto text-[11px] text-[var(--site-subtle)]">{count}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ItemList({ items, emptyLabel }: { items: BriefItem[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="text-[12px] italic text-[var(--site-subtle)]">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li className="flex gap-2 text-[13px] leading-6 text-[var(--site-text)]" key={`${item.title}-${index}`}>
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--site-subtle)]" />
          <span>{item.title}</span>
        </li>
      ))}
    </ul>
  );
}

export function ContinueProjectBriefing({
  projectId,
  projectName,
  onClose,
  onResume
}: {
  projectId: string;
  projectName?: string | null;
  onClose: () => void;
  onResume: (projectId: string) => void;
}) {
  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setBrief(null);
    setError(null);
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/continue`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.status === 404 ? "Project not found." : "Could not load the briefing.");
        }
        return response.json();
      })
      .then((payload) => {
        if (active) {
          setBrief(payload.brief as ProjectBrief);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Could not load the briefing.");
        }
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const contextGroups = brief
    ? CONTEXT_GROUPS.map((group) => ({
        ...group,
        entries: (brief.contextPackage[group.key] as MemoryEntry[]) || []
      })).filter((group) => group.entries.length)
    : [];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="w-full max-w-[760px] rounded-[16px] border border-[color:var(--site-border-strong)] bg-[var(--site-bg)] shadow-[0_24px_70px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--site-border)] px-6 py-5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--site-accent)]">
              Continue Project
            </div>
            <h2 className="mt-1 text-[18px] font-semibold text-[var(--site-text)]">
              {projectName || "Project briefing"}
            </h2>
          </div>
          <button
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[color:var(--site-border)] text-[var(--site-subtle)] transition hover:bg-[var(--site-ghost-bg)] hover:text-[var(--site-text)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {error ? (
            <div className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-6 text-center text-[13px] text-[var(--site-subtle)]">
              {error}
            </div>
          ) : !brief ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((row) => (
                <div
                  className="h-16 animate-pulse rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-card)]"
                  key={row}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-4">
                <h3 className="text-[13px] font-medium text-[var(--site-text)]">Summary</h3>
                <p className="mt-2 text-[13px] leading-7 text-[var(--site-subtle)]">{brief.summary}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Section count={brief.completed.length} icon={CheckCircle2} title="Completed" tone="#22c55e">
                  <ItemList emptyLabel="Nothing marked complete yet." items={brief.completed} />
                </Section>
                <Section count={brief.pending.length} icon={CircleDashed} title="Pending" tone="#f59e0b">
                  <ItemList emptyLabel="No pending items." items={brief.pending} />
                </Section>
                <Section count={brief.blockers.length} icon={AlertTriangle} title="Blockers" tone="#ef4444">
                  <ItemList emptyLabel="No blockers recorded." items={brief.blockers} />
                </Section>
                <Section count={brief.nextActions.length} icon={Lightbulb} title="Suggested Next Actions" tone="#3b82f6">
                  <ItemList emptyLabel="No suggestions." items={brief.nextActions} />
                </Section>
              </div>

              <div className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[var(--site-subtle)]" />
                  <h3 className="text-[13px] font-medium text-[var(--site-text)]">Context Package</h3>
                </div>
                <div className="mt-3 space-y-3">
                  {(brief.contextPackage.repo || brief.contextPackage.production) && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[var(--site-subtle)]">
                      {brief.contextPackage.repo ? (
                        <span>
                          <span className="text-[var(--site-text)]">Repo:</span> {brief.contextPackage.repo}
                        </span>
                      ) : null}
                      {brief.contextPackage.production ? (
                        <span>
                          <span className="text-[var(--site-text)]">Production:</span> {brief.contextPackage.production}
                        </span>
                      ) : null}
                    </div>
                  )}
                  {contextGroups.length ? (
                    contextGroups.map((group) => (
                      <div key={group.key as string}>
                        <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--site-subtle)]">
                          {group.label}
                        </div>
                        <ul className="mt-1 space-y-1">
                          {group.entries.map((entry, index) => (
                            <li className="text-[13px] leading-6 text-[var(--site-text)]" key={`${entry.title}-${index}`}>
                              {entry.title}
                              {entry.content ? (
                                <span className="text-[var(--site-subtle)]"> — {entry.content}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] italic text-[var(--site-subtle)]">
                      No saved memory yet. Capture goals, decisions, and requirements in Project Memory so future
                      briefings stay rich.
                    </p>
                  )}
                  {brief.contextPackage.recentFiles.length ? (
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--site-subtle)]">
                        Recent files
                      </div>
                      <p className="mt-1 text-[13px] text-[var(--site-text)]">
                        {brief.contextPackage.recentFiles.join(", ")}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--site-border)] px-6 py-4">
          <span className="text-[11px] text-[var(--site-subtle)]">Readable in under 30 seconds</span>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center justify-center rounded-[8px] border border-[color:var(--site-border)] px-4 py-2 text-[13px] font-medium text-[var(--site-text)] transition hover:bg-[var(--site-ghost-bg)]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--site-accent)] px-4 py-2 text-[13px] font-medium text-[var(--site-inverse)] transition hover:bg-[var(--site-accent-strong)]"
              onClick={() => onResume(projectId)}
              type="button"
            >
              Resume in chat
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
