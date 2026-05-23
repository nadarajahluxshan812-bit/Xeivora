import { NextResponse } from "next/server";

const mvpStore = require("@/lib/server/mvp-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [providerEvents, checkpoints, traces] = await Promise.all([
    mvpStore.list("providerEvents"),
    mvpStore.list("checkpoints"),
    mvpStore.list("orchestrationTraces")
  ]);

  return NextResponse.json(
    {
      providerEvents,
      checkpoints,
      traces
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
