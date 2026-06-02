import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";

const { enforceRateLimit } = require("@/lib/server/rate-limit");
const { generateImages } = require("@/lib/server/image-generation");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, {
    scope: "image-generate",
    max: 10,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Image generation is temporarily rate limited." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const prompt = `${body?.prompt || ""}`.trim();
  const count = Math.min(4, Math.max(1, Number.parseInt(`${body?.count || 1}`, 10) || 1));
  const viewer = await getViewer();

  if (!prompt) {
    return NextResponse.json({ error: "An image prompt is required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        connected: false,
        images: [],
        message: "Image generation architecture is ready, but no image provider is connected yet."
      },
      { status: 200 }
    );
  }

  try {
    const result = await generateImages({
      prompt,
      count,
      viewerId: viewer?.id || null,
      viewerPlan: viewer?.plan || "Starter"
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Legacy image generation route error:", error);
    return NextResponse.json(
      {
        connected: false,
        images: [],
        message: "Image generation temporarily unavailable. Try again in a moment.",
        provider: "openai",
        model: null
      },
      { status: 200 }
    );
  }
}
