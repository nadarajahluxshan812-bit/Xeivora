import { NextResponse } from "next/server";

const { updatePreviewVersion } = require("@/lib/server/preview-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ previewId: string }> }
) {
  const { previewId } = await params;
  const body = await request.json();

  const preview = await updatePreviewVersion(previewId, {
    title: body?.title,
    summary: body?.summary,
    status: body?.status,
    routePath: body?.routePath,
    changedFiles: body?.changedFiles,
    previewPayload: body?.previewPayload,
    notes: body?.notes,
    approvedAt: body?.approvedAt,
    deployedAt: body?.deployedAt
  });

  if (!preview) {
    return NextResponse.json({ error: "Preview version not found." }, { status: 404 });
  }

  return NextResponse.json(preview);
}
