import { NextResponse } from "next/server";

const { getSession } = require("@/lib/server/chat-store");
const { createChatCompletion, getProviderDebugState, getProviderStatusReport } = require("@/lib/server/ai-runtime");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = body?.input?.trim() || body?.prompt?.trim();
  const modelKey = body?.modelKey || "orbit-auto";

  if (!input) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }

  try {
    const session = body?.sessionId ? await getSession(body.sessionId) : null;

    if (body?.sessionId && !session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    const result = await createChatCompletion({
      modelKey,
      prompt: input,
      session,
      historyMessages: Array.isArray(body?.messages) ? body.messages : []
    });

    return NextResponse.json({
      response: result.text,
      provider: result.provider,
      resolvedModel: result.route.resolvedModel,
      routeLabel: result.routeLabel,
      intent: result.promptAnalysis.intent,
      complexity: result.promptAnalysis.complexity,
      workflowMode: result.promptAnalysis.workflowNeeded ? result.promptAnalysis.workflowKind : "simple_chat",
      simulationMode: result.simulationMode,
      providerStatus: getProviderDebugState({
        modelKey,
        prompt: input
      }),
      providerReport: getProviderStatusReport({
        modelKey,
        prompt: input
      })
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Xeivora switched into local fallback mode after a provider interruption."
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
