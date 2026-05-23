import { NextResponse } from "next/server";

const { getProviderDebugState } = require("@/lib/server/ai-runtime");
const { routeIntent } = require("@/lib/server/intent-router");
const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function createWorkflowPlan(promptAnalysis: {
  intent: string;
  workflowNeeded: boolean;
}) {
  return [
    "Receive prompt",
    "Load workspace memory",
    `Detect intent: ${promptAnalysis.intent}`,
    promptAnalysis.workflowNeeded ? "Prepare continuity-aware execution plan" : "Prefer direct provider response",
    "Select provider chain",
    "Execute or respond with the active provider",
    "Checkpoint only if failover is needed",
    "Return unified response"
  ];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const prompt = body?.prompt?.trim() || "";
  const modelKey = body?.modelKey || "orbit-auto";

  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }

  const promptAnalysis = routeIntent(prompt);
  const providerState = getProviderDebugState({
    modelKey,
    prompt
  });
  const trace = await mvpStore.createTrace({
    prompt,
    intent: promptAnalysis.intent,
    complexity: promptAnalysis.complexity,
    workflowNeeded: promptAnalysis.workflowNeeded,
    plan: createWorkflowPlan(promptAnalysis),
    selectedProvider: providerState.activeProvider,
    fallbackProvider: providerState.fallbackProvider,
    status: promptAnalysis.workflowNeeded ? "planned" : "direct_response_preferred"
  });

  return NextResponse.json(trace, { status: 201 });
}
