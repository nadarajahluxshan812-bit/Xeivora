import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth";

const authStore = require("@/lib/server/auth-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("cookie")?.match(/xeivora_session=([^;]+)/)?.[1] || null;
  if (token) {
    await authStore.revokeSessionByToken(token);
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookie(response);
  return response;
}
