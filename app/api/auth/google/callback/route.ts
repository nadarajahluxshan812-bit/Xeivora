import { NextResponse } from "next/server";

import {
  applyAuthCookie,
  clearGoogleStateCookie,
  getRequestMeta,
  readGoogleStateCookie,
  sanitizeNextPath
} from "@/lib/auth";

const authStore = require("@/lib/server/auth-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const storedState = await readGoogleStateCookie();
  const redirectTarget = sanitizeNextPath(state?.split("::")[1] || "/chat");
  const clearResponse = NextResponse.redirect(new URL(redirectTarget, requestUrl.origin));

  if (!state || !code || !storedState || storedState !== state) {
    clearGoogleStateCookie(clearResponse);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Google authentication could not be verified.")}`, requestUrl.origin));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${requestUrl.origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      throw new Error("Google Sign-In is not configured yet.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      }).toString(),
      cache: "no-store"
    });

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error_description?: string };
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new Error(tokenPayload.error_description || "Unable to authenticate with Google.");
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`
      },
      cache: "no-store"
    });
    const profile = (await profileResponse.json()) as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!profileResponse.ok || !profile.email) {
      throw new Error("Unable to load your Google profile.");
    }

    const user = await authStore.upsertGoogleUser({
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      avatarUrl: profile.picture || null
    });
    const meta = await getRequestMeta();
    const session = await authStore.createSession(user.id, meta);
    const response = NextResponse.redirect(new URL(redirectTarget, requestUrl.origin));
    clearGoogleStateCookie(response);
    applyAuthCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to sign in with Google.")}`, requestUrl.origin)
    );
    clearGoogleStateCookie(response);
    return response;
  }
}
