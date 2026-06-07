import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { isVercelConfigured, getUser } = require("@/lib/server/vercel");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Verify the server-side Vercel token by resolving the account it belongs to.
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!isVercelConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  try {
    const user = await getUser();
    return NextResponse.json(
      { configured: true, connected: true, user },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const status = (error as { status?: number } | null)?.status ?? 502;
    return NextResponse.json(
      {
        configured: true,
        connected: false,
        error: error instanceof Error ? error.message : "Unable to verify the Vercel token."
      },
      { status: status === 401 ? 200 : status }
    );
  }
}
