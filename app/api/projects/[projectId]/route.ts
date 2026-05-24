import { NextResponse } from "next/server";

const { deleteProject, listProjects, updateProject } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
