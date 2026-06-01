import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { listIntegrationSummaries } from "@/lib/integrations/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const integrations = await listIntegrationSummaries(viewer.id);

    return NextResponse.json(
      { integrations },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load integrations."
      },
      { status: 500 }
    );
  }
}
