"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSearchInput,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";

type MemoryItem = {
  id: string;
  type: string;
  title: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export function MemoryShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetch("/api/memory", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setItems(payload || []));
  }, []);

  const filteredItems = useMemo(() => {
    const lower = query.toLowerCase();
    return items.filter((item) => `${item.title} ${item.content} ${item.type}`.toLowerCase().includes(lower));
  }, [items, query]);

  async function handleCreateMemory() {
    const response = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reusable_context",
        title: "New project checkpoint",
        content: "Add the decisions, progress, and next steps Xeivora should remember.",
        enabled: true
      })
    });
    const item = (await response.json()) as MemoryItem;
    setItems((current) => [item, ...current]);
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/memory/${id}`, { method: "DELETE" });
    if (!response.ok) {
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <WorkspacePageShell statusLabel="Project Brain" viewer={viewer}>
      <div className="space-y-10">
        <WorkspacePageHero
          actions={
            <WorkspaceButton onClick={() => void handleCreateMemory()}>
              <Plus className="h-4 w-4" />
              Save memory checkpoint
            </WorkspaceButton>
          }
          description="Keep decisions, progress notes, reusable prompts, and project facts here so Xeivora can continue work across models without losing context."
          eyebrow="Project memory"
          title="Persistent memory that survives model switches"
        />

        <WorkspaceCard className="p-6">
          <WorkspaceSectionTitle>What Project Brain stores</WorkspaceSectionTitle>
          <p className="mt-3 max-w-[42rem] text-sm leading-7 text-[var(--site-subtle)]">
            Project Brain is Xeivora&apos;s permanent memory of your work. It keeps the parts of a project that should survive model switches and long gaps between sessions.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Decisions",
              "Key conversations",
              "Goals",
              "Files",
              "Summaries",
              "Progress",
              "Action items",
              "Project history"
            ].map((item) => (
              <WorkspaceBadge key={item} tone="learning">
                {item}
              </WorkspaceBadge>
            ))}
          </div>
        </WorkspaceCard>

        <WorkspaceSearchInput onChange={setQuery} placeholder="Search saved context" value={query} />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <WorkspaceCard className="flex h-full flex-col justify-between p-6" key={item.id}>
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-medium text-[var(--site-text)]">{item.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--site-subtle)]">{item.content}</p>
                  </div>
                  <WorkspaceBadge tone={item.enabled ? "learning" : "standby"}>
                    {item.enabled ? item.type.replaceAll("_", " ") : "disabled"}
                  </WorkspaceBadge>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[color:var(--site-border)] pt-4">
                <span className="text-xs uppercase tracking-[0.08em] text-[var(--site-subtle)]">
                  {new Date(item.updatedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}
                </span>
                <button
                  className="inline-flex items-center gap-2 text-sm text-[rgba(239,68,68,0.6)] transition-colors hover:text-[rgba(239,68,68,0.9)]"
                  onClick={() => void handleDelete(item.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </WorkspaceCard>
          ))}

          <button
            className="flex min-h-[240px] flex-col items-center justify-center rounded-[8px] border border-dashed border-[color:var(--site-border-strong)] bg-[var(--site-panel)] text-center transition-colors hover:border-[var(--site-accent)]"
            onClick={() => void handleCreateMemory()}
            type="button"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent)]">
              <Plus className="h-5 w-5" />
            </div>
            <div className="mt-4 text-sm text-[var(--site-subtle)]">Add memory checkpoint</div>
          </button>
        </div>

        {items.length > 0 && !filteredItems.length ? (
          <WorkspaceCard>
            <WorkspaceSectionTitle>No memory matches yet</WorkspaceSectionTitle>
            <p className="mt-3 max-w-[36rem] text-sm leading-7 text-[var(--site-subtle)]">
              Try a different search term or save a new checkpoint so Xeivora can resume the work later.
            </p>
          </WorkspaceCard>
        ) : null}

        {!items.length ? (
          <WorkspaceEmptyState
            action={
              <WorkspaceButton onClick={() => void handleCreateMemory()}>
                <Plus className="h-4 w-4" />
                Save memory checkpoint
              </WorkspaceButton>
            }
            description="Store project facts, recurring preferences, and continuity checkpoints so Xeivora remembers what matters across every model."
            title="No project memory yet"
          />
        ) : null}
      </div>
    </WorkspacePageShell>
  );
}
