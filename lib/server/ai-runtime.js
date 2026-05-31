const { randomUUID } = require("node:crypto");

const {
  getProviderStatus,
  listSessions,
  saveAssistantMessage,
  updateSessionRoute
} = require("./chat-store");
const {
  createCheckpoint,
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
const { listFiles } = require("./workspace-store");
const { executeTools } = require("./tool-executor");
const {
  PROVIDER_ERROR_TYPES,
  classifyProviderError
} = require("./provider-error-classifier");

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
    lastError: null,
    lastErrorType: null,
    consecutiveFailures: 0,
    totalFailures: 0
  },
  anthropic: {
    disabledUntil: 0,
    lastError: null,
    lastErrorType: null,
    consecutiveFailures: 0,
    totalFailures: 0
  },
  google: {
    disabledUntil: 0,
    lastError: null,
    lastErrorType: null,
    consecutiveFailures: 0,
    totalFailures: 0
  },
  ollama: {
    disabledUntil: 0,
    lastError: null,
    lastErrorType: null,
    consecutiveFailures: 0,
    totalFailures: 0
  }
};

const MAX_PROVIDER_ATTEMPTS = 2;
const MAX_CONTINUATION_CONTEXT_CHARS = 2200;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOllamaConfigured() {
  return Boolean(process.env.OLLAMA_ENABLED === "true" || process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);
}

function getOllamaModel() {
  return process.env.OLLAMA_MODEL || "llama3.1:8b";
}

function getProviderHealthPenalty(provider) {
  const state = providerHealthState[provider];

  if (!state) {
    return 0;
  }

  const cooldownPenalty = state.disabledUntil > Date.now() ? 1000 : 0;
  return cooldownPenalty + state.consecutiveFailures * 40 + Math.min(state.totalFailures, 5) * 6;
}

function isProviderHealthy(provider) {
  return !providerHealthState[provider] || providerHealthState[provider].disabledUntil <= Date.now();
}

function markProviderUnavailable(provider, classification) {
  if (!providerHealthState[provider]) {
    return;
  }

  providerHealthState[provider] = {
    disabledUntil: Date.now() + (classification?.cooldownMs || 60 * 1000),
    lastError: (classification?.rawMessage || "Provider failed.").slice(0, 180),
    lastErrorType: classification?.type || PROVIDER_ERROR_TYPES.PROVIDER_DOWN,
    consecutiveFailures: providerHealthState[provider].consecutiveFailures + 1,
    totalFailures: providerHealthState[provider].totalFailures + 1
  };
}

function markProviderHealthy(provider) {
  if (!providerHealthState[provider]) {
    return;
  }

  providerHealthState[provider] = {
    disabledUntil: 0,
    lastError: null,
    lastErrorType: null,
    consecutiveFailures: 0,
    totalFailures: providerHealthState[provider].totalFailures
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
      const timeoutError = new Error(`Provider request timed out after ${timeoutMs}ms.`);
      timeoutError.code = "PROVIDER_TIMEOUT";
      throw timeoutError;
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

function buildSystemPrompt({ memorySnapshot, promptAnalysis, workspaceContext }) {
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

  if (workspaceContext) {
    instructions.push(`Workspace context:\n${workspaceContext}`);
  }

  return instructions.join(" ");
}

function pickAutoRoute(prompt, providerStatus, promptAnalysis = routeIntent(prompt)) {
  const lower = prompt.toLowerCase();

  if (promptAnalysis.intent === "coding") {
    return providerStatus.openai.available ? "gpt-4o" : providerStatus.anthropic.available ? "claude" : "gemini";
  }

  if (
    /(policy|contract|brief|long-form|spec|compare|analysis|student visa|immigration|reasoning|research|strategy)/.test(lower) ||
    (promptAnalysis.complexity === "complex" && promptAnalysis.intent !== "conversational")
  ) {
    return providerStatus.anthropic.available ? "claude" : "gpt-4o";
  }

  if (
    promptAnalysis.intent === "conversational" ||
    promptAnalysis.intent === "factual" ||
    promptAnalysis.complexity === "simple" ||
    /(image|vision|classify|search|multimodal|extract)/.test(lower)
  ) {
    return providerStatus.google.available ? "gemini" : "gpt-4o";
  }

  if (providerStatus.anthropic.available) {
    return "claude";
  }

  if (providerStatus.openai.available) {
    return "gpt-4o";
  }

  if (providerStatus.google.available) {
    return "gemini";
  }

  return "gpt-4o";
}

function resolveRoute(modelKey, prompt, promptAnalysis = routeIntent(prompt)) {
  const providerStatus = getProviderStatus();

  if (modelKey === "orbit-auto") {
    const resolvedKey = pickAutoRoute(prompt, providerStatus, promptAnalysis);
    const resolved = MODEL_DEFINITIONS[resolvedKey];
    const routeLabel = `Xeivora Auto routed to ${resolved.label}`;
    return {
      prompt,
      promptAnalysis,
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
    prompt,
    promptAnalysis,
    routeLabel: `${selected.label} direct route`,
    requestedModelKey: modelKey,
    resolvedModelKey: modelKey,
    resolvedModelLabel: selected.label,
    resolvedProvider: selected.provider,
    resolvedModel: selected.apiModel ? selected.apiModel() : selected.label,
    providerStatus
  };
}

function getPreferredProviderChain(route) {
  const promptAnalysis = route.promptAnalysis || routeIntent(route.prompt || "");
  const lower = (route.prompt || "").toLowerCase();

  if (route.requestedModelKey !== "orbit-auto") {
    const explicitChains = {
      openai: ["openai", "anthropic", "google", "ollama"],
      anthropic: ["anthropic", "openai", "google", "ollama"],
      google: ["google", "openai", "anthropic", "ollama"],
      ollama: ["ollama", "openai", "anthropic", "google"]
    };

    return explicitChains[route.resolvedProvider] || ["openai", "anthropic", "google", "ollama"];
  }

  if (promptAnalysis.intent === "coding") {
    return ["openai", "anthropic", "google", "ollama"];
  }

  if (
    promptAnalysis.complexity === "complex" ||
    /(analysis|compare|policy|contract|student visa|reasoning|research|strategy|brief|spec)/.test(lower)
  ) {
    return ["anthropic", "openai", "google", "ollama"];
  }

  return ["openai", "anthropic", "google", "ollama"];
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
    const responseBody = await response.text();
    const providerError = new Error(responseBody || `OpenAI returned ${response.status}.`);
    providerError.statusCode = response.status;
    throw providerError;
  }

  let emittedContent = false;
  await readSseStream(response, async ({ data }) => {
    if (data === "[DONE]") {
      return;
    }

    const payload = JSON.parse(data);
    const delta = payload.choices?.[0]?.delta?.content;

    if (typeof delta === "string" && delta.length > 0) {
      emittedContent = true;
      await onDelta(delta);
    }
  });

  if (!emittedContent) {
    throw new Error("Provider stream finished without content.");
  }
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
    const responseBody = await response.text();
    const providerError = new Error(responseBody || `Anthropic returned ${response.status}.`);
    providerError.statusCode = response.status;
    throw providerError;
  }

  let emittedContent = false;
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
      emittedContent = true;
      await onDelta(payload.delta.text);
    }
  });

  if (!emittedContent) {
    throw new Error("Provider stream finished without content.");
  }
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
    const responseBody = await response.text();
    const providerError = new Error(responseBody || `Gemini returned ${response.status}.`);
    providerError.statusCode = response.status;
    throw providerError;
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

  if (!aggregate.trim()) {
    throw new Error("Provider stream finished without content.");
  }
}

async function streamOllama({ messages, model, onDelta, systemPrompt }) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      stream: true,
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
    const responseBody = await response.text();
    const providerError = new Error(responseBody || `Ollama returned ${response.status}.`);
    providerError.statusCode = response.status;
    throw providerError;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response body is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let emittedContent = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const payload = JSON.parse(trimmed);
      const delta = payload?.message?.content || "";

      if (delta) {
        emittedContent = true;
        await onDelta(delta);
      }
    }
  }

  if (!emittedContent) {
    throw new Error("Provider stream finished without content.");
  }
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

  if (provider === "ollama") {
    return "Ollama";
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

  if (provider === "ollama") {
    return getOllamaModel();
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

  if (provider === "ollama") {
    return isOllamaConfigured() && isProviderHealthy(provider);
  }

  return false;
}

function isProviderConfigured(provider, providerStatus) {
  if (provider === "openai") {
    return providerStatus.openai.available;
  }

  if (provider === "anthropic") {
    return providerStatus.anthropic.available;
  }

  if (provider === "google") {
    return providerStatus.google.available;
  }

  if (provider === "ollama") {
    return isOllamaConfigured();
  }

  return false;
}

function hasAnyLiveProvider(providerStatus) {
  return (
    isProviderAvailable("openai", providerStatus) ||
    isProviderAvailable("anthropic", providerStatus) ||
    isProviderAvailable("google", providerStatus) ||
    isProviderAvailable("ollama", providerStatus)
  );
}

function hasConfiguredProviderKeys(providerStatus) {
  return (
    providerStatus.openai.available ||
    providerStatus.anthropic.available ||
    providerStatus.google.available ||
    isOllamaConfigured()
  );
}

function getProviderOrder(route) {
  const baseChain = getPreferredProviderChain(route);

  return baseChain
    .filter((provider) => isProviderAvailable(provider, route.providerStatus))
    .sort((left, right) => {
      const leftScore = baseChain.indexOf(left) * 100 + getProviderHealthPenalty(left);
      const rightScore = baseChain.indexOf(right) * 100 + getProviderHealthPenalty(right);
      return leftScore - rightScore;
    });
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
  const fallbackChain = getProviderOrder(route)
    .filter((provider) => provider !== activeProvider)
    .map((provider) => getProviderLabel(provider));

  return [
    `Current provider: ${getProviderLabel(activeProvider)}`,
    `Model: ${activeProvider === "simulation" ? "No live model configured" : getProviderModel(activeProvider, route)}`,
    `Fallback chain: ${fallbackChain.length ? fallbackChain.join(" → ") : "None"}`,
    `Continuity: ${promptAnalysis.workflowNeeded && activeProvider !== "simulation" ? "active" : "inactive"}`
  ].join("\n");
}

async function getUtilityLocalResponse({
  prompt,
  route,
  promptAnalysis,
  memorySnapshot,
  rememberedMemory,
  toolExecution,
  session = null
}) {
  if (toolExecution?.localResponse) {
    return toolExecution.localResponse;
  }

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
    const currentProvider = ["openai", "anthropic", "google", "ollama"].includes(session?.lastProvider)
      ? session.lastProvider
      : null;

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
    return "Live AI providers are temporarily unavailable, so I’m using local fallback mode. I kept the workspace context intact, and you can retry without starting over.";
  }

  return "Live AI providers are not connected yet, so Xeivora is running in local fallback mode. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or an Ollama connection to enable full live responses.";
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

  if (provider === "ollama") {
    await streamOllama({
      messages,
      model: getProviderModel(provider, route),
      systemPrompt,
      onDelta
    });
    return "ollama";
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
  if (errors.some((entry) => entry.classification?.type === PROVIDER_ERROR_TYPES.AUTH_ERROR)) {
    return "Live AI providers are temporarily unavailable, so I’m using local fallback mode.";
  }

  return "Live AI providers are temporarily unavailable, so I’m using local fallback mode.";
}

function getLiveProviderFallbackMessage() {
  return "Live AI providers are temporarily unavailable, so I’m using local fallback mode.";
}

function buildContinuationMessages({ messages, prompt, partialOutput, failedProviderLabel }) {
  if (!partialOutput) {
    return messages;
  }

  const safePartialOutput = partialOutput.slice(-MAX_CONTINUATION_CONTEXT_CHARS);

  return [
    ...messages,
    {
      role: "assistant",
      content: safePartialOutput
    },
    {
      role: "user",
      content: [
        "Continue the SAME answer from the exact point it stopped.",
        "Do not restart, summarize, apologize, or repeat content already shown to the user.",
        `Original task: ${prompt}`,
        `A previous provider (${failedProviderLabel}) stopped mid-response.`,
        `Already delivered partial answer:\n${safePartialOutput}`
      ].join("\n\n")
    }
  ];
}

async function saveContinuityCheckpoint({
  session,
  prompt,
  failedProvider,
  nextProvider,
  classification,
  partialOutput,
  attemptNumber
}) {
  const checkpoint = await createCheckpoint({
    sessionId: session?.id || null,
    label: `${getProviderLabel(failedProvider)} checkpoint`,
    workflowKey: "provider-failover",
    provider: failedProvider,
    nextProvider,
    errorType: classification.type,
    attemptNumber,
    partialOutput,
    summary: partialOutput
      ? `${getProviderLabel(failedProvider)} stopped mid-response. Xeivora saved progress and continued with ${getProviderLabel(nextProvider || "simulation")}.`
      : `${getProviderLabel(failedProvider)} became unavailable before completion. Xeivora saved the task state for ${getProviderLabel(nextProvider || "simulation")}.`
  });

  return checkpoint;
}

function shouldRetryProvider(classification, attemptNumber) {
  return classification.retryable && attemptNumber < MAX_PROVIDER_ATTEMPTS;
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

  const attemptedProviders = [];
  let partialOutput = "";
  let continuationSourceLabel = getProviderLabel(providerOrder[0] || route.resolvedProvider);

  for (const provider of providerOrder) {
    let attemptNumber = 0;

    while (attemptNumber < MAX_PROVIDER_ATTEMPTS) {
      attemptNumber += 1;
      const previousAttemptedProviders = attemptedProviders.concat(provider);
      const nextFallback = getFallbackProvider(route, previousAttemptedProviders);

      if (res) {
        emitContinuity(res, {
          currentProvider: toPublicProviderKey(provider),
          currentModel: getProviderModel(provider, route),
          fallbackProvider: nextFallback ? toPublicProviderKey(nextFallback) : null,
          fallbackModel: nextFallback ? getProviderModel(nextFallback, route) : null,
          providerChain,
          tokenRateStatus:
            attemptNumber === 1
              ? attemptedProviders.length
                ? "fallback provider active"
                : "live provider active"
              : "retrying current provider",
          checkpointSaved: Boolean(partialOutput),
          contextCompressed: Boolean(partialOutput),
          memoryPreserved: true,
          continuityActive: true,
          contextLossPercentage: 0,
          finalProviderChain: attemptedProviders.map((entry) => toPublicProviderKey(entry))
        });
      }

      try {
        const providerUsed = await runProviderStream({
          provider,
          messages: buildContinuationMessages({
            messages,
            prompt,
            partialOutput,
            failedProviderLabel: continuationSourceLabel
          }),
          route,
          systemPrompt,
          onDelta: async (delta) => {
            partialOutput += delta;
            await onDelta(delta);
          }
        });
        markProviderHealthy(providerUsed);
        attemptedProviders.push(providerUsed);

        return {
          providerUsed,
          attemptedProviders,
          providerChain,
          errors
        };
      } catch (error) {
        const classification = classifyProviderError({
          error,
          provider
        });
        markProviderUnavailable(provider, classification);
        errors.push({
          provider,
          classification
        });

        const sameProviderRetry = shouldRetryProvider(classification, attemptNumber);
        const nextProvider = sameProviderRetry ? provider : nextFallback;
        continuationSourceLabel = getProviderLabel(provider);

        if (nextProvider && session?.id) {
          let checkpoint = null;

          try {
            checkpoint = await saveContinuityCheckpoint({
              session,
              prompt,
              failedProvider: provider,
              nextProvider,
              classification,
              partialOutput,
              attemptNumber
            });
          } catch {
            // Continuity metadata should never block runtime failover.
          }

          try {
            await createProviderEvent({
              type: sameProviderRetry ? "retry" : "fallback",
              sessionId: session.id,
              fromProvider: provider,
              toProvider: nextProvider,
              reason: classification.type,
              checkpointId: checkpoint?.id || null
            });
          } catch {
            // Ignore event logging issues and keep the response moving.
          }

          if (res) {
            emitContinuity(res, {
              currentProvider: toPublicProviderKey(sameProviderRetry ? provider : nextProvider),
              currentModel: getProviderModel(sameProviderRetry ? provider : nextProvider, route),
              fallbackProvider: sameProviderRetry && nextFallback ? toPublicProviderKey(nextFallback) : nextFallback ? toPublicProviderKey(getFallbackProvider(route, attemptedProviders.concat(nextProvider)) || null) : null,
              fallbackModel:
                sameProviderRetry && nextFallback
                  ? getProviderModel(nextFallback, route)
                  : nextFallback
                    ? getProviderModel(getFallbackProvider(route, attemptedProviders.concat(nextProvider)) || null, route)
                    : null,
              providerChain,
              tokenRateStatus: sameProviderRetry ? "checkpoint saved • retrying" : "checkpoint saved • switching provider",
              checkpointSaved: true,
              contextCompressed: true,
              memoryPreserved: true,
              continuityActive: true,
              contextLossPercentage: 0,
              finalProviderChain: attemptedProviders.map((entry) => toPublicProviderKey(entry))
            });
          }
        }

        if (!sameProviderRetry) {
          attemptedProviders.push(provider);
          break;
        }
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
  const promptAnalysis = routeIntent(prompt);
  const route = resolveRoute(modelKey, prompt, promptAnalysis);
  const rememberedMemory = await rememberFromUserMessage({
    sessionId: session?.id,
    prompt
  });
  const memorySnapshot = await getLightweightMemorySnapshot({
    sessionId: session?.id
  });
  const attachedFiles = session?.id ? await listFiles({ sessionId: session.id, limit: 20 }) : [];
  const toolExecution = await executeTools({
    prompt,
    sessionId: session?.id || null,
    projectId: session?.projectId || null,
    files: attachedFiles
  });
  const systemPrompt = buildSystemPrompt({
    memorySnapshot,
    promptAnalysis,
    workspaceContext: toolExecution.promptAugmentation
  });
  const utilityResponse = await getUtilityLocalResponse({
    prompt,
    route,
    promptAnalysis,
    memorySnapshot,
    rememberedMemory,
    toolExecution,
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
    toolExecution,
    configuredProviderAvailable,
    liveProviderAvailable,
    attachedFiles,
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
    ollama: isOllamaConfigured(),
    activeProvider: toPublicProviderKey(activeProvider),
    activeModel: activeProvider === "simulation" ? null : getProviderModel(activeProvider, route),
    fallbackProvider: fallbackProvider ? toPublicProviderKey(fallbackProvider) : null,
    simulationMode: !hasAnyLiveProvider(route.providerStatus),
    continuity: promptAnalysis.workflowNeeded ? "active" : "inactive"
  };
}

function getProviderStatusReport({ modelKey = "orbit-auto", prompt = "hello" } = {}) {
  const route = resolveRoute(modelKey, prompt);
  const providerOrder = getProviderOrder(route);
  const activeProvider = providerOrder[0] || "simulation";

  function buildProviderEntry(provider) {
    const available = isProviderAvailable(provider, route.providerStatus);

    return {
      available,
      healthy: available ? isProviderHealthy(provider) : false,
      model: available ? getProviderModel(provider, route) : null,
      lastError: providerHealthState[provider]?.lastError || null,
      lastErrorType: providerHealthState[provider]?.lastErrorType || null
    };
  }

  return {
    openai: buildProviderEntry("openai"),
    anthropic: buildProviderEntry("anthropic"),
    gemini: buildProviderEntry("google"),
    ollama: buildProviderEntry("ollama"),
    activeProvider: toPublicProviderKey(activeProvider),
    fallbackChain: providerOrder.slice(1).map((provider) => toPublicProviderKey(provider)),
    simulationMode: !hasAnyLiveProvider(route.providerStatus)
  };
}

async function runProviderDiagnostic(providerKey, prompt = "Reply with provider name only.") {
  const normalizedProvider = providerKey === "gemini" ? "google" : providerKey;
  const modelKey =
    normalizedProvider === "openai"
      ? "gpt-4o"
      : normalizedProvider === "anthropic"
        ? "claude"
        : normalizedProvider === "google"
          ? "gemini"
          : "orbit-auto";
  const route = resolveRoute(modelKey, prompt);

  if (!isProviderAvailable(normalizedProvider, route.providerStatus)) {
    const error = new Error(`${getProviderLabel(normalizedProvider)} is not configured.`);
    error.statusCode = 400;
    if (!isProviderConfigured(normalizedProvider, route.providerStatus)) {
      throw error;
    }
  }

  const text = await collectProviderResponse({
    provider: normalizedProvider,
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
    provider: toPublicProviderKey(normalizedProvider),
    label: getProviderLabel(normalizedProvider),
    model: getProviderModel(normalizedProvider, route),
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
      attemptedProviders: [],
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
      attemptedProviders: [],
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
      text: getLiveProviderFallbackMessage(),
      provider: "simulation",
      attemptedProviders: providerResult?.attemptedProviders || [],
      routeLabel,
      route: runtime.route,
      promptAnalysis: runtime.promptAnalysis,
      simulationMode: true
    };
  }

  return {
    text,
    provider: providerResult.providerUsed,
    attemptedProviders: providerResult.attemptedProviders,
    resolvedModel: getProviderModel(providerResult.providerUsed, runtime.route),
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
    showContinuityPanel: runtime.liveProviderAvailable && !runtime.utilityResponse,
    fallbackProvider: (() => {
      const fallbackProvider = getFallbackProvider(
        runtime.route,
        initialProvider === "simulation" || initialProvider === "workspace" ? [] : [initialProvider]
      );
      return fallbackProvider ? toPublicProviderKey(fallbackProvider) : null;
    })(),
    simulationMode: !runtime.liveProviderAvailable
  });

  if (runtime.promptAnalysis.workflowNeeded && runtime.liveProviderAvailable && !runtime.utilityResponse) {
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
    providerUsed = "simulation";
    if (!assistantContent.trim()) {
      await streamPlainText(getLiveProviderFallbackMessage(), onDelta, 24);
    } else {
      await streamPlainText(
        "\n\nXeivora kept the partial answer above and saved continuity so you can continue without losing context.",
        onDelta,
        24
      );
    }
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
  getProviderStatusReport,
  getProviderStatus,
  listSessions,
  runProviderDiagnostic,
  streamChatCompletion,
  writeSseEvent
};
