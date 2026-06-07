import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { getProviderDebugState, getProviderStatusReport } = require("@/lib/server/ai-runtime");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // Provider debug state is sensitive — require auth. Public callers get health only.
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  }

  const { searchParams } = new URL(request.url);
  const modelKey = searchParams.get("modelKey") || "orbit-auto";
  const prompt = searchParams.get("prompt") || "hello";
  const debugState = getProviderDebugState({
    modelKey,
    prompt
  });
  const report = getProviderStatusReport({
    modelKey,
    prompt
  });

  return NextResponse.json(
    {
      openai: report.openai.available,
      anthropic: report.anthropic.available,
      gemini: report.gemini.available,
      ollama: report.ollama.available,
      activeProvider: debugState.activeProvider,
      fallbackProvider: debugState.fallbackProvider,
      fallbackChain: report.fallbackChain,
      activeModel: debugState.activeModel,
      continuity: debugState.continuity,
      simulationMode: debugState.simulationMode,
      providers: report
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
