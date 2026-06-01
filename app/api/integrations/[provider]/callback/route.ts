import { NextResponse } from "next/server";

import type { IntegrationProvider } from "@/lib/chat-types";
import { getPublicOrigin, getViewer } from "@/lib/auth";
import {
  clearIntegrationStateCookie,
  exchangeIntegrationCode,
  readIntegrationStateCookie
} from "@/lib/integrations/oauth";
import { getIntegrationDescriptor } from "@/lib/integrations/config";

const integrationStore = require("@/lib/server/integration-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function integrationsRedirect(request: Request) {
  return new URL("/integrations", getPublicOrigin(request));
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const viewer = await getViewer();
  const { provider: rawProvider } = await params;
  const provider = rawProvider as IntegrationProvider;
  const descriptor = getIntegrationDescriptor(provider);
  const url = integrationsRedirect(request);

  if (!viewer) {
    const loginUrl = new URL("/login", getPublicOrigin(request));
    loginUrl.searchParams.set("next", "/integrations");
    return NextResponse.redirect(loginUrl);
  }

  if (!descriptor) {
    url.searchParams.set("error", "Unknown integration provider.");
    return NextResponse.redirect(url);
  }

  const state = new URL(request.url).searchParams.get("state");
  const code = new URL(request.url).searchParams.get("code");
  const expectedState = await readIntegrationStateCookie(provider);
  await clearIntegrationStateCookie(provider);

  if (!state || !expectedState || state !== expectedState) {
    url.searchParams.set("error", "Integration session expired. Please try again.");
    return NextResponse.redirect(url);
  }

  if (!code) {
    url.searchParams.set("error", `Unable to connect ${descriptor.label}.`);
    return NextResponse.redirect(url);
  }

  try {
    const tokenPayload = await exchangeIntegrationCode(request, provider, code);
    await integrationStore.upsertUserIntegration(viewer.id, provider, tokenPayload);
    url.searchParams.set("connected", provider);
    return NextResponse.redirect(url);
  } catch (error) {
    url.searchParams.set(
      "error",
      error instanceof Error ? error.message : `Unable to connect ${descriptor.label}.`
    );
    return NextResponse.redirect(url);
  }
}
