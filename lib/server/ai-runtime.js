const { randomUUID } = require("node:crypto");

const {
  getProviderStatus,
  listSessions,
  saveAssistantMessage,
  updateSessionRoute
} = require("./chat-store");
const {
  createProviderEvent,
  createTrace
} = require("./mvp-store");
const {
  canHandleConversation,
  getConversationResponse
} = require("./conversation-handler");
const {
  canHandleFactualPrompt,
  getFactualResponse,
  hasLiveWeatherAccess,
  isWeatherPrompt
} = require("./factual-response-handler");
const {
  routeIntent
} = require("./intent-router");
const {
  buildMemoryContext,
  getLightweightMemorySnapshot,
  rememberFromUserMessage
} = require("./lightweight-memory");

const MODEL_DEFINITIONS = {
  "orbit-auto": {
    key: "orbit-auto",
    label: "Xeivora Auto",
    provider: "simulation",
    accent: "cyan"
  },
  "gpt-4o": {
    key: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    apiModel: () => process.env.OPENAI_MODEL || "gpt-4o",
    accent: "cyan"
  },
  claude: {
    key: "claude",
    label: "Claude",
    provider: "anthropic",
    apiModel: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    accent: "violet"
  },
  gemini: {
    key: "gemini",
    label: "Gemini",
    provider: "google",
    apiModel: () => process.env.GEMINI_MODEL || "gemini-2.5-flash",
    accent: "emerald"
  }
};

const providerHealthState = {
  openai: {
    disabledUntil: 0,
    lastError: null
  },
  anthropic: {
    disabledUntil: 0,
    lastError: null
  },
  google: {
    disabledUntil: 0,
    lastError: null
  }
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProviderCooldownMs(message = "") {
  if (/\b(insufficient_quota|quota|429|rate limit|invalid api key|permission|unauthorized)\b/i.test(message)) {
    return 5 * 60 * 1000;
  }

  return 60 * 1000;
}

function isProviderHealthy(provider) {
  return !providerHealthState[provider] || providerHealthState[provider].disabledUntil <= Date.now();
}

function markProviderUnavailable(provider, message) {
  if (!providerHealthState[provider]) {
    return;
  }

  providerHealthState[provider] = {
    disabledUntil: Date.now() + getProviderCooldownMs(message),
    lastError: message.slice(0, 180)
  };
}

function markProviderHealthy(provider) {
  if (!providerHealthState[provider]) {
    return;
  }

  providerHealthState[provider] = {
    disabledUntil: 0,
    lastError: null
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = Number.parseInt(process.env.PROVIDER_TIMEOUT_MS || "15000", 10)) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Provider request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getStreamIdleTimeoutMs() {
  return Number.parseInt(process.env.PROVIDER_STREAM_IDLE_TIMEOUT_MS || process.env.PROVIDER_TIMEOUT_MS || "15000", 10);
}

function writeSseEvent(res, type, payload) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function normalizeConversationMessages(messages) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content
    }));
}

function buildSystemPrompt({ memorySnapshot, promptAnalysis }) {
  const instructions = [
    "You are Xeivora, the conversational workspace assistant inside Xeivora.",
    "Answer naturally first, then add structure only when it genuinely helps.",
    "For greetings, introductions, simple questions, factual requests, and conversational prompts, respond directly without talking about orchestration.",
    "Only mention workflows, continuity, routing, providers, or handoffs when the user explicitly asks for them or the task truly requires multi-step execution.",
    "Never use filler like 'Give me one more detail'.",
    "If the user shares their name, preferences, or current project, acknowledge that naturally in one short sentence and treat it as remembered workspace context.",
    "If the user asks about remembered workspace context such as their name, answer directly from memory when it is available.",
    "Do not invent weather, live data, tool results, or provider handoffs.",
    "Do not claim you completed orchestration steps unless the runtime actually performed them.",
    "Be concise, high-signal, and operationally useful.",
    "When returning code, use fenced code blocks with language labels."
  ];
  const memoryContext = buildMemoryContext(memorySnapshot);

  if (memoryContext) {
    instructions.push(`Workspace memory: ${memoryContext}`);
  }

  if (promptAnalysis?.workflowNeeded) {
    instructions.push("This task does justify an execution-oriented answer, so you can be structured and operational.");
  }

  return instructions.join(" ");
}

function pickAutoRoute(prompt, providerStatus) {
  const lower = prompt.toLowerCase();

  if (/(policy|contract|brief|long-form|spec|compare|analysis)/.test(lower)) {
    return providerStatus.anthropic.available ? "claude" : "gpt-4o";
  }

  if (/(image|vision|classify|search|multimodal|extract)/.test(lower)) {
    return providerStatus.google.available ? "gemini" : "gpt-4o";
  }

  if (providerStatus.openai.available) {
    return "gpt-4o";
  }

  if (providerStatus.anthropic.available) {
    return "claude";
  }

  if (providerStatus.google.available) {
    return "gemini";
  }

  return "gpt-4o";
}

function resolveRoute(modelKey, prompt) {
  const providerStatus = getProviderStatus();

  if (modelKey === "orbit-auto") {
    const resolvedKey = pickAutoRoute(prompt, providerStatus);
    const resolved = MODEL_DEFINITIONS[resolvedKey];
    const routeLabel = `Xeivora Auto routed to ${resolved.label}`;
    return {
      routeLabel,
      requestedModelKey: modelKey,
      resolvedModelKey: resolvedKey,
      resolvedModelLabel: resolved.label,
      resolvedProvider: resolved.provider,
      resolvedModel: resolved.apiModel ? resolved.apiModel() : resolved.label,
      providerStatus
    };
  }

  const selected = MODEL_DEFINITIONS[modelKey];

  return {
    routeLabel: `${selected.label} direct route`,
    requestedModelKey: modelKey,
    resolvedModelKey: modelKey,
    resolvedModelLabel: selected.label,
    resolvedProvider: selected.provider,
    resolvedModel: selected.apiModel ? selected.apiModel() : selected.label,
    providerStatus
  };
}

function buildOrchestrationSteps({ prompt, route, session }) {
  const promptPreview = prompt.replace(/\s+/g, " ").trim().slice(0, 68);
  return [
    {
      id: "capture",
      label: "Prompt capture",
      detail: `Stored "${promptPreview}${promptPreview.length >= 68 ? "..." : ""}" inside workspace memory.`,
      state: "complete",
      accent: "cyan"
    },
    {
      id: "memory",
      label: "Context memory",
      detail: `Loaded ${Math.max(session.messages.length - 1, 0)} prior turns from conversation memory.`,
      state: "active",
      accent: "violet"
    },
    {
      id: "route",
      label: "Model routing",
      detail: `Selected ${route.resolvedModelLabel} for this response path.`,
      state: "pending",
      accent: "emerald"
    },
    {
      id: "compose",
      label: "Response synthesis",
      detail: "Streaming markdown output and updating Xeivora memory lanes.",
      state: "pending",
      accent: "amber"
    }
  ];
}

async function streamPlainText(text, onDelta, chunkSize = 28) {
  for (const chunk of text.match(new RegExp(`[\\s\\S]{1,${chunkSize}}`, "g")) || []) {
    await delay(24);
    await onDelta(chunk);
  }
}

function advanceSteps(steps, activeId) {
  const activeIndex = steps.findIndex((step) => step.id === activeId);

  return steps.map((step, index) => ({
    ...step,
    state: index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending"
  }));
}

async function streamOpenAI({ messages, model, onDelta, systemPrompt }) {
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
      ]
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  await readSseStream(response, async ({ data }) => {
    if (data === "[DONE]") {
      return;
    }

    const payload = JSON.parse(data);
    const delta = payload.choices?.[0]?.delta?.content;

    if (typeof delta === "string" && delta.length > 0) {
      await onDelta(delta);
    }
  });
}

async function streamAnthropic({ messages, model, onDelta, systemPrompt }) {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY
    },
    body: JSON.stringify({
      max_tokens: 1400,
      model,
      stream: true,
      system: systemPrompt,
      messages
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  await readSseStream(response, async ({ data }) => {
    if (!data) {
      return;
    }

    const payload = JSON.parse(data);

    if (
      payload.type === "content_block_delta" &&
      payload.delta?.type === "text_delta" &&
      typeof payload.delta.text === "string"
    ) {
      await onDelta(payload.delta.text);
    }
  });
}

async function streamGemini({ messages, model, onDelta, systemPrompt }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  let aggregate = "";

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.7
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `System instructions: ${systemPrompt}`
            }
          ]
        },
        ...messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }]
        }))
      ]
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  await readSseStream(response, async ({ data }) => {
    if (!data) {
      return;
    }

    const payload = JSON.parse(data);
    const candidate = Array.isArray(payload) ? payload[0] : payload;
    const parts = candidate?.candidates?.[0]?.content?.parts || [];
    const nextText = parts.map((part) => part.text || "").join("");

    if (!nextText) {
      return;
    }

    const delta = nextText.startsWith(aggregate) ? nextText.slice(aggregate.length) : nextText;
    aggregate = nextText;

    if (delta) {
      await onDelta(delta);
    }
  });
}

function toPublicProviderKey(provider) {
  return provider === "google" ? "gemini" : provider;
}

function getProviderLabel(provider) {
  if (provider === "openai") {
    return "OpenAI";
  }

  if (provider === "anthropic") {
    return "Claude";
  }

  if (provider === "google") {
    return "Gemini";
  }

  if (provider === "workspace") {
    return "Workspace";
  }

  if (provider === "provider-error") {
    return "Provider error";
  }

  return "Simulation";
}

function getProviderModel(provider, route) {
  if (provider === route.resolvedProvider) {
    return route.resolvedModel;
  }

  if (provider === "openai") {
    return process.env.OPENAI_MODEL || "gpt-4o";
  }

  if (provider === "anthropic") {
    return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  }

  if (provider === "google") {
    return process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  return null;
}

function isProviderAvailable(provider, providerStatus) {
  if (provider === "openai") {
    return providerStatus.openai.available && isProviderHealthy(provider);
  }

  if (provider === "anthropic") {
    return providerStatus.anthropic.available && isProviderHealthy(provider);
  }

  if (provider === "google") {
    return providerStatus.google.available && isProviderHealthy(provider);
  }

  return false;
}

function hasAnyLiveProvider(providerStatus) {
  return (
    isProviderAvailable("openai", providerStatus) ||
    isProviderAvailable("anthropic", providerStatus) ||
    isProviderAvailable("google", providerStatus)
  );
}

function hasConfiguredProviderKeys(providerStatus) {
  return providerStatus.openai.available || providerStatus.anthropic.available || providerStatus.google.available;
}

function getProviderOrder(route) {
  const preferredProvider = isProviderAvailable(route.resolvedProvider, route.providerStatus) ? route.resolvedProvider : null;
  const remainingProviders = ["openai", "anthropic", "google"].filter((provider) => provider !== preferredProvider);

  return [preferredProvider, ...remainingProviders].filter(
    (provider) => provider && isProviderAvailable(provider, route.providerStatus)
  );
}

function getFallbackProvider(route, attemptedProviders = []) {
  return getProviderOrder(route).find((provider) => !attemptedProviders.includes(provider)) || null;
}

function isRuntimeStatusPrompt(prompt) {
  const lower = prompt.toLowerCase();

  return (
    /\bwhich ai is responding now\b/.test(lower) ||
    /\bwhich model is responding now\b/.test(lower) ||
    /\bcurrent provider\b/.test(lower) ||
    /\bwhich ai\b.*\brespond/.test(lower) ||
    /\bwhat model\b.*\busing\b/.test(lower) ||
    /\bwhat provider\b.*\busing\b/.test(lower)
  );
}

function buildRuntimeStatusResponse({ route, promptAnalysis, currentProvider = null }) {
  const activeProvider = currentProvider || getProviderOrder(route)[0] || "simulation";
  const fallbackProvider = getFallbackProvider(route, activeProvider === "simulation" ? [] : [activeProvider]);

  return [
    `Current provider: ${getProviderLabel(activeProvider)}`,
    `Model: ${activeProvider === "simulation" ? "No live model configured" : getProviderModel(activeProvider, route)}`,
    `Fallback provider: ${fallbackProvider ? getProviderLabel(fallbackProvider) : "None"}`,
    `Continuity: ${promptAnalysis.workflowNeeded && activeProvider !== "simulation" ? "active" : "inactive"}`
  ].join("\n");
}

async function getUtilityLocalResponse({
  prompt,
  route,
  promptAnalysis,
  memorySnapshot,
  rememberedMemory,
  session = null
}) {
  if (canHandleConversation(prompt)) {
    const conversationResponse = getConversationResponse({
      prompt,
      memorySnapshot,
      rememberedMemory
    });

    if (conversationResponse) {
      return conversationResponse;
    }
  }

  if (isRuntimeStatusPrompt(prompt)) {
    const currentProvider = ["openai", "anthropic", "google"].includes(session?.lastProvider) ? session.lastProvider : null;

    return buildRuntimeStatusResponse({
      route,
      promptAnalysis,
      currentProvider
    });
  }

  if (isWeatherPrompt(prompt) && !hasLiveWeatherAccess()) {
    return getFactualResponse({
      prompt
    });
  }

  return null;
}

async function buildNoProviderFallbackResponse({ prompt, memorySnapshot, rememberedMemory, providerStatus }) {
  if (canHandleConversation(prompt)) {
    const conversationResponse = getConversationResponse({
      prompt,
      memorySnapshot,
      rememberedMemory
    });

    if (conversationResponse) {
      return conversationResponse;
    }
  }

  if (canHandleFactualPrompt(prompt)) {
    const factualResponse = await getFactualResponse({
      prompt
    });

    if (factualResponse) {
      return factualResponse;
    }
  }

  if (hasConfiguredProviderKeys(providerStatus)) {
    return "I couldn’t reach the configured AI providers just now. The keys are loaded, but the live provider runtime is currently unavailable or out of quota.";
  }

  return "I don’t have any live AI providers configured yet. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY in .env.local and I’ll respond using a real provider.";
}

async function streamNoProviderFallback({ prompt, memorySnapshot, rememberedMemory, providerStatus, onDelta }) {
  const text = await buildNoProviderFallbackResponse({
    prompt,
    memorySnapshot,
    rememberedMemory,
    providerStatus
  });

  await streamPlainText(text, onDelta, 24);
  return text;
}

async function runProviderStream({ provider, messages, route, systemPrompt, onDelta }) {
  if (provider === "openai") {
    await streamOpenAI({
      messages,
      model: getProviderModel(provider, route),
      systemPrompt,
      onDelta
    });
    return "openai";
  }

  if (provider === "anthropic") {
    await streamAnthropic({
      messages,
      model: getProviderModel(provider, route),
      systemPrompt,
      onDelta
    });
    return "anthropic";
  }

  if (provider === "google") {
    await streamGemini({
      messages,
      model: getProviderModel(provider, route),
      systemPrompt,
      onDelta
    });
    return "google";
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

async function collectProviderResponse({ provider, messages, route, systemPrompt }) {
  let text = "";

  await runProviderStream({
    provider,
    messages,
    route,
    systemPrompt,
    onDelta: async (delta) => {
      text += delta;
    }
  });

  return text;
}

function buildProviderFailureMessage(route, errors) {
  const attempted = errors.map((entry) => getProviderLabel(entry.provider)).join(", ") || "no providers";
  const firstMessage = errors[0]?.message?.replace(/\s+/g, " ").trim().slice(0, 180);
  const details = firstMessage ? ` ${firstMessage}` : "";

  return `I couldn’t reach the configured AI providers just now (${attempted}).${details}`;
}

async function runProviderSequence({
  route,
  messages,
  systemPrompt,
  onDelta,
  promptAnalysis,
  res,
  session,
  prompt
}) {
  const providerOrder = getProviderOrder(route);
  const providerChain = providerOrder.map((provider) => toPublicProviderKey(provider));
  const errors = [];

  if (promptAnalysis.workflowNeeded) {
    void createTrace({
      sessionId: session?.id,
      prompt,
      intent: promptAnalysis.intent,
      plan: [
        "Preserved workspace memory",
        `Selected ${getProviderLabel(providerOrder[0] || route.resolvedProvider)} as the primary provider`,
        "Prepared a direct provider-first response path",
        "Kept continuity active for this complex request"
      ],
      selectedProvider: providerOrder[0] || route.resolvedProvider,
      fallbackProvider: providerOrder[1] || null,
      status: "running"
    });
  }

  for (const [index, provider] of providerOrder.entries()) {
    const attemptedProviders = providerOrder.slice(0, index);
    const nextFallback = getFallbackProvider(route, [...attemptedProviders, provider]);

    if (promptAnalysis.workflowNeeded && res) {
      emitContinuity(res, {
        currentProvider: toPublicProviderKey(provider),
        fallbackProvider: nextFallback ? toPublicProviderKey(nextFallback) : null,
        providerChain,
        tokenRateStatus: index === 0 ? "live provider active" : "fallback provider active",
        checkpointSaved: false,
        contextCompressed: index > 0,
        memoryPreserved: true,
        continuityActive: true,
        contextLossPercentage: 0,
        finalProviderChain: providerOrder.slice(0, index).map((entry) => toPublicProviderKey(entry))
      });
    }

    try {
      const providerUsed = await runProviderStream({
        provider,
        messages,
        route,
        systemPrompt,
        onDelta
      });
      markProviderHealthy(providerUsed);

      return {
        providerUsed,
        attemptedProviders: [...attemptedProviders, providerUsed],
        providerChain,
        errors
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error.";
      markProviderUnavailable(provider, message);
      errors.push({
        provider,
        message
      });

      if (nextFallback && session?.id) {
        void createProviderEvent({
          type: "fallback",
          sessionId: session.id,
          fromProvider: provider,
          toProvider: nextFallback,
          reason: message
        });
      }
    }
  }

  throw new Error(buildProviderFailureMessage(route, errors));
}

async function readSseStream(response, onEvent) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("Streaming response body is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const idleTimeoutMs = getStreamIdleTimeoutMs();

  const processEventBlocks = async (eventBlocks) => {
    for (const eventBlock of eventBlocks) {
      const normalizedBlock = eventBlock.trim();

      if (!normalizedBlock) {
        continue;
      }

      const lines = normalizedBlock.split("\n");
      let eventName = "message";
      const dataLines = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      await onEvent({
        event: eventName,
        data: dataLines.join("\n")
      });
    }
  };

  while (true) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Provider stream timed out after ${idleTimeoutMs}ms without new data.`)),
        idleTimeoutMs
      );
    });
    const { done, value } = await Promise.race([reader.read(), timeout]);
    clearTimeout(timeoutId);

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    await processEventBlocks(events);
  }

  const flushed = `${buffer}${decoder.decode()}`.replace(/\r\n/g, "\n").trim();

  if (flushed) {
    await processEventBlocks([flushed]);
  }
}

async function emitOrchestration(res, routeLabel, provider, steps, activeId) {
  const nextSteps = advanceSteps(steps, activeId);
  writeSseEvent(res, "orchestration", {
    provider,
    routeLabel,
    steps: nextSteps
  });
  return nextSteps;
}

function emitContinuity(res, payload) {
  writeSseEvent(res, "continuity", payload);
}

function getRouteLabel({ promptAnalysis, liveProviderAvailable, configuredProviderAvailable, utilityResponse }) {
  if (utilityResponse && promptAnalysis.intent === "factual") {
    return "Workspace status";
  }

  if (!liveProviderAvailable) {
    return configuredProviderAvailable ? "Provider unavailable" : "Provider setup required";
  }

  if (promptAnalysis.workflowNeeded && promptAnalysis.intent === "coding") {
    return "Coding continuity";
  }

  if (promptAnalysis.workflowNeeded && promptAnalysis.intent === "orchestration") {
    return "Orchestration mode";
  }

  if (promptAnalysis.workflowNeeded) {
    return "Continuity mode";
  }

  if (promptAnalysis.intent === "factual") {
    return "Direct answer";
  }

  if (promptAnalysis.intent === "coding") {
    return "Developer mode";
  }

  if (promptAnalysis.intent === "workflow") {
    return "Task mode";
  }

  return "Direct chat";
}

async function prepareRuntimeContext({ modelKey, prompt, session = null, historyMessages = [] }) {
  const route = resolveRoute(modelKey, prompt);
  const promptAnalysis = routeIntent(prompt);
  const rememberedMemory = await rememberFromUserMessage({
    sessionId: session?.id,
    prompt
  });
  const memorySnapshot = await getLightweightMemorySnapshot({
    sessionId: session?.id
  });
  const systemPrompt = buildSystemPrompt({
    memorySnapshot,
    promptAnalysis
  });
  const utilityResponse = await getUtilityLocalResponse({
    prompt,
    route,
    promptAnalysis,
    memorySnapshot,
    rememberedMemory,
    session
  });
  const configuredProviderAvailable = hasConfiguredProviderKeys(route.providerStatus);
  const liveProviderAvailable = hasAnyLiveProvider(route.providerStatus);
  const sourceMessages =
    session?.messages?.length
      ? session.messages
      : historyMessages.length
        ? [...historyMessages, { role: "user", content: prompt }]
        : [{ role: "user", content: prompt }];

  return {
    route,
    promptAnalysis,
    rememberedMemory,
    memorySnapshot,
    systemPrompt,
    utilityResponse,
    configuredProviderAvailable,
    liveProviderAvailable,
    conversationMessages: normalizeConversationMessages(sourceMessages)
  };
}

function getProviderDebugState({ modelKey = "orbit-auto", prompt = "hello" } = {}) {
  const route = resolveRoute(modelKey, prompt);
  const promptAnalysis = routeIntent(prompt);
  const providerOrder = getProviderOrder(route);
  const activeProvider = providerOrder[0] || "simulation";
  const fallbackProvider = providerOrder[1] || null;

  return {
    openai: route.providerStatus.openai.available,
    anthropic: route.providerStatus.anthropic.available,
    gemini: route.providerStatus.google.available,
    activeProvider: toPublicProviderKey(activeProvider),
    activeModel: activeProvider === "simulation" ? null : getProviderModel(activeProvider, route),
    fallbackProvider: fallbackProvider ? toPublicProviderKey(fallbackProvider) : null,
    simulationMode: !hasAnyLiveProvider(route.providerStatus),
    continuity: promptAnalysis.workflowNeeded ? "active" : "inactive"
  };
}

async function runProviderDiagnostic(providerKey, prompt = "Reply with one short sentence confirming the connection is live.") {
  const normalizedProvider = providerKey === "gemini" ? "google" : providerKey;
  const modelKey = normalizedProvider === "openai" ? "gpt-4o" : normalizedProvider === "anthropic" ? "claude" : "gemini";
  const route = resolveRoute(modelKey, prompt);

  if (!isProviderAvailable(route.resolvedProvider, route.providerStatus)) {
    const error = new Error(`${getProviderLabel(route.resolvedProvider)} is not configured.`);
    error.statusCode = 400;
    throw error;
  }

  const text = await collectProviderResponse({
    provider: route.resolvedProvider,
    route,
    systemPrompt: "You are a provider health-check assistant. Reply in one short sentence.",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return {
    provider: toPublicProviderKey(route.resolvedProvider),
    label: getProviderLabel(route.resolvedProvider),
    model: getProviderModel(route.resolvedProvider, route),
    text: text.trim()
  };
}

async function createChatCompletion({ modelKey = "orbit-auto", prompt, session = null, historyMessages = [] }) {
  const runtime = await prepareRuntimeContext({
    modelKey,
    prompt,
    session,
    historyMessages
  });

  const routeLabel = getRouteLabel({
    promptAnalysis: runtime.promptAnalysis,
    liveProviderAvailable: runtime.liveProviderAvailable,
    configuredProviderAvailable: runtime.configuredProviderAvailable,
    utilityResponse: runtime.utilityResponse
  });

  if (runtime.utilityResponse) {
    return {
      text: runtime.utilityResponse,
      provider: "workspace",
      routeLabel,
      route: runtime.route,
      promptAnalysis: runtime.promptAnalysis,
      simulationMode: !runtime.liveProviderAvailable
    };
  }

  if (!runtime.liveProviderAvailable) {
    const text = await buildNoProviderFallbackResponse({
      prompt,
      memorySnapshot: runtime.memorySnapshot,
      rememberedMemory: runtime.rememberedMemory,
      providerStatus: runtime.route.providerStatus
    });

    return {
      text,
      provider: "simulation",
      routeLabel,
      route: runtime.route,
      promptAnalysis: runtime.promptAnalysis,
      simulationMode: true
    };
  }

  let text = "";
  let providerResult;

  try {
    providerResult = await runProviderSequence({
      route: runtime.route,
      messages: runtime.conversationMessages,
      systemPrompt: runtime.systemPrompt,
      onDelta: async (delta) => {
        text += delta;
      },
      promptAnalysis: runtime.promptAnalysis,
      session,
      prompt
    });
  } catch (error) {
    return {
      text: error instanceof Error ? error.message : "Xeivora could not reach a live AI provider.",
      provider: "provider-error",
      routeLabel,
      route: runtime.route,
      promptAnalysis: runtime.promptAnalysis,
      simulationMode: false
    };
  }

  return {
    text,
    provider: providerResult.providerUsed,
    routeLabel,
    route: runtime.route,
    promptAnalysis: runtime.promptAnalysis,
    simulationMode: false
  };
}

async function streamChatCompletion({
  modelKey,
  prompt,
  res,
  session
}) {
  const runtime = await prepareRuntimeContext({
    modelKey,
    prompt,
    session
  });
  const providerOrder = getProviderOrder(runtime.route);
  const initialProvider = runtime.utilityResponse
    ? "workspace"
    : runtime.liveProviderAvailable
      ? providerOrder[0]
      : "simulation";
  const routeLabel = getRouteLabel({
    promptAnalysis: runtime.promptAnalysis,
    liveProviderAvailable: runtime.liveProviderAvailable,
    configuredProviderAvailable: runtime.configuredProviderAvailable,
    utilityResponse: runtime.utilityResponse
  });

  await updateSessionRoute(session.id, routeLabel, initialProvider);

  const assistantMessageId = randomUUID();
  writeSseEvent(res, "meta", {
    assistantMessageId,
    modelKey,
    provider: toPublicProviderKey(initialProvider),
    resolvedModel: initialProvider === "simulation" || initialProvider === "workspace" ? null : getProviderModel(initialProvider, runtime.route),
    routeLabel,
    intent: runtime.promptAnalysis.intent,
    complexity: runtime.promptAnalysis.complexity,
    workflowMode: runtime.promptAnalysis.workflowNeeded ? runtime.promptAnalysis.workflowKind : "simple_chat",
    showContinuityPanel: runtime.promptAnalysis.workflowNeeded && runtime.liveProviderAvailable,
    fallbackProvider: (() => {
      const fallbackProvider = getFallbackProvider(
        runtime.route,
        initialProvider === "simulation" || initialProvider === "workspace" ? [] : [initialProvider]
      );
      return fallbackProvider ? toPublicProviderKey(fallbackProvider) : null;
    })(),
    simulationMode: !runtime.liveProviderAvailable
  });

  if (runtime.promptAnalysis.workflowNeeded && runtime.liveProviderAvailable) {
    let steps = buildOrchestrationSteps({
      prompt,
      route: runtime.route,
      session
    });

    steps = await emitOrchestration(res, routeLabel, toPublicProviderKey(initialProvider), steps, "capture");
    steps = await emitOrchestration(res, routeLabel, toPublicProviderKey(initialProvider), steps, "memory");
    steps = await emitOrchestration(res, routeLabel, toPublicProviderKey(initialProvider), steps, "route");
    await emitOrchestration(res, routeLabel, toPublicProviderKey(initialProvider), steps, "compose");
  }

  let assistantContent = "";
  let providerUsed = initialProvider;

  const onDelta = async (delta) => {
    assistantContent += delta;
    writeSseEvent(res, "delta", {
      text: delta
    });
  };

  try {
    if (runtime.utilityResponse) {
      await streamPlainText(runtime.utilityResponse, onDelta, 24);
    } else if (!runtime.liveProviderAvailable) {
      providerUsed = "simulation";
      await streamNoProviderFallback({
        prompt,
        memorySnapshot: runtime.memorySnapshot,
        rememberedMemory: runtime.rememberedMemory,
        providerStatus: runtime.route.providerStatus,
        onDelta
      });
    } else {
      const providerResult = await runProviderSequence({
        route: runtime.route,
        messages: runtime.conversationMessages,
        systemPrompt: runtime.systemPrompt,
        onDelta,
        promptAnalysis: runtime.promptAnalysis,
        res,
        session,
        prompt
      });

      providerUsed = providerResult.providerUsed;
    }
  } catch (error) {
    providerUsed = "provider-error";
    const message = error instanceof Error ? error.message : "Xeivora could not reach a live AI provider.";
    await streamPlainText(message, onDelta, 24);
  }

  const completedSession = await saveAssistantMessage(session.id, {
    id: assistantMessageId,
    role: "assistant",
    content: assistantContent,
    createdAt: new Date().toISOString(),
    modelKey,
    provider: providerUsed
  });

  writeSseEvent(res, "done", {
    session: completedSession,
    sessions: await listSessions()
  });
}

module.exports = {
  createChatCompletion,
  getProviderDebugState,
  getProviderStatus,
  listSessions,
  runProviderDiagnostic,
  streamChatCompletion,
  writeSseEvent
};
