"use client";

import { ArrowRight, BrainCircuit, FolderKanban, Sparkles } from "lucide-react";
import Link from "next/link";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspacePageHero,
  WorkspacePageShell
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";

type ComingSoonShellProps = {
  description: string;
  title: string;
  viewer?: AuthUser | null;
};

const focusAreas = [
  {
    title: "AI continuity",
    description: "Resume work across Claude, GPT-4o, Gemini, and future models without re-explaining anything."
  },
  {
    title: "Persistent memory",
    description: "Keep decisions, preferences, summaries, and reusable context available every time work restarts."
  },
  {
    title: "Project context",
    description: "Anchor files, conversations, and milestones to projects so progress survives model switches."
  }
];

export function ComingSoonShell({
  description,
  title,
  viewer = null
}: ComingSoonShellProps) {
  return (
    <WorkspacePageShell statusLabel="Coming soon" viewer={viewer}>
      <div className="space-y-8 md:space-y-10">
        <WorkspacePageHero
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <WorkspaceButton>
                  <FolderKanban className="h-4 w-4" />
                  Continue Project
                </WorkspaceButton>
              </Link>
              <Link href="/memory">
                <WorkspaceButton variant="secondary">
                  <BrainCircuit className="h-4 w-4" />
                  Open Memory
                </WorkspaceButton>
              </Link>
            </div>
          }
          description={description}
          eyebrow="Planned next"
          title={title}
        />

        <WorkspaceCard className="p-7 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <WorkspaceBadge tone="learning">Coming soon</WorkspaceBadge>
            <WorkspaceBadge tone="standby">Focus area</WorkspaceBadge>
          </div>
          <p className="mt-4 max-w-[48rem] text-[15px] leading-7 text-[var(--site-subtle)]">
            These capabilities are planned, but Xeivora is currently focused on perfecting AI continuity,
            persistent memory, and project context first.
          </p>
        </WorkspaceCard>

        <div className="grid gap-4 md:grid-cols-3">
          {focusAreas.map((area) => (
            <WorkspaceCard className="p-6" key={area.title}>
              <div className="flex items-center gap-2 text-[var(--site-accent)]">
                <Sparkles className="h-4 w-4" />
                <div className="text-[13px] font-medium text-[var(--site-text)]">{area.title}</div>
              </div>
              <p className="mt-3 text-[13px] leading-6 text-[var(--site-subtle)]">{area.description}</p>
            </WorkspaceCard>
          ))}
        </div>

        <WorkspaceCard className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[15px] font-medium text-[var(--site-text)]">Keep momentum in the meantime</div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--site-subtle)]">
              Use Projects and Memory to continue work, save key context, and pick up exactly where you stopped.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--site-accent)] transition hover:opacity-80"
              href="/dashboard"
            >
              Open Projects
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--site-accent)] transition hover:opacity-80"
              href="/chat"
            >
              Return to Chat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </WorkspaceCard>
      </div>
    </WorkspacePageShell>
  );
}
