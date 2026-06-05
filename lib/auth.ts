import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import type { AuthSessionPayload, AuthUser } from "@/lib/auth-types";

const authStore = require("@/lib/server/auth-store");

export const AUTH_COOKIE_NAME = "xeivora_session";
const GOOGLE_STATE_COOKIE_NAME = "xeivora_google_state";
const GITHUB_STATE_COOKIE_NAME = "xeivora_github_state";

export function sanitizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/chat";
  }

  return value;
}

function isLocalHost(value: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(value);
}

function normalizePublicUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getPublicOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const configuredOrigins = [
    normalizePublicUrl(process.env.PUBLIC_APP_URL),
    normalizePublicUrl(process.env.APP_URL),
    normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL),
    normalizePublicUrl(process.env.RAILWAY_PUBLIC_DOMAIN)
  ].filter((value): value is string => Boolean(value));
  const originHeader = normalizePublicUrl(request.headers.get("origin"));
  const refererHeader = normalizePublicUrl(request.headers.get("referer"));
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const hostHeader = request.headers.get("host");
  const forwardedOrigin =
    forwardedHost
      ? normalizePublicUrl(`${forwardedProto || "https"}://${forwardedHost}`)
      : null;
  const host = forwardedHost || hostHeader || requestUrl.host;
  const proto =
    forwardedProto ||
    (requestUrl.protocol === "http:" || requestUrl.protocol === "https:"
      ? requestUrl.protocol.replace(":", "")
      : process.env.NODE_ENV === "production"
        ? "https"
        : "http");
  const requestLooksPublic = !isLocalHost(host);
  const configuredOrigin = requestLooksPublic
    ? configuredOrigins.find((value) => !isLocalHost(new URL(value).hostname)) || configuredOrigins[0] || null
    : configuredOrigins[0] || null;

  return (
    configuredOrigin ||
    originHeader ||
    refererHeader ||
    forwardedOrigin ||
    `${proto}://${host}`
  );
}

export function getGoogleRedirectUri(request: Request) {
  const publicOrigin = getPublicOrigin(request);
  const configured = process.env.GOOGLE_REDIRECT_URI;

  if (!configured) {
    return `${publicOrigin}/api/auth/google/callback`;
  }

  try {
    const configuredUrl = new URL(configured);
    const publicUrl = new URL(publicOrigin);

    if (!isLocalHost(publicUrl.hostname) && isLocalHost(configuredUrl.hostname)) {
      return `${publicOrigin}/api/auth/google/callback`;
    }
  } catch {
    return `${publicOrigin}/api/auth/google/callback`;
  }

  return configured;
}

export function getGitHubRedirectUri(request: Request) {
  const publicOrigin = getPublicOrigin(request);
  const configured = process.env.GITHUB_REDIRECT_URI;

  if (!configured) {
    return `${publicOrigin}/api/auth/github/callback`;
  }

  try {
    const configuredUrl = new URL(configured);
    const publicUrl = new URL(publicOrigin);

    if (!isLocalHost(publicUrl.hostname) && isLocalHost(configuredUrl.hostname)) {
      return `${publicOrigin}/api/auth/github/callback`;
    }
  } catch {
    return `${publicOrigin}/api/auth/github/callback`;
  }

  return configured;
}

export async function getViewer(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await authStore.getSessionByToken(token);
  return session?.user ?? null;
}

export async function getViewerSession(): Promise<AuthSessionPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return {
      authenticated: false,
      user: null
    };
  }

  const session = await authStore.getSessionByToken(token);
  if (!session) {
    return {
      authenticated: false,
      user: null
    };
  }

  return {
    authenticated: true,
    user: session.user,
    expiresAt: session.expiresAt
  };
}

export async function requireViewer(returnTo = "/chat") {
  const viewer = await getViewer();

  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  return viewer;
}

export function applyAuthCookie(response: NextResponse, token: string, expiresAt: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function setGoogleStateCookie(response: NextResponse, value: string) {
  response.cookies.set(GOOGLE_STATE_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });
}

export async function readGoogleStateCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(GOOGLE_STATE_COOKIE_NAME)?.value ?? null;
}

export function clearGoogleStateCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function setGitHubStateCookie(response: NextResponse, value: string) {
  response.cookies.set(GITHUB_STATE_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });
}

export async function readGitHubStateCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(GITHUB_STATE_COOKIE_NAME)?.value ?? null;
}

export function clearGitHubStateCookie(response: NextResponse) {
  response.cookies.set(GITHUB_STATE_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getRequestMeta() {
  const headerStore = await headers();
  return {
    userAgent: headerStore.get("user-agent"),
    ipAddress: headerStore.get("x-forwarded-for") || headerStore.get("x-real-ip") || null
  };
}
