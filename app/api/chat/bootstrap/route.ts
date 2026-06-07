import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { listIntegrationSummaries } from "@/lib/integrations/oauth";

const { getProviderStatus, listSessions } = require("@/lib/server/chat-store");
const { listVisibleProjects } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const viewer = await getViewer();

    return NextResponse.json(
      {
        defaultModel: "orbit-auto",
        providerStatus: getProviderStatus(),
        sessions: await listSessions(),
        projects: await listVisibleProjects(viewer?.id ?? null),
        integrations: viewer ? await listIntegrationSummaries(viewer.id) : []
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load Xeivora workspace."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
