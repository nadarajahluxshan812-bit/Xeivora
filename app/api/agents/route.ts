import { NextResponse } from "next/server";

const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await mvpStore.list("agents"), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
