import { NextResponse } from "next/server";

const { listSessions } = require("@/lib/server/chat-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await listSessions(), {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to list chats."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
