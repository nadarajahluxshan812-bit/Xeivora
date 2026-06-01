import { NextResponse } from "next/server";

import type { IntegrationProvider } from "@/lib/chat-types";
import { getViewer } from "@/lib/auth";
import { getIntegrationDescriptor } from "@/lib/integrations/config";
import { revokeIntegration } from "@/lib/integrations/oauth";

const integrationStore = require("@/lib/server/integration-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { provider: rawProvider } = await params;
  const provider = rawProvider as IntegrationProvider;
  const descriptor = getIntegrationDescriptor(provider);

  if (!descriptor) {
    return NextResponse.json({ error: "Unknown integration provider." }, { status: 404 });
  }

  const existing = await integrationStore.getUserIntegration(viewer.id, provider);
  if (existing?.accessToken) {
    await revokeIntegration(provider, existing.accessToken).catch(() => null);
  }

  await integrationStore.deleteUserIntegration(viewer.id, provider);

  return NextResponse.json({ disconnected: true, provider });
}
