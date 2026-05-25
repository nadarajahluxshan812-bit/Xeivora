import { NextResponse } from "next/server";

import { getPublicOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const authStore = require("@/lib/server/auth-store");

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = await authStore.requestPasswordReset(body.email);
  const origin = getPublicOrigin(request);
  const previewUrl = token ? `${origin}/reset-password?token=${encodeURIComponent(token)}` : null;

  return NextResponse.json({
    success: true,
    message: "If a matching account exists, Xeivora has prepared a reset link.",
    previewUrl: process.env.NODE_ENV === "production" ? null : previewUrl
  });
}
