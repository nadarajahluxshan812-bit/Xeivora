import { NextResponse } from "next/server";

const { deleteSession } = require("@/lib/server/chat-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = await deleteSession(id);
    return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete chat."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
