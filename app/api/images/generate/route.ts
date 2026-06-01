import { NextResponse } from "next/server";

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
    const result = await generateImages({ prompt });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        connected: false,
        images: [],
        message: "Xeivora could not generate the image right now. The provider fallback architecture is ready.",
        provider: "openai",
        model: null
      },
      { status: 200 }
    );
  }
}
