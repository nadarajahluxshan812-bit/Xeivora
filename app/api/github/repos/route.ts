import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { isIntegrationConfigured } from "@/lib/integrations/config";

const { getUserIntegration } = require("@/lib/server/integration-store");
const { listUserRepos } = require("@/lib/server/github");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const configured = isIntegrationConfigured("github");
  const integration = await getUserIntegration(viewer.id, "github");

  if (!integration?.accessToken) {
    return NextResponse.json(
      { configured, connected: false, repos: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const repos = await listUserRepos(integration.accessToken, { perPage: 100 });
    return NextResponse.json(
      { configured, connected: true, accountLabel: integration.accountLabel || null, repos },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const status = (error as { status?: number } | null)?.status ?? 502;
    return NextResponse.json(
      {
        configured,
        connected: status !== 401,
        repos: [],
        error: error instanceof Error ? error.message : "Unable to load repositories."
      },
      { status: status === 401 ? 200 : status }
    );
  }
}
