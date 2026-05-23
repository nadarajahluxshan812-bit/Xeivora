import { NextResponse } from "next/server";

const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await mvpStore.list("memory"), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json(
    await mvpStore.create("memory", {
      type: body?.type || "reusable_context",
      title: body?.title || "Untitled memory",
      content: body?.content || "",
      enabled: body?.enabled ?? true
    }),
    { status: 201 }
  );
}
