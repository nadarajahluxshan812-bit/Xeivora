const { getProviderStatus } = require("./chat-store");
const { isDatabaseConfigured } = require("./db");

const globalKey = "__xeivoraRuntimeStartupLogged";

function logProductionRuntimeStatus() {
  if (globalThis[globalKey]) {
    return;
  }

  globalThis[globalKey] = true;
  const providerStatus = getProviderStatus();
  const simulationMode =
    !providerStatus.openai.available && !providerStatus.anthropic.available && !providerStatus.google.available;

  console.log("[Xeivora] Runtime startup", {
    nodeEnv: process.env.NODE_ENV || "development",
    openai: providerStatus.openai.available,
    openaiModel: providerStatus.openai.defaultModel,
    anthropic: providerStatus.anthropic.available,
    anthropicModel: providerStatus.anthropic.defaultModel,
    gemini: providerStatus.google.available,
    geminiModel: providerStatus.google.defaultModel,
    database: isDatabaseConfigured() ? "postgresql" : "local-json",
    simulationMode
  });
}

module.exports = {
  logProductionRuntimeStatus
};
