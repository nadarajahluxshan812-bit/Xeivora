import { NextResponse } from "next/server";

import {
  applyAuthCookie,
  clearGitHubStateCookie,
  getGitHubRedirectUri,
  getPublicOrigin,
  getRequestMeta,
  readGitHubStateCookie,
  sanitizeNextPath
} from "@/lib/auth";

const authStore = require("@/lib/server/auth-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GitHubEmail = {
  email?: string | null;
  primary?: boolean;
  verified?: boolean;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const storedState = await readGitHubStateCookie();
  const redirectTarget = sanitizeNextPath(state?.split("::")[1] || "/chat");

  if (!state || !code || !storedState || storedState !== state) {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("GitHub authentication could not be verified.")}`, publicOrigin)
    );
    clearGitHubStateCookie(response);
    return response;
  }

  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = getGitHubRedirectUri(request);

    if (!clientId || !clientSecret) {
      throw new Error("GitHub Sign-In is not configured yet.");
    }

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      }).toString(),
      cache: "no-store"
    });

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error_description?: string; error?: string };
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new Error(tokenPayload.error_description || tokenPayload.error || "Unable to authenticate with GitHub.");
    }

    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: "application/vnd.github+json"
      },
      cache: "no-store"
    });
    const profile = (await profileResponse.json()) as {
      avatar_url?: string | null;
      email?: string | null;
      login?: string | null;
      name?: string | null;
    };

    if (!profileResponse.ok) {
      throw new Error("Unable to load your GitHub profile.");
    }

    let email = profile.email || null;

    if (!email) {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          Accept: "application/vnd.github+json"
        },
        cache: "no-store"
      });
      const emails = (await emailResponse.json()) as GitHubEmail[];

      if (!emailResponse.ok || !Array.isArray(emails)) {
        throw new Error("Unable to load your GitHub email.");
      }

      email =
        emails.find((entry) => entry.primary && entry.verified && entry.email)?.email ||
        emails.find((entry) => entry.verified && entry.email)?.email ||
        emails.find((entry) => entry.email)?.email ||
        null;
    }

    if (!email) {
      throw new Error("GitHub did not provide an email address for this account.");
    }

    const user = await authStore.upsertGitHubUser({
      email,
      name: profile.name || profile.login || email.split("@")[0],
      avatarUrl: profile.avatar_url || null
    });
    const meta = await getRequestMeta();
    const session = await authStore.createSession(user.id, meta);
    const response = NextResponse.redirect(new URL(redirectTarget, publicOrigin));
    clearGitHubStateCookie(response);
    applyAuthCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to sign in with GitHub.")}`,
        publicOrigin
      )
    );
    clearGitHubStateCookie(response);
    return response;
  }
}
