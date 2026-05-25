import { NextResponse } from "next/server";

import { applyAuthCookie, getRequestMeta } from "@/lib/auth";

const authStore = require("@/lib/server/auth-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await authStore.createUser({
      email: body.email,
      name: body.name,
      password: body.password
    });
    const meta = await getRequestMeta();
    const session = await authStore.createSession(user.id, meta);
    const response = NextResponse.json({
      success: true,
      user: session.user
    });
    applyAuthCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to create your account."
      },
      {
        status: (error as { statusCode?: number })?.statusCode || 500
      }
    );
  }
}
