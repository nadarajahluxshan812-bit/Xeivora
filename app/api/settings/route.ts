import { NextResponse } from "next/server";

const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await mvpStore.getSettings(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(await mvpStore.updateSettings(body || {}));
}
