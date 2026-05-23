import { NextResponse } from "next/server";

const { getProviderStatus, listSessions } = require("@/lib/server/chat-store");
const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await mvpStore.getStatus(getProviderStatus(), await listSessions()), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
