import { cookies } from "next/headers";

import type { IntegrationProvider } from "@/lib/chat-types";
import { getPublicOrigin } from "@/lib/auth";
import {
  getIntegrationDescriptor,
  getIntegrationScopeValue,
  getIntegrationUserScopeValue,
  integrationOrder,
  isIntegrationConfigured
} from "@/lib/integrations/config";

const integrationStore = require("@/lib/server/integration-store");

function stateCookieName(provider: IntegrationProvider) {
  return `xeivora_integration_state_${provider}`;
}

function normalizeScopes(rawScopes?: string | string[] | null) {
  if (!rawScopes) {
    return [];
  }

  if (Array.isArray(rawScopes)) {
    return rawScopes.flatMap((value) => String(value).split(/[,\s]+/)).filter(Boolean);
  }

  return String(rawScopes).split(/[,\s]+/).filter(Boolean);
}

export function getIntegrationRedirectUri(request: Request, provider: IntegrationProvider) {
  return `${getPublicOrigin(request)}/api/integrations/${provider}/callback`;
}

export async function setIntegrationStateCookie(provider: IntegrationProvider, value: string) {
  const cookieStore = await cookies();
  cookieStore.set(stateCookieName(provider), value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });
}

export async function readIntegrationStateCookie(provider: IntegrationProvider) {
  const cookieStore = await cookies();
  return cookieStore.get(stateCookieName(provider))?.value ?? null;
}

export async function clearIntegrationStateCookie(provider: IntegrationProvider) {
  const cookieStore = await cookies();
  cookieStore.set(stateCookieName(provider), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function buildIntegrationAuthUrl(request: Request, provider: IntegrationProvider, state: string) {
  const descriptor = getIntegrationDescriptor(provider);
  if (!descriptor) {
    throw new Error("Unknown integration provider.");
  }

  const clientId = process.env[descriptor.clientIdEnv];
  if (!clientId) {
    throw new Error(`${descriptor.label} is not configured yet.`);
  }

  const redirectUri = getIntegrationRedirectUri(request, provider);
  const url = new URL(descriptor.authUrl);

  if (provider === "github") {
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", getIntegrationScopeValue(provider));
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (descriptor.usesGoogleOAuth) {
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", getIntegrationScopeValue(provider));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (provider === "notion") {
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (provider === "slack") {
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", getIntegrationScopeValue(provider));
    const userScope = getIntegrationUserScopeValue(provider);
    if (userScope) {
      url.searchParams.set("user_scope", userScope);
    }
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (provider === "linear") {
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", getIntegrationScopeValue(provider));
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (provider === "jira") {
    url.searchParams.set("audience", "api.atlassian.com");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", getIntegrationScopeValue(provider));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  }

  if (provider === "figma") {
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", getIntegrationScopeValue(provider));
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    return url.toString();
  }

  throw new Error("Unsupported integration provider.");
}

async function exchangeGoogleCode(request: Request, provider: IntegrationProvider, code: string) {
  const descriptor = getIntegrationDescriptor(provider)!;
  const response = await fetch(descriptor.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env[descriptor.clientIdEnv] || "",
      client_secret: process.env[descriptor.clientSecretEnv] || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: getIntegrationRedirectUri(request, provider)
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || `Unable to connect ${descriptor.label}.`);
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${payload.access_token}`
    }
  });
  const profile = profileResponse.ok ? await profileResponse.json() : null;

  return {
    accessToken: payload.access_token as string,
    refreshToken: (payload.refresh_token as string | undefined) || null,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scopes: normalizeScopes(payload.scope),
    accountLabel: profile?.email || profile?.name || null,
    metadata: profile ? { email: profile.email || null, name: profile.name || null } : {}
  };
}

async function exchangeGithubCode(request: Request, code: string) {
  const descriptor = getIntegrationDescriptor("github")!;
  const tokenResponse = await fetch(descriptor.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: process.env[descriptor.clientIdEnv],
      client_secret: process.env[descriptor.clientSecretEnv],
      code,
      redirect_uri: getIntegrationRedirectUri(request, "github")
    })
  });
  const payload = await tokenResponse.json();
  if (!tokenResponse.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || "Unable to connect GitHub.");
  }

  const profileResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${payload.access_token}`,
      Accept: "application/vnd.github+json"
    }
  });
  const profile = profileResponse.ok ? await profileResponse.json() : null;

  return {
    accessToken: payload.access_token as string,
    refreshToken: payload.refresh_token || null,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scopes: normalizeScopes(payload.scope),
    accountLabel: profile?.login || profile?.name || null,
    metadata: profile ? { login: profile.login || null } : {}
  };
}

async function exchangeNotionCode(request: Request, code: string) {
  const descriptor = getIntegrationDescriptor("notion")!;
  const basic = Buffer.from(`${process.env[descriptor.clientIdEnv]}:${process.env[descriptor.clientSecretEnv]}`).toString(
    "base64"
  );
  const tokenResponse = await fetch(descriptor.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: getIntegrationRedirectUri(request, "notion")
    })
  });
  const payload = await tokenResponse.json();
  if (!tokenResponse.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || "Unable to connect Notion.");
  }

  return {
    accessToken: payload.access_token as string,
    refreshToken: null,
    expiresAt: null,
    scopes: [],
    accountLabel: payload.workspace_name || payload.owner?.user?.name || null,
    metadata: {
      workspaceId: payload.workspace_id || null,
      workspaceName: payload.workspace_name || null
    }
  };
}

async function exchangeSlackCode(request: Request, code: string) {
  const descriptor = getIntegrationDescriptor("slack")!;
  const tokenResponse = await fetch(descriptor.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env[descriptor.clientIdEnv] || "",
      client_secret: process.env[descriptor.clientSecretEnv] || "",
      code,
      redirect_uri: getIntegrationRedirectUri(request, "slack")
    })
  });
  const payload = await tokenResponse.json();
  if (!tokenResponse.ok || !payload.ok) {
    throw new Error(payload.error || "Unable to connect Slack.");
  }

  return {
    accessToken: payload.access_token as string,
    refreshToken: payload.refresh_token || null,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scopes: [...normalizeScopes(payload.scope), ...normalizeScopes(payload.authed_user?.scope)],
    accountLabel: payload.team?.name || payload.authed_user?.id || null,
    metadata: {
      teamId: payload.team?.id || null,
      teamName: payload.team?.name || null,
      userAccessToken: payload.authed_user?.access_token || null,
      userScopes: normalizeScopes(payload.authed_user?.scope)
    }
  };
}

async function exchangeLinearCode(request: Request, code: string) {
  const descriptor = getIntegrationDescriptor("linear")!;
  const tokenResponse = await fetch(descriptor.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env[descriptor.clientIdEnv],
      client_secret: process.env[descriptor.clientSecretEnv],
      code,
      redirect_uri: getIntegrationRedirectUri(request, "linear"),
      grant_type: "authorization_code"
    })
  });
  const payload = await tokenResponse.json();
  if (!tokenResponse.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || "Unable to connect Linear.");
  }

  let accountLabel = null;
  try {
    const viewerResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: "{ viewer { name email } }" })
    });
    const viewerPayload = viewerResponse.ok ? await viewerResponse.json() : null;
    accountLabel = viewerPayload?.data?.viewer?.email || viewerPayload?.data?.viewer?.name || null;
  } catch {
    accountLabel = null;
  }

  return {
    accessToken: payload.access_token as string,
    refreshToken: payload.refresh_token || null,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scopes: normalizeScopes(payload.scope),
    accountLabel,
    metadata: {}
  };
}

async function exchangeJiraCode(request: Request, code: string) {
  const descriptor = getIntegrationDescriptor("jira")!;
  const tokenResponse = await fetch(descriptor.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env[descriptor.clientIdEnv],
      client_secret: process.env[descriptor.clientSecretEnv],
      code,
      redirect_uri: getIntegrationRedirectUri(request, "jira")
    })
  });
  const payload = await tokenResponse.json();
  if (!tokenResponse.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || "Unable to connect Jira.");
  }

  let metadata = {};
  let accountLabel = null;
  try {
    const resourcesResponse = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { Authorization: `Bearer ${payload.access_token}` }
    });
    const resources = resourcesResponse.ok ? await resourcesResponse.json() : [];
    if (Array.isArray(resources) && resources[0]) {
      metadata = {
        cloudId: resources[0].id || null,
        siteName: resources[0].name || null,
        siteUrl: resources[0].url || null
      };
      accountLabel = resources[0].name || resources[0].url || null;
    }
  } catch {
    metadata = {};
  }

  return {
    accessToken: payload.access_token as string,
    refreshToken: payload.refresh_token || null,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scopes: normalizeScopes(payload.scope),
    accountLabel,
    metadata
  };
}

async function exchangeFigmaCode(request: Request, code: string) {
  const descriptor = getIntegrationDescriptor("figma")!;
  const tokenResponse = await fetch(descriptor.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env[descriptor.clientIdEnv] || "",
      client_secret: process.env[descriptor.clientSecretEnv] || "",
      redirect_uri: getIntegrationRedirectUri(request, "figma"),
      code,
      grant_type: "authorization_code"
    })
  });
  const payload = await tokenResponse.json();
  if (!tokenResponse.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || "Unable to connect Figma.");
  }

  let accountLabel = null;
  try {
    const meResponse = await fetch("https://api.figma.com/v1/me", {
      headers: { Authorization: `Bearer ${payload.access_token}` }
    });
    const me = meResponse.ok ? await meResponse.json() : null;
    accountLabel = me?.email || me?.handle || null;
  } catch {
    accountLabel = null;
  }

  return {
    accessToken: payload.access_token as string,
    refreshToken: payload.refresh_token || null,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scopes: normalizeScopes(payload.scope),
    accountLabel,
    metadata: {}
  };
}

export async function exchangeIntegrationCode(request: Request, provider: IntegrationProvider, code: string) {
  if (provider === "github") {
    return exchangeGithubCode(request, code);
  }
  if (provider === "google_drive" || provider === "gmail") {
    return exchangeGoogleCode(request, provider, code);
  }
  if (provider === "notion") {
    return exchangeNotionCode(request, code);
  }
  if (provider === "slack") {
    return exchangeSlackCode(request, code);
  }
  if (provider === "linear") {
    return exchangeLinearCode(request, code);
  }
  if (provider === "jira") {
    return exchangeJiraCode(request, code);
  }
  if (provider === "figma") {
    return exchangeFigmaCode(request, code);
  }

  throw new Error("Unsupported integration provider.");
}

export async function revokeIntegration(provider: IntegrationProvider, accessToken: string | null) {
  if (!accessToken) {
    return;
  }

  try {
    if (provider === "google_drive" || provider === "gmail") {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: accessToken })
      });
      return;
    }

    if (provider === "slack") {
      await fetch("https://slack.com/api/auth.revoke", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams()
      });
    }
  } catch {
    // Best effort revocation only.
  }
}

export async function listIntegrationSummaries(userId: string) {
  const connected = await integrationStore.listUserIntegrations(userId);
  const map = new Map<
    IntegrationProvider,
    {
      provider: IntegrationProvider;
      accountLabel?: string | null;
      scopes?: string[];
      connectedAt?: string | null;
    }
  >(connected.map((entry: { provider: IntegrationProvider }) => [entry.provider, entry]));

  return integrationOrder.map((provider) => {
    const descriptor = getIntegrationDescriptor(provider)!;
    const match = map.get(provider);
    return {
      provider,
      label: descriptor.label,
      description: descriptor.description,
      icon: descriptor.icon,
      connected: Boolean(match),
      available: isIntegrationConfigured(provider),
      accountLabel: match?.accountLabel || null,
      scopes: match?.scopes || descriptor.scopes,
      connectedAt: match?.connectedAt || null
    };
  });
}
