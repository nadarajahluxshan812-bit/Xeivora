import { NextResponse } from "next/server";

const { executeMcpTools } = require("@/lib/mcp/executor");
const { listFiles } = require("@/lib/server/workspace-store");
const { getLightweightMemorySnapshot } = require("@/lib/server/lightweight-memory");
const { enforceRateLimit } = require("@/lib/server/rate-limit");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, {
    scope: "tools-execute",
    max: 24,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Tool execution is temporarily rate limited." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const prompt = `${body?.prompt || ""}`.trim();
  const sessionId = body?.sessionId || null;
  const projectId = body?.projectId || null;

  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }

  const files = sessionId ? await listFiles({ sessionId, limit: 20 }) : [];
  const memorySnapshot = await getLightweightMemorySnapshot({ sessionId });
  const result = await executeMcpTools({
    prompt,
    sessionId,
    projectId,
    files,
    memorySnapshot
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
