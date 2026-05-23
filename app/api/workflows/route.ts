import { NextResponse } from "next/server";

const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await mvpStore.list("workflows"), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json(
    await mvpStore.create("workflows", {
      name: body?.name || "Untitled workflow",
      description: body?.description || "",
      steps: Array.isArray(body?.steps) ? body.steps : [],
      status: body?.status || "draft"
    }),
    { status: 201 }
  );
}
