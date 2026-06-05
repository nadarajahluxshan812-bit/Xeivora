const { buildFileAnalysisPrompt } = require("./analysis-prompt-builder");
const { generateImages } = require("./image-generation");
const { parseImageIntent } = require("./image-intent");
const { logToolExecution } = require("./workspace-store");
const { createPreviewVersion } = require("./preview-store");

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
  const imageIntent = parseImageIntent(prompt);

  if (files.length && /\b(file|files|document|documents|pdf|spreadsheet|sheet|csv|image|screenshot|upload)\b/.test(lower)) {
    tools.push("file_analysis");
  }

  if (files.some((file) => file.kind === "image") && /\b(image|screenshot|photo|picture|chart|diagram|extract text|ocr|what's in this)\b/.test(lower)) {
    tools.push("image_analysis");
  }

  if (imageIntent.isImageRequest || /\b(create|generate|make|design)\b.*\b(image|picture|photo|poster|illustration|logo|graphic|art|artwork)\b/.test(lower)) {
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

function inferPreviewRoute(prompt = "") {
  const lower = normalizePrompt(prompt).toLowerCase();

  if (/\b(login|sign in|signup|sign up|auth|authentication|password|reset password)\b/.test(lower)) {
    return "/login";
  }
  if (/\b(dashboard|project overview|project registry)\b/.test(lower)) {
    return "/dashboard";
  }
  if (/\b(sidebar|chat ui|composer|message|conversation)\b/.test(lower)) {
    return "/chat";
  }
  if (/\b(memory|project brain|context memory)\b/.test(lower)) {
    return "/memory";
  }
  if (/\b(pricing|billing|checkout|stripe|subscription)\b/.test(lower)) {
    return "/pricing";
  }
  if (/\b(integrations|github|google drive|gmail|slack|linear|jira|figma|notion)\b/.test(lower)) {
    return "/integrations";
  }
  if (/\b(simulate|simulation)\b/.test(lower)) {
    return "/simulate";
  }
  return "/";
}

function inferPreviewTitle(prompt = "", routePath = "/") {
  const lower = normalizePrompt(prompt).toLowerCase();

  if (/\bfixed?\b.*\bauth(entication)?\b|\bauth(entication)?\b.*\bbug\b/.test(lower)) {
    return "Fixed Authentication Bug";
  }
  if (/\blogin\b|\bsign in\b/.test(lower) && /\b(create|build|add|design|update)\b/.test(lower)) {
    return "Created Login Page";
  }
  if (/\bdashboard\b/.test(lower) && /\b(create|build|add|update)\b/.test(lower)) {
    return "Added Dashboard";
  }
  if (/\bsidebar\b/.test(lower)) {
    return /\bfix|repair|resolve\b/.test(lower) ? "Fixed Sidebar Layout" : "Updated Sidebar";
  }
  if (routePath === "/pricing") {
    return "Updated Billing Experience";
  }
  if (routePath === "/memory") {
    return "Expanded Project Brain";
  }
  if (/\bbug\b|\bfix\b|\bdebug\b/.test(lower)) {
    return "Fixed Project Bug";
  }
  return "Updated Project Preview";
}

function inferChangedFiles(routePath = "/") {
  switch (routePath) {
    case "/login":
      return ["app/login/page.tsx", "components/auth/auth-shell.tsx"];
    case "/dashboard":
      return ["app/dashboard/page.tsx", "components/projects/projects-shell.tsx"];
    case "/chat":
      return ["app/chat/page.tsx", "components/chat/chat-workspace.tsx"];
    case "/memory":
      return ["app/memory/page.tsx", "components/memory/memory-shell.tsx"];
    case "/pricing":
      return ["app/pricing/page.tsx", "components/payments/PricingStatusBanner.tsx"];
    case "/integrations":
      return ["app/integrations/page.tsx", "components/integrations/integrations-shell.tsx"];
    case "/simulate":
      return ["app/simulate/page.tsx", "components/simulate/simulate-shell.tsx"];
    default:
      return ["app/page.tsx", "components/marketing/premium-homepage.tsx"];
  }
}

async function executeTools({ prompt, sessionId = null, projectId = null, files = [], viewerId = null, viewerPlan = "Starter" }) {
  const tools = detectTools(prompt, files);
  const executions = [];
  let localResponse = null;
  let promptAugmentation = null;
  let providerPromptOverride = null;
  let skipProviderResponse = false;
  const imageIntent = parseImageIntent(prompt);

  if (imageIntent.isImageOnly) {
    skipProviderResponse = true;
  }

  if (imageIntent.isImageAndText && imageIntent.textPrompt) {
    providerPromptOverride = imageIntent.textPrompt;
  }

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
      const generationPrompt = imageIntent.imagePrompt || prompt;
      const result = await generateImages({
        prompt: generationPrompt,
        count: imageIntent.count,
        viewerId,
        viewerPlan
      });
      executions.push({
        tool,
        connected: result.connected,
        summary: result.connected
          ? `Generated ${result.images.length} image${result.images.length === 1 ? "" : "s"} with ${result.modelLabel || result.model || "OpenAI"}.`
          : result.message || "Xeivora could not generate the image right now.",
        payload: {
          images: result.images,
          provider: result.provider,
          model: result.model,
          modelLabel: result.modelLabel || result.model || "OpenAI",
          prompt: generationPrompt,
          count: result.count || imageIntent.count || 1,
          textPrompt: imageIntent.textPrompt,
          isImageOnly: imageIntent.isImageOnly,
          isImageAndText: imageIntent.isImageAndText,
          dailyLimit: result.dailyLimit,
          remaining: result.remaining,
          usedToday: result.usedToday,
          attempts: result.connected ? [] : result.attempts
        },
        logPayload: {
          imageCount: result.images.length,
          provider: result.provider,
          model: result.model,
          attempts: result.connected ? [] : result.attempts
        }
      });

      if (!result.connected) {
        localResponse ||= result.message || "Xeivora could not generate the image right now.";
        skipProviderResponse = true;
      }

      continue;
    }

    if (tool === "code_assistant") {
      const routePath = inferPreviewRoute(prompt);
      const title = inferPreviewTitle(prompt, routePath);
      const previewParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries({
            project: projectId || "",
            session: sessionId || ""
          }).filter(([, value]) => Boolean(value))
        )
      );
      const previewVersion = await createPreviewVersion({
        projectId,
        sessionId,
        title,
        summary: `Live Preview is tracking this coding checkpoint so the project remembers what changed visually and technically.`,
        routePath,
        changedFiles: inferChangedFiles(routePath)
      });

      executions.push({
        tool,
        connected: true,
        summary: `Live Preview opened. Version ${previewVersion.versionNumber} is tracking this coding checkpoint.`,
        payload: {
          previewVersion,
          previewHref: previewParams.toString() ? `/preview?${previewParams.toString()}` : "/preview",
          routePath
        },
        logPayload: {
          previewVersionId: previewVersion.id,
          versionNumber: previewVersion.versionNumber,
          routePath,
          changedFiles: previewVersion.changedFiles
        }
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
        payload: execution.logPayload || execution.payload || {}
      })
    )
  );

  return {
    tools,
    executions: executions.map(({ logPayload, ...execution }) => execution),
    localResponse,
    promptAugmentation,
    providerPromptOverride,
    skipProviderResponse
  };
}

module.exports = {
  detectTools,
  executeTools
};
