"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { OrbitLogo } from "@/components/orbit-logo";
import type { ChatSessionSummary, ProviderStatus } from "@/lib/chat-types";
import { workspaceNav } from "@/lib/workspace";

type WorkspaceSidebarProps = {
  activeSessionId?: string | null;
  collapsed?: boolean;
  onNewChat?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onToggleCollapse?: () => void;
  providerStatus?: ProviderStatus | null;
  searchQuery?: string;
  sessions?: ChatSessionSummary[];
  statusLabel?: string;
  onSearchChange?: (value: string) => void;
};

function groupSessions(sessions: ChatSessionSummary[]) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const groups: Record<string, ChatSessionSummary[]> = {
    Today: [],
    Yesterday: [],
    Earlier: []
  };

  for (const session of sessions) {
    const updatedAt = new Date(session.updatedAt).getTime();
    if (updatedAt >= startOfToday) {
      groups.Today.push(session);
    } else if (updatedAt >= startOfYesterday) {
      groups.Yesterday.push(session);
    } else {
      groups.Earlier.push(session);
    }
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export function WorkspaceSidebar({
  activeSessionId = null,
  collapsed = false,
  onNewChat,
  onSelectSession,
  onToggleCollapse,
  providerStatus,
  searchQuery = "",
  sessions = [],
  statusLabel = "Local",
  onSearchChange
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const filteredSessions = sessions.filter((session) =>
    `${session.title} ${session.preview}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const groups = groupSessions(filteredSessions);

  return (
    <aside
      className={`xei-sidebar ${collapsed ? "xei-sidebar-collapsed" : ""}`}
      aria-label="Xeivora workspace navigation"
    >
      <div className="xei-sidebar-top">
        <OrbitLogo compact={collapsed} />
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="xei-icon-button"
          onClick={onToggleCollapse}
          type="button"
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <button className="xei-new-chat" onClick={onNewChat} type="button">
        <span aria-hidden="true">+</span>
        {!collapsed ? <span>New chat</span> : null}
      </button>

      {!collapsed ? (
        <>
          <label className="xei-search">
            <span className="sr-only">Search chats</span>
            <input
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search chats"
              value={searchQuery}
            />
          </label>

          <nav className="xei-nav" aria-label="Workspace pages">
            {workspaceNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link className={`xei-nav-link ${active ? "is-active" : ""}`} href={item.href} key={item.href}>
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </Link>
              );
            })}
          </nav>

          <div className="xei-history">
            {groups.length ? (
              groups.map(([group, items]) => (
                <div className="xei-history-group" key={group}>
                  <div className="xei-history-label">{group}</div>
                  {items.map((session) => (
                    <button
                      className={`xei-history-item ${activeSessionId === session.id ? "is-active" : ""}`}
                      key={session.id}
                      onClick={() => onSelectSession?.(session.id)}
                      type="button"
                    >
                      <span>{session.title}</span>
                      <small>{session.preview}</small>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="xei-empty-history">No matching chats yet.</div>
            )}
          </div>

          <div className="xei-sidebar-bottom">
            <div>
              <strong>Luxshan</strong>
              <span>xeivora.com</span>
            </div>
            <span className="xei-status-pill">
              {providerStatus?.openai.available ? "Live" : statusLabel}
            </span>
          </div>
        </>
      ) : null}
    </aside>
  );
}
