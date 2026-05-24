import { NextResponse } from "next/server";

const { listToolLogs } = require("@/lib/server/workspace-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listToolLogs(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
