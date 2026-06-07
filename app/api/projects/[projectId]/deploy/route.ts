import { NextResponse } from "next/server";

import { resolveOwnedProject } from "@/lib/project-access";

const {
  createDeployment,
  getProjectVercel,
  isVercelConfigured,
  recordDeployment
} = require("@/lib/server/vercel");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const gate = await resolveOwnedProject(projectId);
  if (!gate.ok) {
    return gate.response;
  }

  if (!isVercelConfigured()) {
    return NextResponse.json({ error: "Vercel is not configured on this server." }, { status: 400 });
  }

  const link = await getProjectVercel(projectId);
  if (!link) {
    return NextResponse.json({ error: "Link a Vercel project first." }, { status: 400 });
  }

  if (!link.gitRepo || link.gitRepo.repoId == null) {
    return NextResponse.json(
      { error: "The linked Vercel project has no connected Git repository to deploy from." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const target = body?.target === "production" ? "production" : "preview";
  const ref = link.gitRepo.productionBranch || "main";

  let deployment;
  try {
    deployment = await createDeployment({
      name: link.name,
      gitSource: { type: link.gitRepo.type, repoId: link.gitRepo.repoId, ref },
      target
    });
  } catch (error) {
    const status = (error as { status?: number } | null)?.status ?? 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to trigger the deployment." },
      { status }
    );
  }

  const record = await recordDeployment(projectId, {
    vercelDeploymentId: deployment.id,
    url: deployment.url,
    target,
    state: deployment.state
  });

  return NextResponse.json({ deployment, record }, { status: 201 });
}
