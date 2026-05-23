const express = require("express");
const next = require("next");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const {
  addUserMessage,
  createSession,
  deleteSession,
  getProviderStatus,
  getSession,
  listSessions,
  removeLastAssistantMessage
} = require("./lib/server/chat-store");
const {
  createChatCompletion,
  getProviderDebugState,
  runProviderDiagnostic,
  streamChatCompletion,
  writeSseEvent
} = require("./lib/server/ai-runtime");
const {
  routeIntent
} = require("./lib/server/intent-router");
const {
  getOrbitSnapshot,
  registerOrbitStream,
  startOrbitTicker
} = require("./lib/server/orbit-store");
const mvpStore = require("./lib/server/mvp-store");

const port = Number.parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const listenHost = process.env.HOST || "0.0.0.0";

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

function logProviderStartupStatus() {
  const providerStatus = getProviderStatus();
  const simulationMode =
    !providerStatus.openai.available && !providerStatus.anthropic.available && !providerStatus.google.available;

  console.log("[Xeivora] Provider availability", {
    openai: providerStatus.openai.available,
    openaiModel: providerStatus.openai.defaultModel,
    anthropic: providerStatus.anthropic.available,
    anthropicModel: providerStatus.anthropic.defaultModel,
    gemini: providerStatus.google.available,
    geminiModel: providerStatus.google.defaultModel,
    simulationMode
  });
}

nextApp.prepare().then(() => {
  const server = express();
  server.disable("x-powered-by");
  server.use(express.json({ limit: "1mb" }));

  server.get("/api/orbit/overview", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(getOrbitSnapshot());
  });

  server.get("/api/orbit/stream", (req, res) => {
    registerOrbitStream(req, res);
  });

  server.get("/api/chat/bootstrap", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    try {
      res.json({
        defaultModel: "orbit-auto",
        providerStatus: getProviderStatus(),
        sessions: await listSessions()
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error instanceof Error ? error.message : "Unable to load Xeivora workspace."
      });
    }
  });

  server.get("/api/debug/providers", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(
      getProviderDebugState({
        modelKey: req.query?.modelKey || "orbit-auto",
        prompt: req.query?.prompt || "hello"
      })
    );
  });

  server.post("/api/debug/openai", async (req, res) => {
    try {
      res.json({
        success: true,
        ...(await runProviderDiagnostic("openai", req.body?.prompt))
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error instanceof Error ? error.message : "OpenAI diagnostic failed."
      });
    }
  });

  server.post("/api/debug/anthropic", async (req, res) => {
    try {
      res.json({
        success: true,
        ...(await runProviderDiagnostic("anthropic", req.body?.prompt))
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error instanceof Error ? error.message : "Anthropic diagnostic failed."
      });
    }
  });

  server.post("/api/debug/gemini", async (req, res) => {
    try {
      res.json({
        success: true,
        ...(await runProviderDiagnostic("gemini", req.body?.prompt))
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        error: error instanceof Error ? error.message : "Gemini diagnostic failed."
      });
    }
  });

  server.get("/api/chats", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json(await listSessions());
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error instanceof Error ? error.message : "Unable to list chats."
      });
    }
  });

  server.post("/api/chats/new", async (req, res) => {
    try {
      const session = await createSession({
        modelPreference: req.body?.modelPreference || "orbit-auto"
      });
      res.status(201).json(session);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error instanceof Error ? error.message : "Unable to create chat."
      });
    }
  });

  server.delete("/api/chats/:id", async (req, res) => {
    try {
      const deleted = await deleteSession(req.params.id);
      res.status(deleted ? 200 : 404).json({ deleted });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error instanceof Error ? error.message : "Unable to delete chat."
      });
    }
  });

  server.post("/api/chat", async (req, res) => {
    const input = req.body?.input?.trim() || req.body?.prompt?.trim();
    const modelKey = req.body?.modelKey || "orbit-auto";

    if (!input) {
      res.status(400).json({ error: "A prompt is required." });
      return;
    }

    try {
      const session = req.body?.sessionId ? await getSession(req.body.sessionId) : null;

      if (req.body?.sessionId && !session) {
        res.status(404).json({
          error: "Chat session not found."
        });
        return;
      }

      const result = await createChatCompletion({
        modelKey,
        prompt: input,
        session,
        historyMessages: Array.isArray(req.body?.messages) ? req.body.messages : []
      });

      res.json({
        response: result.text,
        provider: result.provider,
        resolvedModel: result.route.resolvedModel,
        routeLabel: result.routeLabel,
        intent: result.promptAnalysis.intent,
        complexity: result.promptAnalysis.complexity,
        workflowMode: result.promptAnalysis.workflowNeeded ? result.promptAnalysis.workflowKind : "simple_chat",
        simulationMode: result.simulationMode,
        providerStatus: getProviderDebugState({
          modelKey,
          prompt: input
        })
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error instanceof Error ? error.message : "Xeivora could not complete the response."
      });
    }
  });

  server.post("/api/chat/sessions", async (req, res) => {
    try {
      const session = await createSession({
        modelPreference: req.body?.modelPreference || "orbit-auto"
      });

      res.status(201).json({
        providerStatus: getProviderStatus(),
        session,
        sessions: await listSessions()
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error instanceof Error ? error.message : "Unable to create a Xeivora chat."
      });
    }
  });

  server.get("/api/chat/sessions/:sessionId", async (req, res) => {
    let session;

    try {
      session = await getSession(req.params.sessionId);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error instanceof Error ? error.message : "Unable to load Xeivora chat."
      });
      return;
    }

    if (!session) {
      res.status(404).json({
        error: "Chat session not found."
      });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json(session);
  });

  server.post("/api/chat/sessions/:sessionId/stream", async (req, res) => {
    const input = req.body?.input?.trim();
    const modelKey = req.body?.modelKey || "orbit-auto";
    const regenerate = Boolean(req.body?.regenerate);

    if (!input) {
      res.status(400).json({
        error: "A prompt is required to start streaming."
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
      const session = regenerate
        ? await removeLastAssistantMessage(req.params.sessionId)
        : (await addUserMessage(req.params.sessionId, input, modelKey)).session;

      await streamChatCompletion({
        modelKey,
        prompt: input,
        res,
        session
      });
    } catch (error) {
      writeSseEvent(res, "error", {
        message: error instanceof Error ? error.message : "Xeivora could not complete the stream."
      });
    } finally {
      res.end();
    }
  });

  server.get("/api/memory", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(mvpStore.list("memory"));
  });

  server.post("/api/memory", (req, res) => {
    res.status(201).json(mvpStore.create("memory", {
      type: req.body?.type || "reusable_context",
      title: req.body?.title || "Untitled memory",
      content: req.body?.content || "",
      enabled: req.body?.enabled ?? true
    }));
  });

  server.put("/api/memory/:id", (req, res) => {
    const item = mvpStore.update("memory", req.params.id, req.body || {});
    res.status(item ? 200 : 404).json(item || { error: "Memory not found." });
  });

  server.delete("/api/memory/:id", (req, res) => {
    const deleted = mvpStore.remove("memory", req.params.id);
    res.status(deleted ? 200 : 404).json({ deleted });
  });

  server.get("/api/workflows", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(mvpStore.list("workflows"));
  });

  server.post("/api/workflows", (req, res) => {
    res.status(201).json(mvpStore.create("workflows", {
      name: req.body?.name || "Untitled workflow",
      description: req.body?.description || "",
      steps: Array.isArray(req.body?.steps) ? req.body.steps : [],
      status: req.body?.status || "draft"
    }));
  });

  server.put("/api/workflows/:id", (req, res) => {
    const item = mvpStore.update("workflows", req.params.id, req.body || {});
    res.status(item ? 200 : 404).json(item || { error: "Workflow not found." });
  });

  server.delete("/api/workflows/:id", (req, res) => {
    const deleted = mvpStore.remove("workflows", req.params.id);
    res.status(deleted ? 200 : 404).json({ deleted });
  });

  server.get("/api/agents", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(mvpStore.list("agents"));
  });

  server.get("/api/status", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(mvpStore.getStatus(getProviderStatus(), await listSessions()));
  });

  server.post("/api/orchestrate", (req, res) => {
    const prompt = req.body?.prompt || "";
    const intent = detectIntent(prompt);
    const trace = mvpStore.createTrace({
      prompt,
      intent,
      plan: createWorkflowPlan(intent),
      selectedProvider: "openai",
      fallbackProvider: "anthropic",
      status: "simulated"
    });
    res.status(201).json(trace);
  });

  server.get("/api/continuity/events", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      providerEvents: mvpStore.list("providerEvents"),
      checkpoints: mvpStore.list("checkpoints"),
      traces: mvpStore.list("orchestrationTraces")
    });
  });

  server.get("/api/settings", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(mvpStore.getSettings());
  });

  server.put("/api/settings", (req, res) => {
    res.json(mvpStore.updateSettings(req.body || {}));
  });

  startOrbitTicker();
  server.use((req, res) => handle(req, res));

  server.listen(port, listenHost, () => {
    logProviderStartupStatus();
    console.log(`> Xeivora listening on http://${hostname}:${port}`);
  });
});

function detectIntent(prompt) {
  return routeIntent(prompt).intent;
}

function createWorkflowPlan(intent) {
  return [
    "Receive prompt",
    "Load memory",
    `Detect intent: ${intent}`,
    "Create workflow plan",
    "Select provider chain",
    "Execute with checkpointing",
    "Fail over if needed",
    "Return unified response"
  ];
}
