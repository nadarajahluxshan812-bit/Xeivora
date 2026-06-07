import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { runProviderDiagnostic } = require("@/lib/server/ai-runtime");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  // Provider diagnostics trigger live provider calls — require auth.
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ status: "ok" }, { status: 401 });
  }

  const { provider } = await params;
  const body = await request.json().catch(() => ({}));
  const normalizedProvider = provider.toLowerCase();

  if (!["openai", "anthropic", "gemini", "ollama"].includes(normalizedProvider)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unknown provider diagnostic route."
      },
      { status: 404 }
    );
  }

  try {
    return NextResponse.json({
      success: true,
      ...(await runProviderDiagnostic(normalizedProvider, body?.prompt || "Reply with provider name only."))
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `${normalizedProvider} diagnostic is unavailable right now.`
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
