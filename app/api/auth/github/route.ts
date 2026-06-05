import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getGitHubRedirectUri, getPublicOrigin, sanitizeNextPath, setGitHubStateCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const requestUrl = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("GitHub Sign-In is not configured yet.")}`, publicOrigin)
    );
  }

  const redirectUri = getGitHubRedirectUri(request);
  const state = `${randomUUID()}::${next}`;
  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", clientId);
  githubUrl.searchParams.set("redirect_uri", redirectUri);
  githubUrl.searchParams.set("scope", "read:user user:email");
  githubUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(githubUrl);
  setGitHubStateCookie(response, state);
  return response;
}
