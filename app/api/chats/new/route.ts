import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { createSession } = require("@/lib/server/chat-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const viewer = await getViewer();

  try {
    const session = await createSession({
      modelPreference: body?.modelPreference || "orbit-auto",
      ownerId: viewer?.id ?? null
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create chat."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
