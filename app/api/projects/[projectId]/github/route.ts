import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { isIntegrationConfigured } from "@/lib/integrations/config";

const { getUserIntegration } = require("@/lib/server/integration-store");
const {
  getProjectRepo,
  getRepo,
  listBranches,
  listCommits,
  listPullRequests,
  removeProjectRepo,
  saveProjectRepo
} = require("@/lib/server/github");
const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { projectId } = await params;
  const configured = isIntegrationConfigured("github");
  const integration = await getUserIntegration(viewer.id, "github");
  const connected = Boolean(integration?.accessToken);
  const repo = await getProjectRepo(projectId);

  const base = {
    configured,
    connected,
    accountLabel: integration?.accountLabel || null,
    repo: repo || null,
    branches: [] as unknown[],
    commits: [] as unknown[],
    pulls: [] as unknown[]
  };

  if (!connected || !repo) {
    return NextResponse.json(base, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const [branches, commits, pulls] = await Promise.all([
      listBranches(integration.accessToken, repo.owner, repo.repo).catch(() => []),
      listCommits(integration.accessToken, repo.owner, repo.repo).catch(() => []),
      listPullRequests(integration.accessToken, repo.owner, repo.repo).catch(() => [])
    ]);
    return NextResponse.json(
      { ...base, branches, commits, pulls },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { ...base, error: error instanceof Error ? error.message : "Unable to load repository activity." },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { projectId } = await params;
  const integration = await getUserIntegration(viewer.id, "github");
  if (!integration?.accessToken) {
    return NextResponse.json({ error: "Connect your GitHub account first." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const owner = String(body?.owner || "").trim();
  const repoName = String(body?.repo || "").trim();
  if (!owner || !repoName) {
    return NextResponse.json({ error: "owner and repo are required." }, { status: 400 });
  }

  // Confirm the repository exists and pull canonical metadata.
  let meta;
  try {
    meta = await getRepo(integration.accessToken, owner, repoName);
  } catch (error) {
    const status = (error as { status?: number } | null)?.status ?? 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reach repository." },
      { status }
    );
  }

  const link = await saveProjectRepo(projectId, {
    owner: meta.owner,
    repo: meta.name,
    fullName: meta.fullName,
    url: meta.url,
    defaultBranch: meta.defaultBranch,
    private: meta.private,
    connectedBy: viewer.id
  });

  // (7) Save repository metadata to Project Memory (reuses the memory store).
  await mvpStore.create("memory", {
    type: "reusable_context",
    section: "architecture",
    projectId,
    title: `GitHub repository: ${meta.fullName}`,
    content: `Connected ${meta.url}. Default branch: ${meta.defaultBranch}.${meta.description ? ` ${meta.description}` : ""}`,
    enabled: true
  });

  return NextResponse.json({ repo: link }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { projectId } = await params;
  const disconnected = await removeProjectRepo(projectId);
  return NextResponse.json({ disconnected });
}
