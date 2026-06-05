"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Bot,
  BrainCircuit,
  Ellipsis,
  FolderKanban,
  MessageSquareText,
  Pencil,
  Pin,
  PlugZap,
  Plus,
  Search,
  Settings2,
  Target,
  Trash2,
  Workflow
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { OrbitLogo } from "@/components/orbit-logo";
import type { AuthUser } from "@/lib/auth-types";
import type { ChatBootstrap, ChatSessionSummary, IntegrationConnectionSummary } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

export type WorkspaceSidebarRecentItem = {
  active?: boolean;
  href?: string;
  id: string;
  meta?: string | null;
  onSelect?: () => void;
  title: string;
};

export type WorkspaceSidebarRecentSection = {
  emptyLabel?: string;
  items: WorkspaceSidebarRecentItem[];
  label: string;
};

export type WorkspaceSidebarProps = {
  activeSessionId?: string | null;
  collapsed?: boolean;
  onNewChat?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onToggleCollapse?: () => void;
  recentSections?: WorkspaceSidebarRecentSection[];
  searchQuery?: string;
  searchPlaceholder?: string;
  sessions?: ChatSessionSummary[];
  statusLabel?: string;
  onSearchChange?: (value: string) => void;
  viewer?: AuthUser | null;
};

const navItems = [
  { label: "Chats", icon: MessageSquareText, href: "/chat" },
  { label: "Projects", icon: FolderKanban, href: "/dashboard" },
  { label: "Project Memory", icon: BrainCircuit, href: "/memory" },
  { label: "Workflows", icon: Workflow, href: "/workflows", soon: true },
  { label: "Agents", icon: Bot, href: "/agents", soon: true },
  { label: "Simulate", icon: Target, href: "/simulate", soon: true },
  { label: "Integrations", icon: PlugZap, href: "/integrations", soon: true },
  { label: "Settings", icon: Settings2, href: "/settings" }
] as const;

function groupSessions(sessions: ChatSessionSummary[]) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const previous7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;
  const previous30Days = startOfToday - 30 * 24 * 60 * 60 * 1000;
  const groups: Record<string, ChatSessionSummary[]> = {
    Pinned: [],
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    Older: []
  };

  for (const session of sessions) {
    if (session.pinned && !session.archived) {
      groups.Pinned.push(session);
      continue;
    }

    const updatedAt = new Date(session.updatedAt).getTime();
    if (updatedAt >= startOfToday) {
      groups.Today.push(session);
    } else if (updatedAt >= startOfYesterday) {
      groups.Yesterday.push(session);
    } else if (updatedAt >= previous7Days) {
      groups["Previous 7 Days"].push(session);
    } else if (updatedAt >= previous30Days) {
      groups["Previous 30 Days"].push(session);
    } else {
      groups.Older.push(session);
    }
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function WorkspaceSidebar({
  activeSessionId = null,
  onNewChat,
  onSelectSession,
  recentSections,
  searchQuery = "",
  searchPlaceholder = "Search context and chats",
  sessions = [],
  statusLabel = "Protected",
  onSearchChange,
  viewer = null
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [bootstrapSessions, setBootstrapSessions] = useState<ChatSessionSummary[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConnectionSummary[]>([]);
  const [query, setQuery] = useState(searchQuery);
  const [sessionMenuOpenId, setSessionMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (sessions.length && !recentSections?.length) {
      return;
    }

    void fetch("/api/chat/bootstrap", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ChatBootstrap | null) => {
        if (!payload?.sessions) {
          return;
        }

        setBootstrapSessions(payload.sessions);
        setIntegrations(payload.integrations || []);
      })
      .catch(() => {
        // The sidebar should stay usable even if recents cannot load.
      });
  }, [recentSections?.length, sessions.length]);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!sessionMenuOpenId) {
      return;
    }

    function handleClose() {
      setSessionMenuOpenId(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSessionMenuOpenId(null);
      }
    }

    window.addEventListener("click", handleClose);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [sessionMenuOpenId]);

  const availableSessions = sessions.length ? sessions : bootstrapSessions;
  const filteredSessions = useMemo(() => {
    const lower = query.toLowerCase();

    return availableSessions.filter((session) =>
      `${session.title} ${session.preview}`.toLowerCase().includes(lower)
    );
  }, [availableSessions, query]);
  const groupedSessions = useMemo(() => groupSessions(filteredSessions), [filteredSessions]);
  const filteredRecentSections = useMemo(() => {
    if (!recentSections?.length) {
      return [];
    }

    const lower = query.toLowerCase();

    return recentSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          `${item.title} ${item.meta || ""}`.toLowerCase().includes(lower)
        )
      }))
      .filter((section) => section.items.length > 0);
  }, [query, recentSections]);
  const connectedIntegrations = useMemo(
    () => integrations.filter((integration) => integration.connected),
    [integrations]
  );
  const profileName = viewer?.name || "Xeivora User";
  const profilePlan = viewer?.plan || statusLabel;

  async function refreshSessions() {
    if (sessions.length) {
      return;
    }

    try {
      const response = await fetch("/api/chat/bootstrap", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as ChatBootstrap;
      setBootstrapSessions(payload.sessions || []);
      setIntegrations(payload.integrations || []);
    } catch {
      // Ignore refresh issues inside the sidebar.
    }
  }

  async function handleRenameSession(sessionId: string) {
    const session = availableSessions.find((candidate) => candidate.id === sessionId);
    const nextTitle = window.prompt("Rename chat", session?.title || "");

    if (!nextTitle || nextTitle.trim() === session?.title) {
      setSessionMenuOpenId(null);
      return;
    }

    await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle })
    });

    setSessionMenuOpenId(null);
    await refreshSessions();
  }

  async function handleDeleteSession(sessionId: string) {
    const session = availableSessions.find((candidate) => candidate.id === sessionId);

    if (!window.confirm(`Delete "${session?.title || "this chat"}"?`)) {
      setSessionMenuOpenId(null);
      return;
    }

    await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "DELETE"
    });

    setSessionMenuOpenId(null);
    await refreshSessions();
  }

  async function handleUpdateSessionMetadata(
    sessionId: string,
    updates: Partial<Pick<ChatSessionSummary, "pinned" | "archived">>
  ) {
    await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });

    setSessionMenuOpenId(null);
    await refreshSessions();
  }

  function handleNewChat() {
    if (onNewChat) {
      onNewChat();
      return;
    }

    router.push("/dashboard");
  }

  function handleSelectSession(sessionId: string) {
    if (onSelectSession) {
      onSelectSession(sessionId);
      return;
    }

    router.push(`/chat?session=${encodeURIComponent(sessionId)}`);
  }

  return (
    <aside className="hidden min-h-screen w-[232px] shrink-0 border-r border-[color:var(--site-border)] bg-[var(--site-panel)] text-[var(--site-text)] md:flex">
      <div className="flex h-screen w-full flex-col overflow-hidden px-[10px] py-3">
        <div className="mb-2 flex items-center justify-between gap-3 px-1.5">
          <Link
            className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-[var(--site-accent-soft)]"
            href="/"
          >
            <OrbitLogo iconSize={28} nameClassName="text-[15px] tracking-[-0.01em]" showTagline={false} />
          </Link>

          <button
            aria-label="Start new chat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--site-muted)] transition hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
            onClick={handleNewChat}
            type="button"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <button
          className="mb-2 flex h-10 items-center gap-2.5 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-3 text-[13px] font-normal text-[var(--site-muted)] shadow-sm transition hover:border-[color:var(--site-border-strong)] hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
          onClick={handleNewChat}
          type="button"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Continue project</span>
        </button>

        <nav className="grid gap-[1px] border-b border-[color:var(--site-border)] pb-2" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                className={cn(
                  "flex h-10 items-center gap-2 rounded-[10px] px-2.5 text-[13px] transition",
                  isActive
                    ? "bg-[var(--site-card)] font-medium text-[var(--site-text)]"
                    : "text-[var(--site-muted)] hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
                )}
                href={item.href}
                key={item.label}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {"soon" in item && item.soon ? (
                  <span className="ml-auto rounded-full border border-[color:var(--site-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--site-subtle)]">
                    Soon
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-2 min-h-0 flex-1 overflow-hidden">
          <label className="mb-2 flex h-10 items-center gap-2 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-3 text-[var(--site-subtle)] transition focus-within:border-[color:var(--site-border-strong)]">
            <Search className="h-4 w-4 shrink-0" />
            <input
              className="w-full bg-transparent text-[13px] text-[var(--site-text)] outline-none placeholder:text-[var(--site-subtle)]"
              onChange={(event) => {
                setQuery(event.target.value);
                onSearchChange?.(event.target.value);
              }}
              placeholder={searchPlaceholder || "Search context and chats"}
              value={query}
            />
          </label>

          <div className="mb-1 flex items-center justify-between px-2">
            <p className="text-[11px] font-normal tracking-[0.01em] text-[var(--site-subtle)]">Recent context</p>
          </div>

          <div className="h-full overflow-y-auto pr-1">
            <div className="space-y-3 pb-4">
              {filteredRecentSections.length ? (
                filteredRecentSections.map((section) => (
                  <div className="space-y-1" key={section.label}>
                    <h3 className="px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--site-subtle)]">
                      {section.label}
                    </h3>
                    {section.items.map((item) => (
                      <button
                        className={cn(
                          "flex h-9 w-full items-center gap-2 rounded-[10px] px-2.5 text-left text-[12px] font-normal transition",
                          item.active
                            ? "bg-[var(--site-card)] text-[var(--site-text)]"
                            : "text-[var(--site-muted)] hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
                        )}
                        key={item.id}
                        onClick={() => {
                          if (item.onSelect) {
                            item.onSelect();
                            return;
                          }

                          if (item.href) {
                            router.push(item.href);
                          }
                        }}
                        type="button"
                      >
                        <span className="truncate">{item.title}</span>
                      </button>
                    ))}
                  </div>
                ))
              ) : groupedSessions.length ? (
                groupedSessions.map(([group, items]) => (
                  <div className="space-y-1" key={group}>
                    <h3 className="px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--site-subtle)]">
                      {group}
                    </h3>
                    {items.map((session) => (
                      <RecentSessionRow
                        active={activeSessionId === session.id}
                        key={session.id}
                        menuOpen={sessionMenuOpenId === session.id}
                        onArchive={() => void handleUpdateSessionMetadata(session.id, { archived: !session.archived })}
                        onDelete={() => void handleDeleteSession(session.id)}
                        onOpenChange={(nextOpen) => setSessionMenuOpenId(nextOpen ? session.id : null)}
                        onPin={() => void handleUpdateSessionMetadata(session.id, { pinned: !session.pinned })}
                        onRename={() => void handleRenameSession(session.id)}
                        onSelect={() => handleSelectSession(session.id)}
                        session={session}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div className="px-2 pt-2 text-[13px] text-[var(--site-muted)]">
                  {recentSections?.length ? recentSections[0]?.emptyLabel || "No saved continuity yet." : "No saved continuity yet."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto border-t border-[color:var(--site-border)] px-1 pt-2">
          {connectedIntegrations.length ? (
            <div className="mb-2 px-1.5">
              <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--site-subtle)]">
                Connected apps
              </p>
              <div className="flex flex-wrap gap-1.5">
                {connectedIntegrations.map((integration) => (
                  <Link
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[color:var(--site-border)] bg-[var(--site-card)] px-2 text-[10px] font-medium text-[var(--site-muted)] transition hover:border-[color:var(--site-border-strong)] hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
                    href="/integrations"
                    key={integration.provider}
                    title={integration.label}
                  >
                    {integration.label.slice(0, 2).toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 rounded-[10px] px-1.5 py-1.5 transition hover:bg-[var(--site-accent-soft)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--site-accent)] text-[10px] font-medium text-[var(--site-inverse)]">
              {getInitials(profileName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-[var(--site-text)]">{profileName}</p>
              <p className="text-[10.5px] text-[var(--site-muted)]">{profilePlan}</p>
            </div>
            <button
              aria-label="Profile options"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--site-muted)] transition hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
              type="button"
            >
              <Ellipsis className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function RecentSessionRow({
  active,
  menuOpen,
  onArchive,
  onDelete,
  onOpenChange,
  onPin,
  onRename,
  onSelect,
  session
}: {
  active: boolean;
  menuOpen: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onOpenChange: (nextOpen: boolean) => void;
  onPin: () => void;
  onRename: () => void;
  onSelect: () => void;
  session: ChatSessionSummary;
}) {
  return (
    <div className="group relative">
      <button
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-[10px] px-2.5 pr-9 text-left text-[12px] font-normal transition",
          active
            ? "bg-[var(--site-card)] text-[var(--site-text)]"
            : "text-[var(--site-muted)] hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
        )}
        onClick={onSelect}
        type="button"
      >
        {session.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-[var(--site-accent)]" /> : null}
        <span className="truncate">{session.title}</span>
      </button>

      <button
        aria-label={`Open options for ${session.title}`}
        className={cn(
          "absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[10px] text-[var(--site-muted)] transition hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]",
          menuOpen || active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(!menuOpen);
        }}
        type="button"
      >
        <Ellipsis className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute left-0 top-[calc(100%+8px)] z-40 w-[220px] rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <SessionMenuButton
              icon={Pin}
              label={session.pinned ? "Unpin conversation" : "Pin conversation"}
              onClick={onPin}
            />
            <SessionMenuButton icon={Pencil} label="Rename" onClick={onRename} />
            <SessionMenuButton
              icon={session.archived ? ArchiveRestore : Archive}
              label={session.archived ? "Restore conversation" : "Archive"}
              onClick={onArchive}
            />
            <SessionMenuButton destructive icon={Trash2} label="Delete" onClick={onDelete} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SessionMenuButton({
  destructive = false,
  icon: Icon,
  label,
  onClick
}: {
  destructive?: boolean;
  icon: typeof Pin;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-9 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[13px] transition",
        destructive
          ? "text-[#f07f67] hover:bg-[var(--site-accent-soft)]"
          : "text-[var(--site-text)] hover:bg-[var(--site-accent-soft)]"
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
