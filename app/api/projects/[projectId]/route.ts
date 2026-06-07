import { NextResponse } from "next/server";

const {
  deleteProject,
  listFiles,
  listProjects,
  updateProject
} = require("@/lib/server/workspace-store");
const { listSessions } = require("@/lib/server/chat-store");
const { listPreviewVersions } = require("@/lib/server/preview-store");
const { getProjectRepo } = require("@/lib/server/github");
const { getProjectVercel, listDeploymentRecords } = require("@/lib/server/vercel");
const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TimelineEvent = {
  id: string;
  kind:
    | "project_created"
    | "chat_created"
    | "file_uploaded"
    | "preview_generated"
    | "memory_updated"
    | "github_connected"
    | "vercel_linked"
    | "deployment_started"
    | "build_running"
    | "deployment_succeeded"
    | "deployment_failed"
    | "production_url_created";
  title: string;
  detail: string;
  at: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const [projects, allSessions, files, previews, memory, repoLink, vercelLink, deploymentRecords] =
    await Promise.all([
      listProjects(),
      listSessions({ includeArchived: true }),
      listFiles({ projectId, limit: 200 }),
      listPreviewVersions({ projectId, limit: 100 }),
      mvpStore.list("memory"),
      getProjectRepo(projectId),
      getProjectVercel(projectId),
      listDeploymentRecords(projectId)
    ]);

  const project = projects.find((item: { id: string }) => item.id === projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const chats = allSessions.filter(
    (session: { projectId?: string | null }) => session.projectId === projectId
  );
  const projectMemory = (Array.isArray(memory) ? memory : []).filter(
    (item: { projectId?: string | null }) => item.projectId === projectId
  );

  // Synthesize a project timeline from real, project-scoped records.
  const timeline: TimelineEvent[] = [];
  timeline.push({
    id: `project-${project.id}`,
    kind: "project_created",
    title: "Project created",
    detail: project.name,
    at: project.createdAt
  });
  for (const chat of chats) {
    timeline.push({
      id: `chat-${chat.id}`,
      kind: "chat_created",
      title: "Chat created",
      detail: chat.title,
      at: chat.createdAt
    });
  }
  for (const file of files) {
    timeline.push({
      id: `file-${file.id}`,
      kind: "file_uploaded",
      title: "File uploaded",
      detail: file.name,
      at: file.createdAt
    });
  }
  for (const preview of previews) {
    timeline.push({
      id: `preview-${preview.id}`,
      kind: "preview_generated",
      title: `Preview v${preview.versionNumber} generated`,
      detail: preview.title,
      at: preview.createdAt
    });
  }
  for (const item of projectMemory) {
    timeline.push({
      id: `memory-${item.id}`,
      kind: "memory_updated",
      title: "Memory updated",
      detail: item.title,
      at: item.updatedAt || item.createdAt
    });
  }
  if (repoLink) {
    timeline.push({
      id: `github-${repoLink.id}`,
      kind: "github_connected",
      title: "GitHub repository connected",
      detail: repoLink.fullName,
      at: repoLink.createdAt || repoLink.updatedAt
    });
  }
  if (vercelLink) {
    timeline.push({
      id: `vercel-${vercelLink.id}`,
      kind: "vercel_linked",
      title: "Vercel project linked",
      detail: vercelLink.name,
      at: vercelLink.createdAt || vercelLink.updatedAt
    });
  }
  for (const record of deploymentRecords) {
    const targetLabel = record.target === "production" ? "Production" : "Preview";
    timeline.push({
      id: `deploy-start-${record.id}`,
      kind: "deployment_started",
      title: `${targetLabel} deployment started`,
      detail: record.url || record.vercelDeploymentId,
      at: record.createdAt
    });
    const state = String(record.state || "").toUpperCase();
    const at = record.updatedAt || record.createdAt;
    if (state === "BUILDING") {
      timeline.push({
        id: `deploy-build-${record.id}`,
        kind: "build_running",
        title: `${targetLabel} build running`,
        detail: record.url || record.vercelDeploymentId,
        at
      });
    } else if (state === "READY") {
      timeline.push({
        id: `deploy-ok-${record.id}`,
        kind: "deployment_succeeded",
        title: `${targetLabel} deployment succeeded`,
        detail: record.url || record.vercelDeploymentId,
        at
      });
      if (record.target === "production" && record.url) {
        timeline.push({
          id: `deploy-prod-url-${record.id}`,
          kind: "production_url_created",
          title: "Production URL created",
          detail: record.url,
          at
        });
      }
    } else if (state === "ERROR" || state === "CANCELED") {
      timeline.push({
        id: `deploy-fail-${record.id}`,
        kind: "deployment_failed",
        title: `${targetLabel} deployment failed`,
        detail: record.url || record.vercelDeploymentId,
        at
      });
    }
  }
  timeline.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());

  const lastActivity =
    timeline.length > 0 ? timeline[0].at : project.updatedAt || project.createdAt;

  return NextResponse.json(
    {
      project,
      chats,
      files,
      previews,
      memory: projectMemory,
      timeline,
      lastActivity
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const body = await request.json().catch(() => ({}));
  const { projectId } = await params;
  const project = await updateProject(projectId, body || {});

  return NextResponse.json(
    {
      project,
      projects: await listProjects()
    },
    {
      status: project ? 200 : 404,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const deleted = await deleteProject(projectId);

  return NextResponse.json(
    {
      deleted,
      projects: await listProjects()
    },
    {
      status: deleted ? 200 : 404,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
