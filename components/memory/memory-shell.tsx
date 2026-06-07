"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSearchInput,
  WorkspaceSectionTitle,
  WorkspaceTextArea
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import type { WorkspaceProject } from "@/lib/chat-types";

type MemorySection = "goals" | "requirements" | "decisions" | "constraints" | "architecture" | "facts";

type MemoryItem = {
  id: string;
  type: string;
  section?: MemorySection | string;
  projectId?: string | null;
  title: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const SECTIONS: Array<{ key: MemorySection; label: string; hint: string }> = [
  { key: "goals", label: "Goals", hint: "What this project is trying to achieve." },
  { key: "requirements", label: "Requirements", hint: "What the work must include or satisfy." },
  { key: "decisions", label: "Decisions", hint: "Choices that have been locked in." },
  { key: "constraints", label: "Constraints", hint: "Limits, budgets, deadlines, and boundaries." },
  { key: "architecture", label: "Architecture Notes", hint: "How the system is structured." },
  { key: "facts", label: "Important Facts", hint: "Anything else worth remembering." }
];

function normalizeSection(value?: string): MemorySection {
  return SECTIONS.some((section) => section.key === value) ? (value as MemorySection) : "facts";
}

export function MemoryShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<{ section: MemorySection; title: string; content: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setProjects(Array.isArray(payload) ? payload : []));
  }, []);

  const projectId = searchParams.get("project") || projects[0]?.id || null;
  const activeProject = projects.find((project) => project.id === projectId) || null;

  useEffect(() => {
    const suffix = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    void fetch(`/api/memory${suffix}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setItems(Array.isArray(payload) ? payload : []));
  }, [projectId]);

  const filteredItems = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) {
      return items;
    }
    return items.filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(lower));
  }, [items, query]);

  const grouped = useMemo(() => {
    const map: Record<MemorySection, MemoryItem[]> = {
      goals: [],
      requirements: [],
      decisions: [],
      constraints: [],
      architecture: [],
      facts: []
    };
    for (const item of filteredItems) {
      map[normalizeSection(item.section)].push(item);
    }
    return map;
  }, [filteredItems]);

  async function handleSaveDraft() {
    if (!draft || !draft.title.trim() || saving) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          section: draft.section,
          title: draft.title.trim(),
          content: draft.content.trim(),
          type: "reusable_context",
          enabled: true
        })
      });
      const item = (await response.json()) as MemoryItem;
      setItems((current) => [item, ...current]);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/memory/${id}`, { method: "DELETE" });
    if (!response.ok) {
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <WorkspacePageShell statusLabel="Project Memory" viewer={viewer}>
      <div className="space-y-6 md:space-y-7">
        <WorkspacePageHero
          actions={
            <WorkspaceButton onClick={() => setDraft({ section: "goals", title: "", content: "" })}>
              <Plus className="h-4 w-4" />
              Add memory
            </WorkspaceButton>
          }
          description="Keep decisions, requirements, constraints, and facts here so Xeivora can continue this project across models without losing context."
          eyebrow="Project memory"
          title="Persistent memory that survives model switches"
        />

        <WorkspaceCard className="p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <WorkspaceSectionTitle>{activeProject?.name || "Project memory"}</WorkspaceSectionTitle>
              <p className="mt-2 max-w-[46rem] text-sm leading-7 text-[var(--site-subtle)]">
                Project Memory is the permanent memory of this project — its goals, requirements, decisions, constraints, architecture, and key facts stay available whenever you continue the work.
              </p>
            </div>
            <WorkspaceBadge tone="learning">{items.length} entries in this project</WorkspaceBadge>
          </div>
        </WorkspaceCard>

        <WorkspaceSearchInput onChange={setQuery} placeholder="Search project memory" value={query} />

        {items.length === 0 ? (
          <WorkspaceEmptyState
            action={
              <WorkspaceButton onClick={() => setDraft({ section: "goals", title: "", content: "" })}>
                <Plus className="h-4 w-4" />
                Add the first memory
              </WorkspaceButton>
            }
            description="Capture this project's goals, requirements, decisions, constraints, architecture notes, and important facts so Xeivora remembers them across every model."
            title="No project memory yet"
          />
        ) : (
          <div className="space-y-6">
            {SECTIONS.map((section) => (
              <WorkspaceCard className="p-5 md:p-6" key={section.key}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <WorkspaceSectionTitle>{section.label}</WorkspaceSectionTitle>
                    <p className="mt-1 text-[13px] text-[var(--site-subtle)]">{section.hint}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <WorkspaceBadge tone="standby">{grouped[section.key].length}</WorkspaceBadge>
                    <button
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--site-accent)] transition hover:underline"
                      onClick={() => setDraft({ section: section.key, title: "", content: "" })}
                      type="button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>

                {grouped[section.key].length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {grouped[section.key].map((item) => (
                      <div
                        className="flex flex-col justify-between rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-4"
                        key={item.id}
                      >
                        <div>
                          <h3 className="text-[14px] font-medium text-[var(--site-text)]">{item.title}</h3>
                          {item.content ? (
                            <p className="mt-2 text-[13px] leading-6 text-[var(--site-subtle)]">{item.content}</p>
                          ) : null}
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-[color:var(--site-border)] pt-3">
                          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--site-subtle)]">
                            {new Date(item.updatedAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                          <button
                            className="inline-flex items-center gap-1.5 text-[12px] text-[rgba(239,68,68,0.6)] transition-colors hover:text-[rgba(239,68,68,0.9)]"
                            onClick={() => void handleDelete(item.id)}
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-[10px] border border-dashed border-[color:var(--site-border-strong)] bg-[var(--site-panel)] px-4 py-6 text-center text-[13px] text-[var(--site-subtle)]">
                    Nothing here yet.
                  </p>
                )}
              </WorkspaceCard>
            ))}
          </div>
        )}
      </div>

      {draft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setDraft(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-[480px] rounded-[12px] border border-[color:var(--site-border-strong)] bg-[var(--site-card)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <WorkspaceSectionTitle>Add to project memory</WorkspaceSectionTitle>
            <div className="mt-6 space-y-5">
              <WorkspaceField label="Section">
                <select
                  className="h-11 rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4 text-sm text-[var(--site-text)] outline-none focus:border-[var(--site-accent)]"
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, section: event.target.value as MemorySection } : current))
                  }
                  value={draft.section}
                >
                  {SECTIONS.map((section) => (
                    <option key={section.key} value={section.key}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </WorkspaceField>
              <WorkspaceField label="Title">
                <WorkspaceInput
                  autoFocus
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, title: event.target.value } : current))
                  }
                  placeholder="e.g. Ship the launch microsite by Q3"
                  value={draft.title}
                />
              </WorkspaceField>
              <WorkspaceField label="Details">
                <WorkspaceTextArea
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, content: event.target.value } : current))
                  }
                  placeholder="What should Xeivora remember about this?"
                  value={draft.content}
                />
              </WorkspaceField>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <WorkspaceButton onClick={() => setDraft(null)} variant="secondary">
                Cancel
              </WorkspaceButton>
              <WorkspaceButton disabled={saving || !draft.title.trim()} onClick={() => void handleSaveDraft()}>
                {saving ? "Saving…" : "Save memory"}
              </WorkspaceButton>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspacePageShell>
  );
}
