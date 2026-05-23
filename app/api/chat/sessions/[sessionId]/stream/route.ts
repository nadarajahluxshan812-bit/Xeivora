import { NextResponse } from "next/server";

const { addUserMessage, removeLastAssistantMessage } = require("@/lib/server/chat-store");
const { streamChatCompletion } = require("@/lib/server/ai-runtime");
const { createSseResponse } = require("@/lib/server/sse");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const body = await request.json().catch(() => ({}));
  const input = body?.input?.trim();
  const modelKey = body?.modelKey || "orbit-auto";
  const regenerate = Boolean(body?.regenerate);

  if (!input) {
    return NextResponse.json(
      {
        error: "A prompt is required to start streaming."
      },
      { status: 400 }
    );
  }

  try {
    const session = regenerate
      ? await removeLastAssistantMessage(sessionId)
      : (await addUserMessage(sessionId, input, modelKey)).session;

    return createSseResponse(async (sink: { write: (chunk: string) => void }) => {
      await streamChatCompletion({
        modelKey,
        prompt: input,
        res: sink,
        session
      });
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Xeivora could not complete the stream."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
