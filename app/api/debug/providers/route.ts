import { NextResponse } from "next/server";

const { getProviderDebugState } = require("@/lib/server/ai-runtime");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json(
    getProviderDebugState({
      modelKey: searchParams.get("modelKey") || "orbit-auto",
      prompt: searchParams.get("prompt") || "hello"
    }),
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
