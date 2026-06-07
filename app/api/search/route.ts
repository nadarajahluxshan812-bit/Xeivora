import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { searchWorkspace } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json(
      { error: "Not authenticated.", results: [] },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  return NextResponse.json(
    {
      query: q,
      results: await searchWorkspace(q, { viewerId: viewer.id })
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
