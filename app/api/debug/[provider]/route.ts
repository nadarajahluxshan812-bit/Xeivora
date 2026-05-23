import { NextResponse } from "next/server";

const { runProviderDiagnostic } = require("@/lib/server/ai-runtime");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const body = await request.json().catch(() => ({}));
  const normalizedProvider = provider.toLowerCase();

  if (!["openai", "anthropic", "gemini"].includes(normalizedProvider)) {
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
      ...(await runProviderDiagnostic(normalizedProvider, body?.prompt))
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : `${normalizedProvider} diagnostic failed.`
      },
      { status: (error as { statusCode?: number })?.statusCode || 500 }
    );
  }
}
