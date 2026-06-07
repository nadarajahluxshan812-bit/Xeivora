import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const { isVercelConfigured, listProjects } = require("@/lib/server/vercel");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!isVercelConfigured()) {
    return NextResponse.json({ configured: false, projects: [] });
  }

  try {
    const projects = await listProjects({ limit: 100 });
    return NextResponse.json(
      { configured: true, projects },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const status = (error as { status?: number } | null)?.status ?? 502;
    return NextResponse.json(
      {
        configured: true,
        projects: [],
        error: error instanceof Error ? error.message : "Unable to list Vercel projects."
      },
      { status: status === 401 ? 200 : status }
    );
  }
}
