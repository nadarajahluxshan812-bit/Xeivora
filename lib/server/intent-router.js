function normalizePrompt(prompt) {
  return prompt.replace(/\s+/g, " ").trim();
}

function isConversationalPrompt(lower) {
  return (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(lower) ||
    /\b(thanks|thank you|appreciate it)\b/.test(lower) ||
    /\b(how are you|who are you|what do you do|what's my name|what is my name)\b/.test(lower) ||
    /\b(my name is|call me)\b/.test(lower)
  );
}

function isFactualPrompt(lower) {
  return (
    /\b(weather|forecast|temperature|rain|wether)\b/.test(lower) ||
    /\b(what day is it|what's today's date|what is today's date|what time is it|current time|today's date)\b/.test(lower) ||
    /^(what is|who is|when is|where is|why is|how does|explain|define)\b/.test(lower)
  );
}

function isCodingPrompt(lower) {
  return /\b(code|coding|bug|debug|typescript|javascript|react|next\.?js|api|server|database|auth|schema|refactor|test)\b/.test(lower);
}

function isOrchestrationPrompt(lower) {
  if (/^(what is|who is|explain|define)\b/.test(lower)) {
    return false;
  }

  return /\b(orchestrate|orchestration|route across models|route this|provider chain|handoff|continuity|multi-agent|multi model|agent chain)\b/.test(lower);
}

function isWorkflowPrompt(lower) {
  return (
    /\b(workflow|automation|automate|pipeline|integration|sync|connect|runbook|trigger|webhook)\b/.test(lower) ||
    /^(create|write|draft|make|outline|plan|summarize|organize)\b/.test(lower) ||
    /\b(checklist|plan|roadmap|brief|launch plan|launch checklist)\b/.test(lower)
  );
}

function classifyIntent(prompt) {
  const lower = normalizePrompt(prompt).toLowerCase();

  if (!lower) {
    return "conversational";
  }

  if (isConversationalPrompt(lower)) {
    return "conversational";
  }

  if (isFactualPrompt(lower) && !isOrchestrationPrompt(lower) && !isCodingPrompt(lower)) {
    return "factual";
  }

  if (isCodingPrompt(lower)) {
    return "coding";
  }

  if (isOrchestrationPrompt(lower)) {
    return "orchestration";
  }

  if (isWorkflowPrompt(lower)) {
    return "workflow";
  }

  return lower.endsWith("?") ? "factual" : "conversational";
}

function detectTaskComplexity(prompt, intent) {
  const lower = normalizePrompt(prompt).toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const asksForBuild = /\b(build|implement|fix|debug|design|ship|deploy|end-to-end|production|full stack|architecture)\b/.test(lower);
  const asksForMultipleOutputs = /\b(and|plus|with)\b/.test(lower) && /\b(section|step|phase|feature|workflow|integration)\b/.test(lower);

  if (intent === "conversational") {
    return "simple";
  }

  if (intent === "factual") {
    return wordCount > 18 ? "moderate" : "simple";
  }

  if (intent === "coding" || intent === "orchestration") {
    if (asksForBuild || asksForMultipleOutputs || wordCount > 20) {
      return "complex";
    }

    return wordCount > 10 ? "moderate" : "simple";
  }

  if (intent === "workflow") {
    if (asksForBuild || asksForMultipleOutputs || wordCount > 24) {
      return "complex";
    }

    return wordCount > 10 ? "moderate" : "simple";
  }

  return "simple";
}

function shouldUseWorkflowMode(intent, complexity, prompt) {
  const lower = normalizePrompt(prompt).toLowerCase();

  if (intent === "coding") {
    return complexity !== "simple" && /\b(build|implement|fix|debug|design|refactor|architecture)\b/.test(lower);
  }

  if (intent === "orchestration") {
    return /\b(orchestrate|route|handoff|continuity|provider chain|agent chain)\b/.test(lower);
  }

  if (intent === "workflow") {
    return complexity === "complex" && /\b(workflow|automation|pipeline|integration|runbook|connect|sync)\b/.test(lower);
  }

  return false;
}

function routeIntent(prompt) {
  const intent = classifyIntent(prompt);
  const complexity = detectTaskComplexity(prompt, intent);
  const workflowNeeded = shouldUseWorkflowMode(intent, complexity, prompt);

  return {
    intent,
    complexity,
    workflowNeeded,
    workflowKind: workflowNeeded && intent === "coding" ? "coding_continuity" : workflowNeeded ? "continuity" : "simple_chat",
    directResponsePreferred: !workflowNeeded
  };
}

module.exports = {
  classifyIntent,
  detectTaskComplexity,
  routeIntent
};
