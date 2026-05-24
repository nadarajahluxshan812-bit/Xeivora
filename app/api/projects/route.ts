import { NextResponse } from "next/server";

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
  const body = await request.json().catch(() => ({}));

  return NextResponse.json(
    await createProject({
      name: body?.name || "Untitled project",
      description: body?.description || "",
      color: body?.color || "#8b5cf6",
      status: body?.status || "active"
    }),
    { status: 201 }
  );
}
