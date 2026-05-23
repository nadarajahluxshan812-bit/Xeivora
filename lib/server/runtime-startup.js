const { getProviderStatus } = require("./chat-store");
const { isDatabaseConfigured } = require("./db");

const globalKey = "__xeivoraRuntimeStartupLogged";

function logProductionRuntimeStatus() {
  if (globalThis[globalKey]) {
    return;
  }

  globalThis[globalKey] = true;
  const providerStatus = getProviderStatus();
  const ollamaAvailable = Boolean(process.env.OLLAMA_ENABLED === "true" || process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);
  const simulationMode =
    !providerStatus.openai.available &&
    !providerStatus.anthropic.available &&
    !providerStatus.google.available &&
    !ollamaAvailable;

  console.log("[Xeivora] Runtime startup", {
    nodeEnv: process.env.NODE_ENV || "development",
    openai: providerStatus.openai.available,
    openaiModel: providerStatus.openai.defaultModel,
    anthropic: providerStatus.anthropic.available,
    anthropicModel: providerStatus.anthropic.defaultModel,
    gemini: providerStatus.google.available,
    geminiModel: providerStatus.google.defaultModel,
    ollama: ollamaAvailable,
    ollamaModel: ollamaAvailable ? process.env.OLLAMA_MODEL || "llama3.1:8b" : null,
    database: isDatabaseConfigured() ? "postgresql" : "local-json",
    simulationMode
  });
}

module.exports = {
  logProductionRuntimeStatus
};
