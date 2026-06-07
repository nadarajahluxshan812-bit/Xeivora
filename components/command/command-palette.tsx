"use client";

import {
  ArrowRight,
  BrainCircuit,
  FileText,
  FolderKanban,
  Lightbulb,
  MessageSquareText,
  Monitor,
  Plus,
  Search
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ContinueProjectBriefing } from "@/components/projects/continue-project-briefing";

const {
  CATEGORY_LABELS,
  groupResults,
  matchStaticActions,
  continueProjectMatches
} = require("@/lib/command-palette-core");

type SearchResult = {
  id: string;
  category: string;
  title: string;
  excerpt?: string;
  href?: string;
  projectId?: string | null;
  updatedAt?: string;
};

type WorkspaceProject = { id: string; name: string; description?: string; updatedAt?: string };

type Entry = {
  key: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  group: string;
  onSelect: () => void;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  chat: MessageSquareText,
  file: FileText,
  memory: BrainCircuit,
  decision: Lightbulb,
  timeline: Monitor,
  task: FolderKanban
};

const STATIC_ACTIONS = [
  { id: "new-chat", label: "New Chat", keywords: "conversation message ask", href: "/chat", icon: MessageSquareText },
  { id: "create-project", label: "Create Project", keywords: "new add", href: "/dashboard", icon: Plus },
  { id: "open-files", label: "Open Files", keywords: "documents upload assets", href: "/files", icon: FileText },
  { id: "open-timeline", label: "Open Timeline", keywords: "history events", href: "/timeline", icon: Monitor },
  { id: "open-memory", label: "Open Memory", keywords: "decisions notes context", href: "/memory", icon: BrainCircuit }
] as const;

function detectCurrentProjectId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const path = window.location.pathname;
  const dashboardMatch = path.match(/^\/dashboard\/([^/?#]+)/);
  if (dashboardMatch) {
    return decodeURIComponent(dashboardMatch[1]);
  }
  const param = new URLSearchParams(window.location.search).get("project");
  return param || null;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<{ id: string; name: string | null } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(0);
  }, []);

  // Global Cmd/Ctrl+K toggle.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On open: focus input, detect current project, load project list once.
  useEffect(() => {
    if (!open) {
      return;
    }
    setCurrentProjectId(detectCurrentProjectId());
    window.setTimeout(() => inputRef.current?.focus(), 10);
    if (!projects.length) {
      void fetch("/api/projects", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : []))
        .then((payload) => setProjects(Array.isArray(payload) ? payload : []))
        .catch(() => undefined);
    }
  }, [open, projects.length]);

  // Debounced search.
  useEffect(() => {
    if (!open) {
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
        signal: controller.signal
      })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((payload) => setResults(Array.isArray(payload?.results) ? payload.results : []))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 150);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const openBriefing = useCallback(
    (id: string, name: string | null) => {
      setBriefing({ id, name });
      close();
    },
    [close]
  );

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  // Build the flat, ordered entry list (also used for keyboard nav).
  const { sections, flat } = useMemo(() => {
    const continueProjects = continueProjectMatches(projects, query, currentProjectId) as WorkspaceProject[];
    const staticActions = matchStaticActions([...STATIC_ACTIONS], query) as Array<
      (typeof STATIC_ACTIONS)[number]
    >;
    const groups = groupResults(results, currentProjectId) as Array<{
      category: string;
      label: string;
      items: SearchResult[];
    }>;

    const built: Array<{ heading: string; entries: Entry[] }> = [];

    if (continueProjects.length) {
      built.push({
        heading: "Continue Project",
        entries: continueProjects.map((project) => ({
          key: `continue-${project.id}`,
          label: `Continue Project → ${project.name}`,
          sublabel: project.id === currentProjectId ? "Current project" : undefined,
          icon: ArrowRight,
          group: "Continue Project",
          onSelect: () => openBriefing(project.id, project.name)
        }))
      });
    }

    if (staticActions.length) {
      built.push({
        heading: "Actions",
        entries: staticActions.map((action) => ({
          key: `action-${action.id}`,
          label: action.label,
          icon: action.icon,
          group: "Actions",
          onSelect: () => navigate(action.href)
        }))
      });
    }

    for (const group of groups) {
      built.push({
        heading: group.label || CATEGORY_LABELS[group.category] || group.category,
        entries: group.items.map((item) => ({
          key: `${group.category}-${item.id}`,
          label: item.title,
          sublabel: item.excerpt ? String(item.excerpt).slice(0, 80) : undefined,
          icon: CATEGORY_ICONS[group.category] || FileText,
          group: group.label,
          onSelect: () => navigate(item.href || "/dashboard")
        }))
      });
    }

    const flatList: Entry[] = built.flatMap((section) => section.entries);
    return { sections: built, flat: flatList };
  }, [projects, query, currentProjectId, results, openBriefing, navigate]);

  // Keep the active index in range as entries change.
  useEffect(() => {
    setActiveIndex((index) => (flat.length === 0 ? 0 : Math.min(index, flat.length - 1)));
  }, [flat.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll the active row into view.
  useEffect(() => {
    if (!open || !listRef.current) {
      return;
    }
    const node = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (node) {
      (node as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (flat.length ? (index + 1) % flat.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (flat.length ? (index - 1 + flat.length) % flat.length : 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      flat[activeIndex]?.onSelect();
    }
  }

  let runningIndex = -1;

  return (
    <>
      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
          role="dialog"
        >
          <div
            className="w-full max-w-[640px] overflow-hidden rounded-[14px] border border-[color:var(--site-border-strong)] bg-[var(--site-bg)] shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[color:var(--site-border)] px-4">
              <Search className="h-4 w-4 shrink-0 text-[var(--site-subtle)]" />
              <input
                className="h-12 w-full bg-transparent text-[14px] text-[var(--site-text)] outline-none placeholder:text-[var(--site-subtle)]"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search projects, chats, files, memory… or type a command"
                ref={inputRef}
                value={query}
              />
              <kbd className="hidden shrink-0 rounded-[6px] border border-[color:var(--site-border)] px-1.5 py-0.5 text-[10px] text-[var(--site-subtle)] sm:inline">
                Esc
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto py-2" ref={listRef}>
              {flat.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-[var(--site-subtle)]">
                  {loading ? "Searching…" : query.trim() ? "No matches found." : "Start typing to search your workspace."}
                </div>
              ) : (
                sections.map((section) => (
                  <div className="mb-1" key={section.heading}>
                    <div className="px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--site-subtle)]">
                      {section.heading}
                    </div>
                    {section.entries.map((entry) => {
                      runningIndex += 1;
                      const index = runningIndex;
                      const isActive = index === activeIndex;
                      const Icon = entry.icon;
                      return (
                        <button
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            isActive ? "bg-[var(--site-accent-soft)]" : "hover:bg-[var(--site-ghost-bg)]"
                          }`}
                          data-index={index}
                          key={entry.key}
                          onClick={() => entry.onSelect()}
                          onMouseMove={() => setActiveIndex(index)}
                          type="button"
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive ? "text-[var(--site-accent)]" : "text-[var(--site-subtle)]"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-[var(--site-text)]">{entry.label}</span>
                            {entry.sublabel ? (
                              <span className="block truncate text-[11px] text-[var(--site-subtle)]">
                                {entry.sublabel}
                              </span>
                            ) : null}
                          </span>
                          {isActive ? (
                            <span className="shrink-0 text-[11px] text-[var(--site-subtle)]">↵</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[color:var(--site-border)] px-4 py-2 text-[11px] text-[var(--site-subtle)]">
              <span>↑↓ to navigate · ↵ to select · Esc to close</span>
              <span>Xeivora</span>
            </div>
          </div>
        </div>
      ) : null}

      {briefing ? (
        <ContinueProjectBriefing
          onClose={() => setBriefing(null)}
          onResume={(projectId) => {
            setBriefing(null);
            router.push(`/chat?project=${encodeURIComponent(projectId)}`);
          }}
          projectId={briefing.id}
          projectName={briefing.name}
        />
      ) : null}
    </>
  );
}
