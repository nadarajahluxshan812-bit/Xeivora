import { NextResponse } from "next/server";

const { listToolLogs } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const sessionId = searchParams.get("sessionId");
  const limit = Number(searchParams.get("limit") || 30);

  return NextResponse.json(await listToolLogs({ projectId, sessionId, limit }), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
