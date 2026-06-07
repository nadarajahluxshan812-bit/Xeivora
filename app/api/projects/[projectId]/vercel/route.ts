import { NextResponse } from "next/server";

import { resolveOwnedProject } from "@/lib/project-access";

const {
  getProject,
  getProjectVercel,
  isVercelConfigured,
  removeProjectVercel,
  saveProjectVercel
} = require("@/lib/server/vercel");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Authenticated viewer must own the project before any Vercel access.
async function guard(projectId: string) {
  const resolved = await resolveOwnedProject(projectId);
  if (!resolved.ok) {
    return { error: resolved.response };
  }
  return { viewer: resolved.viewer, project: resolved.project };
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const gate = await guard(projectId);
  if (gate.error) {
    return gate.error;
  }

  const link = await getProjectVercel(projectId);
  return NextResponse.json(
    { configured: isVercelConfigured(), link: link || null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const gate = await guard(projectId);
  if (gate.error) {
    return gate.error;
  }

  if (!isVercelConfigured()) {
    return NextResponse.json({ error: "Vercel is not configured on this server." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const vercelProjectId = String(body?.vercelProjectId || "").trim();
  if (!vercelProjectId) {
    return NextResponse.json({ error: "vercelProjectId is required." }, { status: 400 });
  }

  let meta;
  try {
    meta = await getProject(vercelProjectId);
  } catch (error) {
    const status = (error as { status?: number } | null)?.status ?? 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reach the Vercel project." },
      { status }
    );
  }

  const link = await saveProjectVercel(projectId, {
    vercelProjectId: meta.id,
    name: meta.name,
    framework: meta.framework,
    gitRepo: meta.gitRepo,
    linkedBy: gate.viewer.id
  });

  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const gate = await guard(projectId);
  if (gate.error) {
    return gate.error;
  }

  const disconnected = await removeProjectVercel(projectId);
  return NextResponse.json({ disconnected });
}
