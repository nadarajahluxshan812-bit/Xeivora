"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type WorkspaceTabKey = "chat" | "files" | "timeline" | "memory" | "preview";

const tabs: Array<{ key: WorkspaceTabKey; href: string; label: string }> = [
  { key: "chat", href: "/chat", label: "Chat" },
  { key: "files", href: "/files", label: "Files" },
  { key: "timeline", href: "/timeline", label: "Timeline" },
  { key: "memory", href: "/memory", label: "Project Memory" },
  { key: "preview", href: "/preview", label: "Preview" }
];

function withQuery(baseHref: string, projectId?: string | null, sessionId?: string | null) {
  const params = new URLSearchParams();
  if (projectId) {
    params.set("project", projectId);
  }
  if (sessionId) {
    params.set("session", sessionId);
  }
  const query = params.toString();
  return query ? `${baseHref}?${query}` : baseHref;
}

export function ProjectWorkspaceTabs({
  active,
  className = "",
  onPreviewSelect,
  projectId = null,
  sessionId = null
}: {
  active: WorkspaceTabKey;
  className?: string;
  onPreviewSelect?: (() => void) | null;
  projectId?: string | null;
  sessionId?: string | null;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="inline-flex min-w-full items-center gap-1 rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-1">
        {tabs.map((tab) => {
          const className = cn(
            "inline-flex h-9 items-center rounded-[10px] px-3 text-[12px] font-medium transition",
            active === tab.key
              ? "bg-[var(--site-accent-soft)] text-[var(--site-accent)]"
              : "text-[var(--site-subtle)] hover:bg-[var(--site-ghost-bg)] hover:text-[var(--site-text)]"
          );

          if (tab.key === "preview" && onPreviewSelect) {
            return (
              <button
                className={className}
                key={tab.key}
                onClick={onPreviewSelect}
                type="button"
              >
                {tab.label}
              </button>
            );
          }

          return (
            <Link className={className} href={withQuery(tab.href, projectId, sessionId)} key={tab.key}>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
