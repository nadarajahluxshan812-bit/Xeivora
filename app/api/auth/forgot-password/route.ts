import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const authStore = require("@/lib/server/auth-store");

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = await authStore.requestPasswordReset(body.email);
  const origin = new URL(request.url).origin;
  const previewUrl = token ? `${origin}/reset-password?token=${encodeURIComponent(token)}` : null;

  return NextResponse.json({
    success: true,
    message: "If a matching account exists, Xeivora has prepared a reset link.",
    previewUrl: process.env.NODE_ENV === "production" ? null : previewUrl
  });
}
