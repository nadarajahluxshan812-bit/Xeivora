import { NextResponse } from "next/server";

const { enforceRateLimit } = require("@/lib/server/rate-limit");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, {
    scope: "voice-transcribe",
    max: 20,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Voice transcription is temporarily rate limited." }, { status: 429 });
  }

  const formData = await request.formData();
  const audioFile = formData.get("audio");

  if (!(audioFile instanceof File)) {
    return NextResponse.json({ error: "Audio input is required." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        connected: false,
        transcript: "",
        message: "Voice transcription architecture is ready, but no speech provider is connected yet."
      },
      { status: 200 }
    );
  }

  try {
    const providerFormData = new FormData();
    providerFormData.append("model", "gpt-4o-mini-transcribe");
    providerFormData.append("file", audioFile);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: providerFormData
    });

    if (!response.ok) {
      throw new Error("Transcription failed.");
    }

    const payload = (await response.json()) as { text?: string };
    return NextResponse.json({
      connected: true,
      transcript: payload.text || ""
    });
  } catch {
    return NextResponse.json(
      {
        connected: false,
        transcript: "",
        message: "Xeivora could not transcribe the recording right now."
      },
      { status: 200 }
    );
  }
}
