import { NextResponse } from "next/server";

const { searchWorkspace } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  return NextResponse.json(
    {
      query: q,
      results: await searchWorkspace(q)
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
