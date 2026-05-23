const { createDefaultOrbitSnapshot } = require("@/lib/server/orbit-default");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function toChunk(payload: string) {
  return encoder.encode(payload);
}

export async function GET(request: Request) {
  let subscribeOrbitStream = null;
  let fallbackSnapshot = createDefaultOrbitSnapshot();

  try {
    const orbitStore = require("@/lib/server/orbit-store");
    subscribeOrbitStream = orbitStore.subscribeOrbitStream;
    fallbackSnapshot =
      typeof orbitStore.getOrbitSnapshot === "function" ? orbitStore.getOrbitSnapshot() : fallbackSnapshot;
  } catch (error) {
    console.warn(
      "[Xeivora] Orbit stream runtime fell back to built-in demo data.",
      error instanceof Error ? error.message : error
    );
  }

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

      if (typeof subscribeOrbitStream === "function") {
        try {
          unsubscribe = subscribeOrbitStream((snapshot: unknown) => {
            send(`data: ${JSON.stringify(snapshot)}\n\n`);
          });
        } catch (error) {
          console.warn(
            "[Xeivora] Orbit subscription failed. Streaming built-in demo data instead.",
            error instanceof Error ? error.message : error
          );
          send(`data: ${JSON.stringify(fallbackSnapshot)}\n\n`);
        }
      } else {
        send(`data: ${JSON.stringify(fallbackSnapshot)}\n\n`);
      }

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
