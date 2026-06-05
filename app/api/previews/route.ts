import { NextResponse } from "next/server";

const { createPreviewVersion, listPreviewVersions } = require("@/lib/server/preview-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const sessionId = searchParams.get("sessionId");
  const limit = Number(searchParams.get("limit") || 40);

  return NextResponse.json(await listPreviewVersions({ projectId, sessionId, limit }), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const preview = await createPreviewVersion({
    projectId: body?.projectId || null,
    sessionId: body?.sessionId || null,
    title: body?.title,
    summary: body?.summary,
    status: body?.status,
    routePath: body?.routePath,
    changedFiles: body?.changedFiles,
    notes: body?.notes
  });

  return NextResponse.json(preview, { status: 201 });
}
