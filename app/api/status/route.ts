import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { getProviderStatus, listSessions } = require("@/lib/server/chat-store");
const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Detailed status (providers, metrics, settings) is sensitive — require auth.
  // Public callers get a minimal health response only.
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(await mvpStore.getStatus(getProviderStatus(), await listSessions()), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
