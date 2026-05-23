const encoder = new TextEncoder();

function createSseSink(controller) {
  return {
    write(chunk) {
      controller.enqueue(encoder.encode(chunk));
    }
  };
}

function createSseResponse(start) {
  let cleanup = null;
  const stream = new ReadableStream({
    async start(controller) {
      const sink = createSseSink(controller);

      try {
        cleanup = (await start(sink, controller)) || null;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Streaming failed.";
        sink.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
      } finally {
        if (typeof cleanup === "function") {
          cleanup();
        }
        controller.close();
      }
    },
    cancel() {
      if (typeof cleanup === "function") {
        cleanup();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive"
    }
  });
}

module.exports = {
  createSseResponse
};
