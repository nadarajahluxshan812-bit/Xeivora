import { NextResponse } from "next/server";

const { getProviderStatus, listSessions } = require("@/lib/server/chat-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(
      {
        defaultModel: "orbit-auto",
        providerStatus: getProviderStatus(),
        sessions: await listSessions()
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
