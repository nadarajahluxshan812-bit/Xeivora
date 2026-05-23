import { NextResponse } from "next/server";

const { getOrbitSnapshot } = require("@/lib/server/orbit-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getOrbitSnapshot(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
