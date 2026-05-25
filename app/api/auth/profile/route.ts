import { NextResponse } from "next/server";

import { getViewerSession } from "@/lib/auth";

const authStore = require("@/lib/server/auth-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getViewerSession(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function PATCH(request: Request) {
  const session = await getViewerSession();
  if (!session.authenticated || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const user = await authStore.updateUserProfile(session.user.id, {
    name: body.name,
    avatarUrl: body.avatarUrl,
    preferences: body.preferences
  });

  return NextResponse.json({
    success: true,
    user
  });
}
