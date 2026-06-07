import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { getProviderStatusReport } = require("@/lib/server/ai-runtime");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // Provider diagnostics are sensitive — require auth. Public callers get health only.
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  }

  const { searchParams } = new URL(request.url);

  return NextResponse.json(
    getProviderStatusReport({
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
