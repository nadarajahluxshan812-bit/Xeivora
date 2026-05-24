const { buildFileAnalysisPrompt } = require("./analysis-prompt-builder");
const { logToolExecution } = require("./workspace-store");

function normalizePrompt(prompt = "") {
  return `${prompt}`.trim();
}

function looksLikeMathPrompt(lower) {
  return /^[-+/*().\d\s]+$/.test(lower) || /\bcalculate\b|\bsolve\b|\bwhat is\b/.test(lower);
}

function tryEvaluateMath(prompt) {
  const candidate = prompt
    .replace(/\bcalculate\b/gi, "")
    .replace(/\bwhat is\b/gi, "")
    .replace(/=/g, "")
    .replace(/[?]/g, "")
    .trim();

  if (!candidate || !/^[\d\s()+\-*/%.]+$/.test(candidate)) {
    return null;
  }

  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${candidate});`)();
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

function detectTools(prompt, files = []) {
  const lower = normalizePrompt(prompt).toLowerCase();
  const tools = [];

  if (files.length && /\b(file|files|document|documents|pdf|spreadsheet|sheet|csv|image|screenshot|upload)\b/.test(lower)) {
    tools.push("file_analysis");
  }

  if (files.some((file) => file.kind === "image") && /\b(image|screenshot|photo|picture|chart|diagram|extract text|ocr|what's in this)\b/.test(lower)) {
    tools.push("image_analysis");
  }

  if (/\b(create|generate|make|design)\b.*\b(image|poster|illustration|logo|graphic)\b/.test(lower)) {
    tools.push("image_generation");
  }

  if (/\bweather\b|\bforecast\b|\btemperature\b/.test(lower)) {
    tools.push("weather");
  }

  if (/\bsearch\b|\blook up\b|\bresearch\b/.test(lower)) {
    tools.push("web_search");
  }

  if (looksLikeMathPrompt(lower)) {
    const result = tryEvaluateMath(lower);
    if (result !== null) {
      tools.push("calculator");
    }
  }

  if (/\bcode\b|\bdebug\b|\bnext\.?js\b|\breact\b|\btypescript\b|\bpython\b/.test(lower)) {
    tools.push("code_assistant");
  }

  if (/\b(write|draft|rewrite|edit|summarize|report)\b/.test(lower)) {
    tools.push("document_writer");
  }

  return Array.from(new Set(tools));
}

async function executeTools({ prompt, sessionId = null, projectId = null, files = [] }) {
  const tools = detectTools(prompt, files);
  const executions = [];
  let localResponse = null;
  let promptAugmentation = null;

  for (const tool of tools) {
    if (tool === "calculator") {
      const value = tryEvaluateMath(prompt);
      if (value !== null) {
        const summary = `Calculated result: ${value}`;
        executions.push({
          tool,
          connected: true,
          summary,
          payload: { value }
        });
        localResponse ||= summary;
      }
      continue;
    }

    if (tool === "weather") {
      executions.push({
        tool,
        connected: false,
        summary:
          "I don’t have live weather connected yet. Tell me the city and I can give general guidance, or connect a weather API."
      });
      if (!localResponse) {
        localResponse =
          "I don’t have live weather connected yet. Tell me the city and I can give general guidance, or connect a weather API.";
      }
      continue;
    }

    if (tool === "web_search") {
      executions.push({
        tool,
        connected: false,
        summary: "This tool is not connected yet."
      });
      continue;
    }

    if ((tool === "file_analysis" || tool === "image_analysis") && files.length) {
      promptAugmentation = buildFileAnalysisPrompt({ prompt, files });
      executions.push({
        tool,
        connected: true,
        summary:
          tool === "image_analysis"
            ? `Prepared ${files.length} image-aware workspace file${files.length === 1 ? "" : "s"} for visual analysis.`
            : `Prepared ${files.length} workspace file${files.length === 1 ? "" : "s"} for analysis.`
      });
      continue;
    }

    if (tool === "image_generation") {
      executions.push({
        tool,
        connected: Boolean(process.env.OPENAI_API_KEY),
        summary: process.env.OPENAI_API_KEY
          ? "Image generation is ready through OpenAI."
          : "Image generation architecture is ready, but the provider is not connected yet."
      });
      continue;
    }

    if (tool === "code_assistant") {
      executions.push({
        tool,
        connected: true,
        summary: "Code assistance mode is active."
      });
      continue;
    }

    if (tool === "document_writer") {
      executions.push({
        tool,
        connected: true,
        summary: "Document writing mode is active."
      });
    }
  }

  await Promise.all(
    executions.map((execution) =>
      logToolExecution({
        tool: execution.tool,
        sessionId,
        projectId,
        status: execution.connected ? "ok" : "not_connected",
        summary: execution.summary,
        payload: execution.payload || {}
      })
    )
  );

  return {
    tools,
    executions,
    localResponse,
    promptAugmentation
  };
}

module.exports = {
  detectTools,
  executeTools
};
