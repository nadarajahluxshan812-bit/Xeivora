import { randomUUID } from "node:crypto";

import { likelyNeedsTool } from "@/lib/mcp/detector";
import { getToolDefinition, type McpToolName } from "@/lib/mcp/server";

const { executeTools: executeLegacyTools } = require("@/lib/server/tool-executor");
const { createProject, logToolExecution } = require("@/lib/server/workspace-store");
const mvpStore = require("@/lib/server/mvp-store");

type MemorySnapshot = {
  userName?: string | null;
  preferences?: Array<{ key: string; value: string; label?: string }>;
  workspaceInfo?: {
    currentFocus?: string | null;
  };
  session?: {
    lastTopic?: string | null;
  };
} | null;

type UploadedFileSummary = {
  kind?: string;
  name?: string;
};

type LegacyExecution = {
  tool: string;
  connected: boolean;
  summary: string;
  payload?: Record<string, unknown>;
};

export type McpToolExecutionStatus = "completed" | "not_connected" | "error";

export type McpToolExecution = {
  id: string;
  name: string;
  uiLabel: string;
  status: McpToolExecutionStatus;
  connected: boolean;
  source: "mcp" | "workspace";
  summary: string;
  input?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  durationMs?: number;
};

export type McpExecutionResult = {
  tools: string[];
  executions: McpToolExecution[];
  localResponse: string | null;
  promptAugmentation: string | null;
};

type ExecutionContext = {
  prompt: string;
  sessionId?: string | null;
  projectId?: string | null;
  files?: UploadedFileSummary[];
  memorySnapshot?: MemorySnapshot;
};

type PlannedToolCall = {
  name: McpToolName;
  input: Record<string, unknown>;
  localResponse?: string | null;
};

type HandlerResult = {
  connected: boolean;
  summary: string;
  payload?: Record<string, unknown>;
  localResponse?: string | null;
};

const DEFAULT_TIMEOUT_MS = 4_000;
const CURRENCY_CODES = ["USD", "EUR", "GBP", "LKR", "JPY", "AED", "AUD", "CAD", "INR", "SGD"];

function normalizePrompt(prompt = "") {
  return `${prompt}`.replace(/\s+/g, " ").trim();
}

function capitalizePhrase(value = "") {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveMemoryTitle(content = "") {
  const cleaned = content.replace(/[.?!]+$/g, "").trim();
  if (!cleaned) {
    return "Workspace memory";
  }

  const words = cleaned.split(/\s+/).slice(0, 4);
  return capitalizePhrase(words.join(" "));
}

function deriveProjectName(prompt = "") {
  const directMatch =
    prompt.match(/\bcreate (?:a )?project(?: called| named)? ["']?([^"'.?!]+)["']?/i) ||
    prompt.match(/\bnew project(?: called| named)? ["']?([^"'.?!]+)["']?/i);

  if (directMatch?.[1]) {
    return capitalizePhrase(directMatch[1].trim());
  }

  const content = prompt
    .replace(/\b(create|build|start|make)\b/gi, "")
    .replace(/\b(project|workspace)\b/gi, "")
    .replace(/[.?!]+$/g, "")
    .trim();

  if (!content) {
    return "New Project";
  }

  return capitalizePhrase(content.split(/\s+/).slice(0, 5).join(" "));
}

function extractMemoryContent(prompt = "") {
  const match =
    prompt.match(/\bremember that\s+(.+)$/i) ||
    prompt.match(/\bsave this\s+(.+)$/i) ||
    prompt.match(/\bstore this\s+(.+)$/i) ||
    prompt.match(/\bnote that\s+(.+)$/i) ||
    prompt.match(/\bkeep in mind\s+(.+)$/i);

  return match?.[1]?.replace(/[.?!]+$/g, "").trim() || null;
}

function extractCurrencies(prompt = "") {
  const found = Array.from(prompt.toUpperCase().matchAll(/\b[A-Z]{3}\b/g)).map((match) => match[0]);
  const unique = Array.from(new Set(found.filter((code) => CURRENCY_CODES.includes(code))));
  return unique.slice(0, 2);
}

function extractCountryAfterKeyword(prompt: string, keyword: string) {
  const regex = new RegExp(`\\b${keyword}\\s+(?:for|in|to)?\\s*([a-z][a-z\\s-]{1,40})`, "i");
  const match = prompt.match(regex);
  return match?.[1] ? capitalizePhrase(match[1].trim()) : null;
}

function extractFlightQuery(prompt = "") {
  const match =
    prompt.match(/\bfrom\s+([a-z][a-z\s-]{1,30})\s+to\s+([a-z][a-z\s-]{1,30})(?:\s+on\s+([a-z0-9,\s-]{3,40}))?/i) ||
    prompt.match(/\bflight(?:s)?\s+to\s+([a-z][a-z\s-]{1,30})\s+from\s+([a-z][a-z\s-]{1,30})(?:\s+on\s+([a-z0-9,\s-]{3,40}))?/i);

  if (!match) {
    return null;
  }

  return {
    from: capitalizePhrase(match[1].trim()),
    to: capitalizePhrase(match[2].trim()),
    date: match[3]?.trim() || "Flexible"
  };
}

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function mapLegacyToolName(tool: string): string {
  if (tool === "web_search") return "search_web";
  if (tool === "weather") return "get_weather";
  if (tool === "calculator") return "calculate";
  return tool;
}

function mapLegacyUiLabel(tool: string): string {
  const mapped = mapLegacyToolName(tool);
  const definition = ["search_web", "get_weather", "calculate"].includes(mapped)
    ? getToolDefinition(mapped)
    : null;

  return (
    definition?.uiLabel ||
    {
      file_analysis: "File analysis",
      image_analysis: "Image analysis",
      image_generation: "Image generation",
      document_writer: "Document writer",
      code_assistant: "Code assistant"
    }[tool] ||
    tool
  );
}

function toExecutionStatus(connected: boolean): McpToolExecutionStatus {
  return connected ? "completed" : "not_connected";
}

function mapLegacyExecution(execution: LegacyExecution): McpToolExecution {
  return {
    id: randomUUID(),
    name: mapLegacyToolName(execution.tool),
    uiLabel: mapLegacyUiLabel(execution.tool),
    status: toExecutionStatus(execution.connected),
    connected: execution.connected,
    source: "workspace",
    summary: execution.summary,
    payload: execution.payload || {}
  };
}

function buildMemorySummary(memorySnapshot: MemorySnapshot) {
  const parts: string[] = [];

  if (memorySnapshot?.userName) {
    parts.push(`Name: ${memorySnapshot.userName}`);
  }

  if (memorySnapshot?.workspaceInfo?.currentFocus) {
    parts.push(`Focus: ${memorySnapshot.workspaceInfo.currentFocus}`);
  }

  if (memorySnapshot?.session?.lastTopic) {
    parts.push(`Last topic: ${memorySnapshot.session.lastTopic}`);
  }

  return parts.length ? parts.join(" · ") : "No saved workspace memory yet.";
}

function shouldUseMemoryLookup(prompt = "") {
  return /\bwhat(?:'s| is) my name\b/i.test(prompt) || /\bwhat do you remember\b/i.test(prompt) || /\bremembered\b/i.test(prompt);
}

function planTools({ prompt, memorySnapshot, files = [] }: { prompt: string; memorySnapshot?: MemorySnapshot; files?: UploadedFileSummary[] }) {
  const normalized = normalizePrompt(prompt);
  const lower = normalized.toLowerCase();
  const plans: PlannedToolCall[] = [];

  const memoryContent = extractMemoryContent(normalized);
  if (memoryContent) {
    plans.push({
      name: "save_memory",
      input: {
        title: deriveMemoryTitle(memoryContent),
        content: memoryContent,
        category: "workspace"
      },
      localResponse: "Got it — I’ll remember that for this workspace."
    });
  }

  if (shouldUseMemoryLookup(normalized)) {
    const response =
      /\bwhat(?:'s| is) my name\b/i.test(normalized) && memorySnapshot?.userName
        ? `Your name is ${memorySnapshot.userName}.`
        : null;

    plans.push({
      name: "get_memories",
      input: {
        query: normalized
      },
      localResponse: response
    });
  }

  if (/\b(create|start|make|open)\b.*\b(project|workspace)\b/i.test(normalized)) {
    plans.push({
      name: "create_project",
      input: {
        name: deriveProjectName(normalized),
        description: normalizePrompt(normalized.replace(/\bcreate\b/i, ""))
      }
    });
  }

  if (/\bvisa\b|\bpassport\b/i.test(lower)) {
    plans.push({
      name: "get_visa_info",
      input: {
        destination: extractCountryAfterKeyword(normalized, "to") || "Destination not detected",
        passport_country: "Passport country needed"
      }
    });
  }

  if (/\besim\b|\bsim card\b|\bdata plan\b/i.test(lower)) {
    plans.push({
      name: "get_esim_plans",
      input: {
        country: extractCountryAfterKeyword(normalized, "for") || extractCountryAfterKeyword(normalized, "in") || "Destination not detected"
      }
    });
  }

  const flightQuery = extractFlightQuery(normalized);
  if (flightQuery) {
    plans.push({
      name: "search_flights",
      input: flightQuery
    });
  }

  if (/\bfuel price\b|\bpetrol\b|\bdiesel\b/i.test(lower)) {
    plans.push({
      name: "get_fuel_prices",
      input: {
        country: extractCountryAfterKeyword(normalized, "in") || "Country not detected"
      }
    });
  }

  const currencies = extractCurrencies(normalized);
  if (/\bexchange rate\b|\bcurrency\b|\bconvert\b/i.test(lower) && currencies.length >= 2) {
    plans.push({
      name: "get_exchange_rates",
      input: {
        from: currencies[0],
        to: currencies[1]
      }
    });
  }

  if (/\b(build|create|make|generate)\b.*\b(website|landing page|homepage|site)\b/i.test(lower)) {
    plans.push({
      name: "build_website",
      input: {
        description: normalized,
        pages: ["Home"]
      }
    });
  }

  if (!plans.length && files.length && /\b(compare|summarize|analyze|analyse|extract)\b/i.test(lower)) {
    // Let the legacy workspace file pipeline drive file-aware prompts.
    return [];
  }

  return plans;
}

async function executePlannedTool(plan: PlannedToolCall, context: ExecutionContext): Promise<HandlerResult> {
  switch (plan.name) {
    case "save_memory": {
      await mvpStore.create("memory", {
        type: "reusable_context",
        title: String(plan.input.title || "Workspace memory"),
        content: String(plan.input.content || ""),
        enabled: true
      });

      return {
        connected: true,
        summary: `Saved "${plan.input.title}" to workspace memory.`,
        payload: {
          category: plan.input.category
        },
        localResponse: plan.localResponse || null
      };
    }

    case "get_memories": {
      return {
        connected: true,
        summary: buildMemorySummary(context.memorySnapshot || null),
        payload: {
          userName: context.memorySnapshot?.userName || null,
          currentFocus: context.memorySnapshot?.workspaceInfo?.currentFocus || null,
          lastTopic: context.memorySnapshot?.session?.lastTopic || null
        },
        localResponse: plan.localResponse || null
      };
    }

    case "create_project": {
      const project = await createProject({
        name: String(plan.input.name || "New Project"),
        description: String(plan.input.description || ""),
        color: "#c96442",
        status: "active"
      });

      return {
        connected: true,
        summary: `Created project "${project.name}".`,
        payload: {
          projectId: project.id,
          projectName: project.name
        }
      };
    }

    case "get_visa_info":
      return {
        connected: false,
        summary: "Visa lookup is not connected yet. Xeivora can still outline what details to check."
      };

    case "get_esim_plans":
      return {
        connected: false,
        summary: "Live eSIM plan lookup is not connected yet."
      };

    case "search_flights":
      return {
        connected: false,
        summary: "Live flight search is not connected yet."
      };

    case "get_fuel_prices":
      return {
        connected: false,
        summary: "Live fuel price data is not connected yet."
      };

    case "get_exchange_rates":
      return {
        connected: false,
        summary: "Live exchange rates are not connected yet."
      };

    case "build_website":
      return {
        connected: true,
        summary: "Website builder orchestration prepared.",
        payload: {
          pages: plan.input.pages || ["Home"],
          style: plan.input.style || null
        }
      };

    default:
      return {
        connected: false,
        summary: "This MCP tool is not connected yet."
      };
  }
}

async function logCustomExecution(execution: McpToolExecution, context: ExecutionContext) {
  await logToolExecution({
    tool: execution.name,
    sessionId: context.sessionId || null,
    projectId: context.projectId || null,
    status: execution.connected ? "ok" : execution.status,
    summary: execution.summary,
    payload: execution.payload || {}
  });
}

export async function executeMcpTools(context: ExecutionContext): Promise<McpExecutionResult> {
  const prompt = normalizePrompt(context.prompt);
  const files = context.files || [];

  const legacyResult = await executeLegacyTools({
    prompt,
    sessionId: context.sessionId || null,
    projectId: context.projectId || null,
    files
  });

  const executions: McpToolExecution[] = (legacyResult.executions || []).map(mapLegacyExecution);
  const toolNames = new Set<string>(executions.map((execution) => execution.name));
  let localResponse = legacyResult.localResponse || null;
  const promptAugmentation = legacyResult.promptAugmentation || null;

  if (!likelyNeedsTool(prompt) && !files.length) {
    return {
      tools: Array.from(toolNames),
      executions,
      localResponse,
      promptAugmentation
    };
  }

  const plans = planTools({
    prompt,
    memorySnapshot: context.memorySnapshot,
    files
  });

  for (const plan of plans) {
    if (toolNames.has(plan.name)) {
      if (!localResponse && plan.localResponse) {
        localResponse = plan.localResponse;
      }
      continue;
    }

    const definition = getToolDefinition(plan.name);
    if (!definition) {
      continue;
    }

    const startedAt = Date.now();
    const parsed = definition.schema.safeParse(plan.input);

    if (!parsed.success) {
      const execution: McpToolExecution = {
        id: randomUUID(),
        name: plan.name,
        uiLabel: definition.uiLabel,
        status: "error",
        connected: false,
        source: "mcp",
        summary: "Invalid tool input.",
        input: plan.input,
        payload: {
          issues: parsed.error.issues.map((issue) => issue.message)
        },
        durationMs: Date.now() - startedAt
      };
      executions.push(execution);
      toolNames.add(plan.name);
      await logCustomExecution(execution, context);
      continue;
    }

    try {
      const result = await withTimeout(
        executePlannedTool({ ...plan, input: parsed.data as Record<string, unknown> }, context),
        definition.uiLabel
      );

      const execution: McpToolExecution = {
        id: randomUUID(),
        name: plan.name,
        uiLabel: definition.uiLabel,
        status: toExecutionStatus(result.connected),
        connected: result.connected,
        source: "mcp",
        summary: result.summary,
        input: parsed.data as Record<string, unknown>,
        payload: result.payload || {},
        durationMs: Date.now() - startedAt
      };

      executions.push(execution);
      toolNames.add(plan.name);
      await logCustomExecution(execution, context);

      if (!localResponse && result.localResponse) {
        localResponse = result.localResponse;
      }
    } catch (error) {
      const execution: McpToolExecution = {
        id: randomUUID(),
        name: plan.name,
        uiLabel: definition.uiLabel,
        status: "error",
        connected: false,
        source: "mcp",
        summary: error instanceof Error ? error.message : "Tool execution failed.",
        input: parsed.data as Record<string, unknown>,
        payload: {},
        durationMs: Date.now() - startedAt
      };

      executions.push(execution);
      toolNames.add(plan.name);
      await logCustomExecution(execution, context);
    }
  }

  return {
    tools: Array.from(toolNames),
    executions,
    localResponse,
    promptAugmentation
  };
}
