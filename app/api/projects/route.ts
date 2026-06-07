import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { createProject, listProjects } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listProjects(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  // Require an authenticated creator so the new project can be scoped to an owner.
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  return NextResponse.json(
    await createProject({
      name: body?.name || "Untitled project",
      description: body?.description || "",
      color: body?.color || "#c96442",
      status: body?.status || "active",
      ownerId: viewer.id
    }),
    { status: 201 }
  );
}
