import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getGoogleRedirectUri, getPublicOrigin, sanitizeNextPath, setGoogleStateCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const requestUrl = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google Sign-In is not configured yet.")}`, publicOrigin)
    );
  }

  const redirectUri = getGoogleRedirectUri(request);
  const state = `${randomUUID()}::${next}`;
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("access_type", "offline");
  googleUrl.searchParams.set("prompt", "consent");
  googleUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleUrl);
  setGoogleStateCookie(response, state);
  return response;
}
