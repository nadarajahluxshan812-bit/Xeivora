type ProviderName = "anthropic";

export type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

export type WorkflowState = {
  prompt: string;
  memory?: string[];
  conversation?: AnthropicMessage[];
  files?: Array<{
    path: string;
    content: string;
    language?: string;
  }>;
  codingState?: {
    currentTask?: string;
    completedSteps?: string[];
    remainingSteps?: string[];
    openFiles?: string[];
    lastKnownError?: string;
  };
  outputFormat?: string;
  checkpoints?: Array<Record<string, unknown>>;
};

export type NormalizedProviderResponse = {
  provider: ProviderName;
  model: string;
  output: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  } | null;
  finish_reason: string | null;
  continuity_supported: boolean;
  error: {
    message: string;
    type?: string;
    status?: number;
    rate_limited?: boolean;
    token_limited?: boolean;
  } | null;
};

export type StreamMessageOptions = {
  signal?: AbortSignal;
  onDelta?: (delta: string) => void | Promise<void>;
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

function getApiKey() {
  return process.env.ANTHROPIC_API_KEY;
}

function headers() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  return {
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    "x-api-key": apiKey
  };
}

function normalizeError(error: unknown): NormalizedProviderResponse["error"] {
  if (error instanceof Error) {
    return {
      message: error.message,
      rate_limited: detectRateLimit(error),
      token_limited: detectTokenLimit(error)
    };
  }

  return {
    message: "Unknown Anthropic provider error.",
    rate_limited: false,
    token_limited: false
  };
}

function normalizeAnthropicResponse(payload: Record<string, any>, model: string): NormalizedProviderResponse {
  const output = Array.isArray(payload.content)
    ? payload.content
        .map((part) => (part?.type === "text" && typeof part.text === "string" ? part.text : ""))
        .join("")
    : "";
  const inputTokens = payload.usage?.input_tokens;
  const outputTokens = payload.usage?.output_tokens;

  return {
    provider: "anthropic",
    model: payload.model || model,
    output,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens:
        typeof inputTokens === "number" && typeof outputTokens === "number"
          ? inputTokens + outputTokens
          : undefined
    },
    finish_reason: payload.stop_reason || null,
    continuity_supported: true,
    error: null
  };
}

export async function sendMessage({
  messages,
  system,
  model = DEFAULT_MODEL,
  maxTokens = 1800,
  temperature = 0.7
}: {
  messages: AnthropicMessage[];
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<NormalizedProviderResponse> {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        max_tokens: maxTokens,
        messages,
        model,
        system,
        temperature
      })
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(body || `Anthropic request failed with status ${response.status}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return normalizeAnthropicResponse(await response.json(), model);
  } catch (error) {
    return {
      provider: "anthropic",
      model,
      output: "",
      usage: null,
      finish_reason: null,
      continuity_supported: true,
      error: normalizeError(error)
    };
  }
}

export async function streamMessage({
  messages,
  system,
  model = DEFAULT_MODEL,
  maxTokens = 1800,
  temperature = 0.7,
  signal,
  onDelta
}: {
  messages: AnthropicMessage[];
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
} & StreamMessageOptions): Promise<NormalizedProviderResponse> {
  let output = "";
  let finishReason: string | null = null;
  let usage: NormalizedProviderResponse["usage"] = null;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: headers(),
      signal,
      body: JSON.stringify({
        max_tokens: maxTokens,
        messages,
        model,
        stream: true,
        system,
        temperature
      })
    });

    if (!response.ok || !response.body) {
      const body = await response.text();
      const error = new Error(body || `Anthropic stream failed with status ${response.status}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const eventBlock of events) {
        const data = eventBlock
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");

        if (!data) {
          continue;
        }

        const payload = JSON.parse(data);

        if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
          const delta = payload.delta.text || "";
          output += delta;
          await onDelta?.(delta);
        }

        if (payload.type === "message_delta") {
          finishReason = payload.delta?.stop_reason || finishReason;
          usage = payload.usage
            ? {
                input_tokens: payload.usage.input_tokens,
                output_tokens: payload.usage.output_tokens,
                total_tokens:
                  typeof payload.usage.input_tokens === "number" &&
                  typeof payload.usage.output_tokens === "number"
                    ? payload.usage.input_tokens + payload.usage.output_tokens
                    : undefined
              }
            : usage;
        }
      }
    }

    return {
      provider: "anthropic",
      model,
      output,
      usage,
      finish_reason: finishReason,
      continuity_supported: true,
      error: null
    };
  } catch (error) {
    return {
      provider: "anthropic",
      model,
      output,
      usage,
      finish_reason: finishReason,
      continuity_supported: true,
      error: normalizeError(error)
    };
  }
}

export function detectRateLimit(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
  return status === 429 || /rate.?limit|too many requests|quota|overloaded/.test(message);
}

export function detectTokenLimit(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /token|context.?limit|max_tokens|input length|prompt is too long|context window/.test(message);
}

export function createContinuationPrompt(workflowState: WorkflowState, reason = "The previous provider could not complete the task.") {
  return [
    "Continue this Xeivora workflow without losing context.",
    "",
    `Reason for transfer: ${reason}`,
    "",
    "Preserve the same output format, coding state, assumptions, and user-facing style.",
    "Do not restart the task. Continue from the latest checkpoint.",
    "",
    "Original prompt:",
    workflowState.prompt,
    "",
    workflowState.outputFormat ? `Required output format:\n${workflowState.outputFormat}\n` : "",
    workflowState.memory?.length ? `Workflow memory:\n${workflowState.memory.map((item) => `- ${item}`).join("\n")}\n` : "",
    workflowState.codingState ? `Coding state:\n${JSON.stringify(workflowState.codingState, null, 2)}\n` : "",
    workflowState.files?.length
      ? `Relevant files:\n${workflowState.files
          .map((file) => `File: ${file.path}\n\`\`\`${file.language || ""}\n${file.content}\n\`\`\``)
          .join("\n\n")}\n`
      : "",
    workflowState.checkpoints?.length
      ? `Checkpoints:\n${JSON.stringify(workflowState.checkpoints, null, 2)}\n`
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function transferWorkflowState(workflowState: WorkflowState, failureReason: string) {
  const continuationPrompt = createContinuationPrompt(workflowState, failureReason);

  return {
    provider: "anthropic" as const,
    continuity_supported: true,
    checkpoint: {
      saved_at: new Date().toISOString(),
      memory_preserved: true,
      coding_state_preserved: Boolean(workflowState.codingState),
      files_preserved: workflowState.files?.map((file) => file.path) || [],
      context_compressed: true,
      context_loss_percentage: 0
    },
    messages: [
      {
        role: "user" as const,
        content: continuationPrompt
      }
    ],
    next_provider_hint: "gemini"
  };
}
