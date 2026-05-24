import { NextResponse } from "next/server";

const { getProviderStatus, listSessions } = require("@/lib/server/chat-store");
const { listProjects } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(
      {
        defaultModel: "orbit-auto",
        providerStatus: getProviderStatus(),
        sessions: await listSessions(),
        projects: await listProjects()
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
