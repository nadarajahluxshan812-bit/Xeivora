import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { createSession, getProviderStatus, listSessions } = require("@/lib/server/chat-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const viewer = await getViewer();

  try {
    const session = await createSession({
      modelPreference: body?.modelPreference || "orbit-auto",
      projectId: body?.projectId || null,
      ownerId: viewer?.id ?? null
    });

    return NextResponse.json(
      {
        providerStatus: getProviderStatus(),
        session,
        sessions: await listSessions()
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create a Xeivora chat."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
