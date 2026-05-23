const { subscribeOrbitStream } = require("@/lib/server/orbit-store");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function toChunk(payload: string) {
  return encoder.encode(payload);
}

export async function GET(request: Request) {
  let unsubscribe: (() => void) | null = null;
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const close = () => {
        if (closed) {
          return;
        }

        closed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }

        try {
          controller.close();
        } catch {
          // Ignore repeated closes while the browser disconnects.
        }
      };
      cleanup = close;

      const send = (payload: string) => {
        if (!closed) {
          controller.enqueue(toChunk(payload));
        }
      };

      heartbeat = setInterval(() => {
        send(": keepalive\n\n");
      }, 15000);

      unsubscribe = subscribeOrbitStream((snapshot: unknown) => {
        send(`data: ${JSON.stringify(snapshot)}\n\n`);
      });

      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive"
    }
  });
}
