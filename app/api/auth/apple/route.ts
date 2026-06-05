import { NextResponse } from "next/server";

import { getPublicOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const publicOrigin = getPublicOrigin(request);
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("Apple Sign-In is not configured yet.")}`, publicOrigin)
  );
}
