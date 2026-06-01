import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import type { IntegrationProvider } from "@/lib/chat-types";
import { getPublicOrigin, getViewer } from "@/lib/auth";
import { buildIntegrationAuthUrl, setIntegrationStateCookie } from "@/lib/integrations/oauth";
import { getIntegrationDescriptor, isIntegrationConfigured } from "@/lib/integrations/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function integrationsRedirect(request: Request, message?: string) {
  const url = new URL("/integrations", getPublicOrigin(request));
  if (message) {
    url.searchParams.set("error", message);
  }
  return url;
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const viewer = await getViewer();

  if (!viewer) {
    const loginUrl = new URL("/login", getPublicOrigin(request));
    loginUrl.searchParams.set("next", "/integrations");
    return NextResponse.redirect(loginUrl);
  }

  const { provider: rawProvider } = await params;
  const provider = rawProvider as IntegrationProvider;
  const descriptor = getIntegrationDescriptor(provider);

  if (!descriptor) {
    return NextResponse.redirect(integrationsRedirect(request, "Unknown integration provider."));
  }

  if (!isIntegrationConfigured(provider)) {
    return NextResponse.redirect(
      integrationsRedirect(request, `${descriptor.label} is not configured yet.`)
    );
  }

  const state = randomUUID();
  await setIntegrationStateCookie(provider, state);

  try {
    const authUrl = buildIntegrationAuthUrl(request, provider, state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return NextResponse.redirect(
      integrationsRedirect(
        request,
        error instanceof Error ? error.message : `Unable to connect ${descriptor.label}.`
      )
    );
  }
}
