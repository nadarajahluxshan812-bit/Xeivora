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

  try {
    const result = await generateImages({
      prompt,
      count,
      viewerId: viewer?.id || null,
      viewerPlan: viewer?.plan || "Starter"
    });

    const primary = result.images[0] || null;

    return NextResponse.json({
      ...result,
      imageUrl: primary?.url || null,
      revisedPrompt: primary?.revisedPrompt || prompt
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        images: [],
        imageUrl: null,
        revisedPrompt: prompt,
        message: error instanceof Error ? error.message : "Xeivora could not generate the image right now.",
        provider: "openai",
        model: null
      },
      { status: 200 }
    );
  }
}
