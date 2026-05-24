import { NextResponse } from "next/server";

const {
  deleteSession,
  getSession,
  listSessions,
  renameSession,
  updateSessionMetadata
} = require("@/lib/server/chat-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    return NextResponse.json(session, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load Xeivora chat."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const body = await request.json().catch(() => ({}));

  try {
    const { sessionId } = await params;
    const session =
      body?.pinned !== undefined || body?.archived !== undefined || body?.projectId !== undefined
        ? await updateSessionMetadata(sessionId, {
            title: body?.title,
            pinned: body?.pinned,
            archived: body?.archived,
            projectId: body?.projectId
          })
        : await renameSession(sessionId, body?.title || "");

    return NextResponse.json(
      {
        session,
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
        error: error instanceof Error ? error.message : "Unable to rename the Xeivora chat."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const deleted = await deleteSession(sessionId);

    return NextResponse.json(
      {
        deleted,
        sessions: await listSessions()
      },
      {
        status: deleted ? 200 : 404,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to delete the Xeivora chat."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
