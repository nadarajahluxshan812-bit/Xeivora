import { NextResponse } from "next/server";

const { createSession } = require("@/lib/server/chat-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    const session = await createSession({
      modelPreference: body?.modelPreference || "orbit-auto"
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
