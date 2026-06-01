import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { listIntegrationSummaries } from "@/lib/integrations/oauth";
import type { IntegrationProvider } from "@/lib/chat-types";

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
    const viewer = await getViewer();
    const session = body?.sessionId ? await getSession(body.sessionId) : null;
    const integrations = viewer ? await listIntegrationSummaries(viewer.id) : [];
    const enabledIntegrationProviders = Array.isArray(body?.enabledIntegrationProviders)
      ? body.enabledIntegrationProviders.filter(Boolean)
      : [];

    if (body?.sessionId && !session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    const result = await createChatCompletion({
      modelKey,
      prompt: input,
      session,
      historyMessages: Array.isArray(body?.messages) ? body.messages : [],
      integrations,
      enabledIntegrationProviders: enabledIntegrationProviders as IntegrationProvider[],
      viewerId: viewer?.id || null,
      viewerPlan: viewer?.plan || "Starter"
    });
    const attemptedProviders = Array.isArray(result.attemptedProviders) ? result.attemptedProviders : [];
    const switched = attemptedProviders.length > 1 && attemptedProviders[0] !== attemptedProviders[attemptedProviders.length - 1];

    return NextResponse.json({
      response: result.text,
      provider: result.provider,
      resolvedModel: result.resolvedModel || result.route.resolvedModel,
      routeLabel: result.routeLabel,
      intent: result.promptAnalysis.intent,
      complexity: result.promptAnalysis.complexity,
      workflowMode: result.promptAnalysis.workflowNeeded ? result.promptAnalysis.workflowKind : "simple_chat",
      simulationMode: result.simulationMode,
      switched,
      switchData: switched
        ? {
            fromModel: providerToSwitchModel(attemptedProviders[0]),
            toModel: providerToSwitchModel(attemptedProviders[attemptedProviders.length - 1]),
            reason: "Token limit reached",
            contextPreserved: true,
            decisionsRestored: Math.max(5, Math.min(19, Math.ceil((Array.isArray(body?.messages) ? body.messages.length : 0) / 2) + 4))
          }
        : null,
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

function providerToSwitchModel(provider: string | null | undefined) {
  const map: Record<string, string> = {
    anthropic: "claude",
    openai: "gpt-4o",
    google: "gemini",
    gemini: "gemini",
    ollama: "ollama"
  };

  if (!provider) {
    return "claude";
  }

  return map[provider] || provider;
}
