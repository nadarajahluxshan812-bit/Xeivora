import { NextResponse } from "next/server";

const { enforceRateLimit } = require("@/lib/server/rate-limit");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function generateWithOpenAI(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium"
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Image generation failed.");
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; revised_prompt?: string }>;
  };

  return (payload.data || []).map((item, index) => ({
    id: `img-${index}`,
    revisedPrompt: item.revised_prompt || prompt,
    url: item.b64_json ? `data:image/png;base64,${item.b64_json}` : null
  }));
}

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
    const images = await generateWithOpenAI(prompt);
    return NextResponse.json({
      connected: true,
      images
    });
  } catch {
    return NextResponse.json(
      {
        connected: false,
        images: [],
        message: "Xeivora could not generate the image right now. The provider fallback architecture is ready."
      },
      { status: 200 }
    );
  }
}
