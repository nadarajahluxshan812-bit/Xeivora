import { NextResponse } from "next/server";

import { resolveOwnedProject } from "@/lib/project-access";

const { listFiles } = require("@/lib/server/workspace-store");
const { listSessions } = require("@/lib/server/chat-store");
const { listPreviewVersions } = require("@/lib/server/preview-store");
const { getProjectRepo } = require("@/lib/server/github");
const { getProjectVercel, listDeploymentRecords } = require("@/lib/server/vercel");
const mvpStore = require("@/lib/server/mvp-store");
const { buildProjectBrief } = require("@/lib/server/continuity-brief");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const gate = await resolveOwnedProject(projectId);
  if (!gate.ok) {
    return gate.response;
  }
  const project = gate.project;

  const [allSessions, files, previews, memory, repo, vercel, deployments] = await Promise.all([
    listSessions({ includeArchived: true }),
    listFiles({ projectId, limit: 200 }),
    listPreviewVersions({ projectId, limit: 100 }),
    mvpStore.list("memory"),
    getProjectRepo(projectId),
    getProjectVercel(projectId),
    listDeploymentRecords(projectId)
  ]);

  const chats = allSessions.filter(
    (session: { projectId?: string | null }) => session.projectId === projectId
  );
  const projectMemory = (Array.isArray(memory) ? memory : []).filter(
    (item: { projectId?: string | null }) => item.projectId === projectId
  );

  const brief = buildProjectBrief({
    project,
    chats,
    files,
    previews,
    memory: projectMemory,
    repo,
    vercel,
    deployments
  });

  return NextResponse.json(
    { projectId, projectName: project.name, brief },
    { headers: { "Cache-Control": "no-store" } }
  );
}
