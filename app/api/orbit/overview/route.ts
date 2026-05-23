import { NextResponse } from "next/server";

const { createDefaultOrbitSnapshot } = require("@/lib/server/orbit-default");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { getOrbitSnapshot } = require("@/lib/server/orbit-store");

    return NextResponse.json(getOrbitSnapshot(), {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.warn(
      "[Xeivora] Orbit overview runtime fell back to built-in demo data.",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(createDefaultOrbitSnapshot(), {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }
}
